import { getSupabaseServer, logEvent, complete } from '@realty-engine/core';

const AISENSY_API_URL = 'https://backend.aisensy.com/campaign/t1/api/v2';

export interface SendTemplateParams {
  phone: string;
  templateName: string;
  params: string[];
  mediaUrl?: string;
  leadId?: string;
}

export interface SendFreeFormParams {
  phone: string;
  body: string;
  mediaUrl?: string;
  leadId?: string;
}

type Intent = 'interested' | 'objection' | 'out_of_market' | 'asking_question' | 'spam';

async function isWithin24hrWindow(leadId: string): Promise<boolean> {
  const supabase = getSupabaseServer();
  const { data } = await supabase.from('leads').select('whatsapp_window_open_until').eq('id', leadId).single();
  if (!data?.whatsapp_window_open_until) return false;
  return new Date(data.whatsapp_window_open_until) > new Date();
}

async function isDailyRateLimitOk(leadId: string): Promise<boolean> {
  const supabase = getSupabaseServer();
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const { count } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('lead_id', leadId)
    .eq('channel', 'whatsapp')
    .eq('direction', 'out')
    .gte('created_at', since.toISOString());
  return (count ?? 0) < 1;
}

function isQuietHoursIST(): boolean {
  const now = new Date();
  const istHour = (now.getUTCHours() * 60 + now.getUTCMinutes() + 330) / 60 % 24;
  return istHour >= 21 || istHour < 9;
}

async function recordMessage(params: {
  leadId?: string;
  channel: 'whatsapp';
  direction: 'out' | 'in';
  templateName?: string;
  body: string;
  providerMessageId?: string;
  status: string;
}) {
  if (!params.leadId) return;
  const supabase = getSupabaseServer();
  await supabase.from('messages').insert([{
    lead_id: params.leadId,
    channel: params.channel,
    direction: params.direction,
    template_name: params.templateName ?? null,
    body: params.body,
    status: params.status,
    provider_message_id: params.providerMessageId ?? null,
    sent_at: params.direction === 'out' ? new Date().toISOString() : null,
    replied_at: params.direction === 'in' ? new Date().toISOString() : null,
  }]);
}

export async function sendTemplate(params: SendTemplateParams): Promise<{ messageId: string }> {
  if (process.env.MESSAGING_ENABLED === 'false') throw new Error('Messaging disabled');
  if (isQuietHoursIST()) throw new Error('Quiet hours');
  if (params.leadId && !(await isDailyRateLimitOk(params.leadId))) throw new Error('Daily rate limit reached');

  const body = {
    apiKey: process.env.AISENSY_API_KEY,
    campaignName: params.templateName,
    destination: params.phone,
    userName: process.env.AISENSY_SENDER_ID,
    templateParams: params.params,
    ...(params.mediaUrl ? { media: { url: params.mediaUrl, filename: 'document.pdf' } } : {}),
  };

  const res = await fetch(AISENSY_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    await logEvent('aisensy_send_failed', { error: data }, { leadId: params.leadId });
    throw new Error(`AiSensy error: ${JSON.stringify(data)}`);
  }

  const messageId = data.messageId ?? data.id ?? 'unknown';
  await recordMessage({
    leadId: params.leadId,
    channel: 'whatsapp',
    direction: 'out',
    templateName: params.templateName,
    body: params.params.join(' | '),
    providerMessageId: messageId,
    status: 'sent',
  });
  await logEvent('whatsapp_template_sent', { templateName: params.templateName, messageId }, { leadId: params.leadId });
  return { messageId };
}

