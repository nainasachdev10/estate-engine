import { NextRequest, NextResponse } from 'next/server';
import { handleIncoming } from '@realty-engine/messaging';
import { logEvent, verifyAiSensyWebhook, getSupabaseServer, redactSensitiveHeaders } from '@realty-engine/core';
import { inngest } from '@/inngest-client';
import { isRateLimited } from '@/utils/api-auth';

export async function POST(request: NextRequest) {
  // Unauthenticated endpoint that writes an audit row per request — rate-limit
  // and cap stored body size so it can't be used to bloat the database.
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  if (await isRateLimited(`webhook:aisensy:${ip}`, 120)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const rawBody = await request.text();

  const supabase = getSupabaseServer();
  let webhookEventId: string | undefined;
  try {
    const { data: webhookEvent } = await supabase.from('webhook_events').insert([{
      provider: 'aisensy',
      event_type: null,
      signature_valid: null,
      raw_body: (() => {
        if (rawBody.length > 8192) return { raw_truncated: rawBody.slice(0, 2000) };
        try { return JSON.parse(rawBody); } catch { return { raw: rawBody.slice(0, 500) }; }
      })(),
      headers: redactSensitiveHeaders(request.headers),
    }]).select('id').single();
    webhookEventId = webhookEvent?.id;
  } catch { /* audit logging must never break webhook processing */ }

  const sigValid = await verifyAiSensyWebhook(rawBody, request.headers);
  if (!sigValid) {
    if (webhookEventId) {
      await supabase.from('webhook_events').update({ processed_at: new Date().toISOString(), signature_valid: false }).eq('id', webhookEventId);
    }
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let eventType: string | null = null;
  try {
    const payload = JSON.parse(rawBody);
    eventType = payload.type ?? payload.entry?.[0]?.changes?.[0]?.value?.statuses?.[0]?.status ?? null;
    const result = await handleIncoming(payload);
    if (result?.newStatus === 'qualified' && result.leadId) {
      inngest
        .send({ name: 'lead/qualified', data: { leadId: result.leadId } })
        .catch(() => {});
    }
  } catch (err) {
    await logEvent('whatsapp_webhook_error', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  if (webhookEventId) {
    await supabase.from('webhook_events').update({
      processed_at: new Date().toISOString(),
      event_type: eventType,
      signature_valid: true,
    }).eq('id', webhookEventId);
  }

  return NextResponse.json({ received: true });
}
