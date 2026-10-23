import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/utils/api-auth';
import { z } from 'zod';
import { getSupabaseServer, logEvent } from '@realty-engine/core';

// All rates are whole RUPEES per sq ft (see CLAUDE.md money-units note —
// these columns are _rupees on purpose, unlike the misnamed project _paise ones).
const Schema = z.object({
  project_id: z.string().uuid(),
  base_rate_rupees: z.number().int().positive(),
  dev_charges_rupees: z.number().int().min(0).default(0),
  floor_rise_per_floor_rupees: z.number().int().min(0).default(0),
  floor_rise_from_floor: z.number().int().min(0).default(0),
  maintenance_deposit_rupees: z.number().int().min(0).default(0),
  advance_maintenance_rupees: z.number().int().min(0).default(0),
  advance_maintenance_years: z.number().int().min(1).max(10).default(2),
  parking_slots_included: z.number().int().min(0).max(10).default(0),
  is_demo_rate: z.boolean().default(true),
});

/** Upsert the project's single rate card (unique on project_id). */
export async function POST(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const card = Schema.parse(await request.json());
    const supabase = getSupabaseServer();

    const { error } = await supabase
      .from('rate_cards')
      .upsert([card], { onConflict: 'project_id' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logEvent('rate_card_upserted', {
      projectId: card.project_id,
      baseRate: card.base_rate_rupees,
      demoRate: card.is_demo_rate,
    }, { projectId: card.project_id });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Invalid request body', details: err.errors }, { status: 400 });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
