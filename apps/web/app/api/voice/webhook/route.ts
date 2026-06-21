import { NextRequest, NextResponse } from 'next/server';
import { handleBolnaWebhook } from '@realty-engine/voice';
import { logEvent, verifyBolnaWebhook, getSupabaseServer } from '@realty-engine/core';

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  const supabase = getSupabaseServer();
  let webhookEventId: string | undefined;
  try {
    const { data: webhookEvent } = await supabase.from('webhook_events').insert([{
      provider: 'bolna',
      event_type: null,
      signature_valid: null,
      raw_body: (() => { try { return JSON.parse(rawBody); } catch { return { raw: rawBody.slice(0, 500) }; } })(),
      headers: Object.fromEntries(request.headers.entries()),
    }]).select('id').single();
    webhookEventId = webhookEvent?.id;
  } catch { /* audit logging must never break webhook processing */ }

  const sigValid = await verifyBolnaWebhook(rawBody, request.headers);
  if (!sigValid) {
    if (webhookEventId) {
      await supabase.from('webhook_events').update({ processed_at: new Date().toISOString(), signature_valid: false }).eq('id', webhookEventId);
    }
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let eventType: string | null = null;
  try {
    const payload = JSON.parse(rawBody);
    eventType = payload.status ?? null;
    // Signature already verified centrally; pass through for downstream handler.
    await handleBolnaWebhook(
      payload,
      rawBody,
      request.headers.get('x-bolna-signature') ?? request.headers.get('x-signature'),
    );
  } catch (err) {
    await logEvent('bolna_webhook_error', {
      error: err instanceof Error ? err.message : String(err),
    });
    // Always return 200 so Bolna doesn't retry
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
