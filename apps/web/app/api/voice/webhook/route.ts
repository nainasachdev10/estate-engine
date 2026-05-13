import { NextRequest, NextResponse } from 'next/server';
import { handleBolnaWebhook } from '@realty-engine/voice';
import { logEvent } from '@realty-engine/core';

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-bolna-signature');

  try {
    const payload = JSON.parse(rawBody);
    await handleBolnaWebhook(payload, rawBody, signature);
  } catch (err) {
    await logEvent('bolna_webhook_error', {
      error: err instanceof Error ? err.message : String(err),
    });
    // Always return 200 so Bolna doesn't retry
  }

  return NextResponse.json({ received: true });
}