export async function sendFreeForm(params: SendFreeFormParams): Promise<{ messageId: string }> {
  if (process.env.MESSAGING_ENABLED === 'false') throw new Error('Messaging disabled');
  if (isQuietHoursIST()) throw new Error('Quiet hours');
  if (params.leadId && !(await isWithin24hrWindow(params.leadId))) throw new Error('Outside 24hr window');
  if (params.leadId && !(await isDailyRateLimitOk(params.leadId))) throw new Error('Daily rate limit reached');

  const body = {
    apiKey: process.env.AISENSY_API_KEY,
    campaignName: 'freeform',
    destination: params.phone,
    userName: process.env.AISENSY_SENDER_ID,
    templateParams: [params.body],
    ...(params.mediaUrl ? { media: { url: params.mediaUrl } } : {}),
  };

  const res = await fetch(AISENSY_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    await logEvent('aisensy_freeform_failed', { error: data }, { leadId: params.leadId });
    throw new Error(`AiSensy error: ${JSON.stringify(data)}`);
  }

  const messageId = data.messageId ?? data.id ?? 'unknown';
  await recordMessage({ leadId: params.leadId, channel: 'whatsapp', direction: 'out', body: params.body, providerMessageId: messageId, status: 'sent' });
  return { messageId };
}

async function classifyInboundIntent(message: string, projectContext: string): Promise<{ intent: Intent; autoReply?: string }> {
  const raw = await complete(
    `A real estate lead sent this WhatsApp reply: "${message}"\n\nProject context: ${projectContext}\n\nClassify the intent and optionally provide a short auto-reply (max 2 sentences, Hinglish).\n\nReturn JSON only:\n{\n  "intent": "interested" | "objection" | "out_of_market" | "asking_question" | "spam",\n  "autoReply": "optional reply or null"\n}`,
    { maxTokens: 200, temperature: 0.2 }
  );
  try {
    return JSON.parse(raw.trim());
  } catch {
    return { intent: 'interested' };
  }
}

export async function handleIncoming(payload: any): Promise<void> {
  const supabase = getSupabaseServer();
  const phone: string = payload.mobile ?? payload.phone ?? payload.from ?? '';
  const body: string = payload.message ?? payload.text ?? payload.body ?? '';

  if (!phone) return;

  const e164 = phone.startsWith('+') ? phone : `+${phone}`;
  // Include project id and client_id for downstream Slack alert
  const { data: lead } = await supabase
    .from('leads')
    .select('id, status, score, project_id, projects(id, name, faq, segment, client_id, clients(slack_webhook_url, brand_name))')
    .eq('phone_e164', e164)
    .single();

  if (!lead) {
    await logEvent('whatsapp_incoming_unknown', { phone: e164.slice(-4) });
    return;
  }

  // Open 24hr free-form window
  const windowUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await supabase.from('leads').update({ whatsapp_window_open_until: windowUntil }).eq('id', lead.id);

  await recordMessage({ leadId: lead.id, channel: 'whatsapp', direction: 'in', body, status: 'replied' });
  await logEvent('whatsapp_reply_received', { leadId: lead.id }, { leadId: lead.id });

  // Classify intent with Claude
  const project: any = lead.projects;
  const projectCtx = project ? `${project.name} (${project.segment})` : 'real estate project';

  try {
    const { intent, autoReply } = await classifyInboundIntent(body, projectCtx);

    // Auto-reply to questions using project FAQ
    if (intent === 'asking_question' && autoReply) {
      await sendFreeForm({ phone: e164, body: autoReply, leadId: lead.id });
    }

    // Update lead status based on intent
    if (intent === 'interested' && lead.status === 'contacted') {
      await supabase.from('leads').update({ status: 'qualified', score: Math.min((lead.score ?? 0) + 15, 100) }).eq('id', lead.id);
    } else if (intent === 'out_of_market') {
      await supabase.from('leads').update({ status: 'closed_lost' }).eq('id', lead.id);
    }

    // Alert via Slack if highly interested — use already-joined client data
    if (intent === 'interested' && (lead.score ?? 0) >= 70) {
      const clientData = (project as any)?.clients;
      if (clientData?.slack_webhook_url) {
        // Mask PII in Slack alert per CLAUDE.md policy
        await fetch(clientData.slack_webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🔥 Hot lead replied on WhatsApp!\nScore: ${lead.score} | Project: ${projectCtx}\nMessage: "${body.slice(0, 60).replace(/\d{4,}/g, '****')}…"`,
          }),
        }).catch(() => {});
      }
    }

    await logEvent('whatsapp_intent_classified', { leadId: lead.id, intent }, { leadId: lead.id });
  } catch (err) {
    await logEvent('whatsapp_intent_classification_failed', { error: err instanceof Error ? err.message : String(err) }, { leadId: lead.id });
  }
}
