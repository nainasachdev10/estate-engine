import { NextRequest, NextResponse } from 'next/server';
import { handleEmailWebhook } from '@realty-engine/messaging';
import { logEvent, verifyBrevoWebhook, getSupabaseServer } from '@realty-engine/core';

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  const supabase = getSupabaseServer();
  let webhookEventId: string | undefined;
  try {
    const { data: webhookEvent } = await supabase.from('webhook_events').insert([{
      provider: 'brevo',
      event_type: null,
      signature_valid: null,
      raw_body: (() => { try { return JSON.parse(rawBody); } catch { return { raw: rawBody.slice(0, 500) }; } })(),
      headers: Object.fromEntries(request.headers.entries()),
    }]).select('id').single();
    webhookEventId = webhookEvent?.id;
  } catch { /* audit logging must never break webhook processing */ }

  const sigValid = await verifyBrevoWebhook(rawBody, request.headers);
  if (!sigValid) {
    if (webhookEventId) {
      await supabase.from('webhook_events').update({ processed_at: new Date().toISOString(), signature_valid: false }).eq('id', webhookEventId);
    }
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let eventType: string | null = null;
  try {
    const payload = JSON.parse(rawBody);
    eventType = payload.event ?? null;
    await handleEmailWebhook(payload);
  } catch (err) {
    await logEvent('email_webhook_error', {
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
