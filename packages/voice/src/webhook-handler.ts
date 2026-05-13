import crypto from 'crypto';
import { getSupabaseServer, logEvent, classifyCall } from '@realty-engine/core';

export interface BolnaWebhookPayload {
  call_id: string;
  status?: string;
  duration?: number;
  transcript?: string;
  recording_url?: string;
  ended_at?: string;
  [key: string]: any;
}

export function validateBolnaSignature(
  body: string,
  signature: string | null,
  secret: string | undefined
): boolean {
  if (!secret || !signature) return true;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

export async function handleBolnaWebhook(
  payload: BolnaWebhookPayload,
  rawBody: string,
  signature: string | null
): Promise<void> {
  const webhookSecret = process.env.BOLNA_WEBHOOK_SECRET;

  if (!validateBolnaSignature(rawBody, signature, webhookSecret)) {
    await logEvent('bolna_webhook_invalid_signature', { callId: payload.call_id });
    throw new Error('Invalid Bolna webhook signature');
  }

  const supabase = getSupabaseServer();

  const { data: callLog, error } = await supabase
    .from('call_logs')
    .select('*, leads(*, projects(*, clients(*)))')
    .eq('bolna_call_id', payload.call_id)
    .single();

  if (error || !callLog) {
    await logEvent('bolna_webhook_call_not_found', { callId: payload.call_id });
    return;
  }

  await supabase
    .from('call_logs')
    .update({
      ended_at: payload.ended_at ?? new Date().toISOString(),
      duration_seconds: payload.duration ?? null,
      transcript: payload.transcript ?? null,
      recording_url: payload.recording_url ?? null,
    })
    .eq('id', callLog.id);

  const transcript = payload.transcript ?? '';
  const lead = callLog.leads;
  const project = lead?.projects;

  let classification;
  try {
    classification = await classifyCall(transcript, {
      projectName: project?.name ?? '',
      priceRange: `${project?.price_min_paise ?? 0} to ${project?.price_max_paise ?? 0}`,
      segment: project?.segment ?? '',
    });
  } catch (err) {
    await logEvent('bolna_webhook_classification_failed', {
      callId: payload.call_id,
      error: err instanceof Error ? err.message : String(err),
    }, { leadId: lead?.id });

    classification = {
      outcome: 'no_answer' as const,
      score: 0,
      summary: 'Classification failed — manual review needed.',
      sentiment: 'neutral' as const,
      objections: [] as string[],
      next_action: 'callback_in_2_days' as const,
    };
  }

  await supabase
    .from('call_logs')
    .update({
      outcome: classification.outcome,
      summary: classification.summary,
      sentiment: classification.sentiment,
    })
    .eq('id', callLog.id);

  const leadStatusMap: Record<string, string> = {
    qualified: 'qualified',
    not_qualified: 'closed_lost',
    callback: 'contacted',
    wrong_number: 'unresponsive',
    no_answer: 'contacted',
  };

  await supabase
    .from('leads')
    .update({
      status: leadStatusMap[classification.outcome],
      score: classification.score,
      last_contacted_at: new Date().toISOString(),
    })
    .eq('id', lead.id);

  await logEvent('bolna_webhook_processed', {
    callId: payload.call_id,
    outcome: classification.outcome,
    score: classification.score,
  }, { leadId: lead.id, projectId: project?.id });

  // Fire Inngest events for next steps
  const inngestEventKey = process.env.INNGEST_EVENT_KEY;
  if (inngestEventKey) {
    if (classification.outcome === 'qualified') {
      await fetch('https://inn.gs/e', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${inngestEventKey}`,
        },
        body: JSON.stringify({
          name: 'lead/qualified',
          data: { leadId: lead.id },
        }),
      });
    } else if (classification.outcome === 'no_answer') {
      await fetch('https://inn.gs/e', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${inngestEventKey}`,
        },
        body: JSON.stringify({
          name: 'lead/no-answer',
          data: { leadId: lead.id },
        }),
      });
    }
  }
}
