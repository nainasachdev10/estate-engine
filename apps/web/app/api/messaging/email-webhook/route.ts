import { NextRequest, NextResponse } from 'next/server';
import { handleEmailWebhook } from '@realty-engine/messaging';
import { logEvent } from '@realty-engine/core';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    await handleEmailWebhook(payload);
  } catch (err) {
    await logEvent('email_webhook_error', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
  return NextResponse.json({ received: true });
}
