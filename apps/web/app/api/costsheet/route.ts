import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/utils/api-auth';
import { getSupabaseServer, computeCostSheet, renderCostSheetText, logEvent } from '@realty-engine/core';

/**
 * The Sales Desk's signature skill: exact cost sheet for any unit, on demand.
 * Deterministic math from project_units × rate_cards — zero LLM involvement.
 * GET /api/costsheet?unit_id=…  (admin session)
 */
export async function GET(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const unitId = request.nextUrl.searchParams.get('unit_id');
  if (!unitId) return NextResponse.json({ error: 'unit_id required' }, { status: 400 });

  const supabase = getSupabaseServer();
  const { data: unit, error } = await supabase
    .from('project_units')
    .select('id, project_id, tower, floor, unit_number, config, saleable_sqft, is_penthouse, status')
    .eq('id', unitId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!unit) return NextResponse.json({ error: 'Unit not found' }, { status: 404 });

  const { data: rate } = await supabase
    .from('rate_cards')
    .select('*')
    .eq('project_id', unit.project_id)
    .maybeSingle();
  if (!rate) {
    return NextResponse.json({ error: 'No rate card configured for this project yet' }, { status: 409 });
  }

  const sheet = computeCostSheet(unit, rate);

  // Audit trail: every cost sheet produced is logged and reviewable.
  await logEvent('cost_sheet_generated', {
    unitId: unit.id,
    unitNumber: unit.unit_number,
    total: sheet.total_consideration_rupees,
    demoRate: sheet.demo_rate,
  }, { projectId: unit.project_id });

  return NextResponse.json({ sheet, text: renderCostSheetText(sheet), is_penthouse: unit.is_penthouse });
}
