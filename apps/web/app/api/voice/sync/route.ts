import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/utils/api-auth';
import { z } from 'zod';
import { getSupabaseServer, logEvent } from '@realty-engine/core';
import { syncCallFromBolna } from '@realty-engine/voice';
import { sendInstantFollowupEmail } from '@/utils/instant-followup-email';

const SyncSchema = z.object({
  leadId: z.string().uuid().optional(),
  bolnaCallId: z.string().min(1).optional(),
}).refine((v) => v.leadId || v.bolnaCallId, {
  message: 'leadId or bolnaCallId is required',
});

export async function POST(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const body = await request.json();
    const { leadId, bolnaCallId } = SyncSchema.parse(body);

    // Resolve the Bolna call id: explicit, or the lead's most recent call.
    let callId = bolnaCallId ?? null;
    if (!callId && leadId) {
      const supabase = getSupabaseServer();
      const { data } = await supabase
        .from('call_logs')
        .select('bolna_call_id')
        .eq('lead_id', leadId)
        .not('bolna_call_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      callId = data?.bolna_call_id ?? null;
    }

    if (!callId) {
      return NextResponse.json(
        { error: 'No Bolna call found for this lead yet.' },
        { status: 404 }
      );
    }

    const result = await syncCallFromBolna(callId);

    await logEvent('voice_sync_api', { leadId, callId, result: result.status }, { leadId });

    // Demo: fire the personalised follow-up email instantly once the call is
    // processed (bypasses the delayed Inngest drip). Best-effort — never let an
    // email failure fail the sync.
    let emailSent = false;
    if (result.status === 'processed' && leadId && process.env.DEMO_INSTANT_EMAIL === 'true') {
      try {
        await sendInstantFollowupEmail(leadId);
        emailSent = true;
      } catch (emailErr) {
        console.error('Instant follow-up email failed:', emailErr);
      }
    }

    if (result.status === 'not_found') {
      return NextResponse.json({ error: 'Call not found in Bolna.' }, { status: 404 });
    }
    if (result.status === 'pending') {
      return NextResponse.json(
        { success: false, pending: true, message: 'Call is still in progress — try again shortly.' },
        { status: 202 }
      );
    }

    return NextResponse.json({ success: true, ...result, emailSent });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: err.errors }, { status: 400 });
    }
    console.error('Voice sync error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
