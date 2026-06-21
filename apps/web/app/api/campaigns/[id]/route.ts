import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer, logEvent } from '@realty-engine/core';

const PatchSchema = z.object({
  status: z.enum(['draft', 'active', 'paused', 'ended']).optional(),
  external_campaign_id: z.string().nullable().optional(),
  lead_form_id: z.string().nullable().optional(),
  budget_paise_daily: z.number().int().nonnegative().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const json = await request.json();
    const patch = PatchSchema.parse(json);

    const supabase = getSupabaseServer();
    const updates: Record<string, unknown> = { ...patch };

    if (patch.status === 'active') {
      updates.started_at = new Date().toISOString();
    }
    if (patch.status === 'ended') {
      updates.ended_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('campaigns')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logEvent('campaign_updated', { id: params.id, patch });
    return NextResponse.json({ campaign: data });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid body', details: err.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
