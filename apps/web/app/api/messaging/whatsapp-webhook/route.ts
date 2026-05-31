import { NextRequest, NextResponse } from 'next/server';
import { handleIncoming } from '@realty-engine/messaging';
import { logEvent } from '@realty-engine/core';
import { inngest } from '@/inngest-client';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const result = await handleIncoming(payload);
    if (result?.newStatus === 'qualified' && result.leadId) {
      inngest.send({ name: 'lead/qualified', data: { leadId: result.leadId } }).catch(() => {});
    }
  } catch (err) {
    await logEvent('whatsapp_webhook_error', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
  return NextResponse.json({ received: true });
}
