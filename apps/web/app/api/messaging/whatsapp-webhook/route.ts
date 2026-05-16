import { NextRequest, NextResponse } from 'next/server';
import { handleIncoming } from '@realty-engine/messaging';
import { logEvent } from '@realty-engine/core';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    await handleIncoming(payload);
  } catch (err) {
    await logEvent('whatsapp_webhook_error', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
  return NextResponse.json({ received: true });
}
