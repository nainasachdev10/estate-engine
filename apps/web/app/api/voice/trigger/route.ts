import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/utils/api-auth';
import { z } from 'zod';
import { logEvent } from '@realty-engine/core';
import { triggerCall } from '@realty-engine/voice';

const TriggerSchema = z.object({
  leadId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const body = await request.json();
    const { leadId } = TriggerSchema.parse(body);

    const { bolnaCallId } = await triggerCall(leadId);

    await logEvent('voice_trigger_api', { leadId, bolnaCallId }, { leadId });

    return NextResponse.json({ success: true, bolnaCallId });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: err.errors }, { status: 400 });
    }

    console.error('Voice trigger error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
