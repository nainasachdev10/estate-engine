import crypto from 'crypto';
import { Inngest } from 'inngest';
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
  // Fail closed in production when secret is configured but missing on request
  if (!secret) {
    // If no secret configured, allow (dev mode) but warn
    if (process.env.NODE_ENV === 'production') return false;
    return true;
  }
  if (!signature) return false;

  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);

  // timingSafeEqual requires same length — return false if lengths differ
  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}

function getInngest() {
  const eventKey = process.env.INNGEST_EVENT_KEY;
  if (!eventKey) return null;
  return new Inngest({ id: 'realty-engine', eventKey });
}

async function sendInngestEvent(name: string, data: Record<string, unknown>) {
  const client = getInngest();
  if (!client) {
    console.warn(`Inngest not configured — skipping event: ${name}`);
    return;
  }
  try {
    await client.send({ name, data });
  } catch (err) {
    await logEvent('inngest_send_failed', { name, error: err instanceof Error ? err.message : String(err) });
  }
}

export async function handleBolnaWebhook(
  payload: BolnaWebhookPayload,
  rawBody: string,
  signature: string | null
): Promise<void> {
  if (!validateBolnaSignature(rawBody, signature, process.env.BOLNA_WEBHOOK_SECRET)) {
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

  await supabase.from('call_logs').update({
    ended_at: payload.ended_at ?? new Date().toISOString(),
    duration_seconds: payload.duration ?? null,
    transcript: payload.transcript ?? null,
    recording_url: payload.recording_url ?? null,
  }).eq('id', callLog.id);

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

  await supabase.from('call_logs').update({
    outcome: classification.outcome,
    summary: classification.summary,
    sentiment: classification.sentiment,
    detected_language: classification.detected_language ?? null,
  }).eq('id', callLog.id);

  const leadStatusMap: Record<string, string> = {
    qualified: 'qualified',
    not_qualified: 'closed_lost',
    callback: 'contacted',
    wrong_number: 'unresponsive',
    no_answer: 'contacted',
  };

  const leadUpdate: Record<string, any> = {
    status: leadStatusMap[classification.outcome],
    score: classification.score,
    last_contacted_at: new Date().toISOString(),
  };

  // Map next_action to next_followup_at
  const nextActionDelays: Record<string, number> = {
    send_whatsapp_brochure: 30,        // 30 minutes
    schedule_site_visit: 2 * 24 * 60,  // 2 days
    callback_in_2_days: 2 * 24 * 60,   // 2 days
    drop: 0,
  };
  const delayMinutes = nextActionDelays[classification.next_action] ?? 0;
  if (delayMinutes > 0) {
    leadUpdate.next_followup_at = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();
  }

  // Stop sequences for dead leads
  if (['not_qualified', 'wrong_number'].includes(classification.outcome)) {
    leadUpdate.sequence_paused = true;
  }

  if (classification.detected_language != null) {
    leadUpdate.language_pref = classification.detected_language;
  }

  await supabase.from('leads').update(leadUpdate).eq('id', lead.id);

  await logEvent('bolna_webhook_processed', {
    callId: payload.call_id,
    outcome: classification.outcome,
    score: classification.score,
  }, { leadId: lead.id, projectId: project?.id });

  // Always emit a generic voice/completed event so downstream orchestration
  // (WhatsApp brochure send, ops alerting, analytics) can react uniformly.
  await sendInngestEvent('voice/completed', {
    leadId: lead.id,
    outcome: classification.outcome,
    score: classification.score,
  });

  // Outcome-specific events drive existing per-outcome workflows.
  if (classification.outcome === 'qualified') {
    await sendInngestEvent('lead/qualified', { leadId: lead.id });
  } else if (classification.outcome === 'no_answer') {
    // Retry calls first (retryNoAnswerLead handles attempt 0,1,2)
    await sendInngestEvent('lead/no-answer', { leadId: lead.id, attempt: 0 });
  } else if (classification.outcome === 'callback') {
    await sendInngestEvent('lead/callback-requested', { leadId: lead.id });
  }
}
