import { getSupabaseServer, logEvent } from '@realty-engine/core';

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

export interface SendEmailParams {
  to: string;
  subject: string;
  htmlBody: string;
  fromName?: string;
  leadId?: string;
}

async function isDailyEmailLimitOk(leadId: string): Promise<boolean> {
  const supabase = getSupabaseServer();
  const since = new Date();
  since.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('lead_id', leadId)
    .eq('channel', 'email')
    .eq('direction', 'out')
    .gte('created_at', since.toISOString());

  return (count ?? 0) < 2;
}

function isQuietHoursIST(): boolean {
  const now = new Date();
  const istHour = (now.getUTCHours() * 60 + now.getUTCMinutes() + 330) / 60 % 24;
  return istHour >= 21 || istHour < 9;
}

export async function sendEmail(params: SendEmailParams): Promise<{ messageId: string }> {
  if (process.env.MESSAGING_ENABLED === 'false') {
    throw new Error('Messaging is disabled');
  }
  if (isQuietHoursIST()) {
    throw new Error('Quiet hours — will retry at 9am IST');
  }
  if (params.leadId && !(await isDailyEmailLimitOk(params.leadId))) {
    throw new Error('Daily email rate limit reached');
  }

  const payload = {
    sender: {
      name: params.fromName ?? process.env.BREVO_SENDER_NAME ?? 'Realty Engine',
      email: process.env.BREVO_SENDER_EMAIL,
    },
    to: [{ email: params.to }],
    subject: params.subject,
    htmlContent: params.htmlBody,
  };

  const res = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': process.env.BREVO_API_KEY ?? '',
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    await logEvent('brevo_send_failed', { error: data }, { leadId: params.leadId });
    throw new Error(`Brevo error: ${JSON.stringify(data)}`);
  }

  const messageId = data.messageId ?? 'unknown';

  if (params.leadId) {
    const supabase = getSupabaseServer();
    await supabase.from('messages').insert([{
      lead_id: params.leadId,
      channel: 'email',
      direction: 'out',
      body: params.subject,
      status: 'sent',
      provider_message_id: messageId,
      sent_at: new Date().toISOString(),
    }]);
  }

  await logEvent('email_sent', { to: params.to, subject: params.subject, messageId }, { leadId: params.leadId });

  return { messageId };
}

export async function handleEmailWebhook(payload: any): Promise<void> {
  const supabase = getSupabaseServer();
  const event = payload.event;
  const messageId = payload['message-id'] ?? payload.messageId;

  if (!messageId) return;

  const statusMap: Record<string, string> = {
    delivered: 'delivered',
    opened: 'read',
    clicked: 'read',
    bounced: 'failed',
    spam: 'failed',
  };

  const status = statusMap[event];
  if (!status) return;

  await supabase
    .from('messages')
    .update({ status })
    .eq('provider_message_id', messageId);

  await logEvent('email_webhook', { event, messageId });
}
