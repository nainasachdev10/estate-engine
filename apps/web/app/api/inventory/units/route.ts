import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/utils/api-auth';
import { z } from 'zod';
import { getSupabaseServer, logEvent } from '@realty-engine/core';

/** List units for a project (used by the booking form's unit picker). */
export async function GET(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const projectId = request.nextUrl.searchParams.get('project_id');
  if (!projectId) return NextResponse.json({ error: 'project_id required' }, { status: 400 });

  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('project_units')
    .select('id, tower, floor, unit_number, config, saleable_sqft, status')
    .eq('project_id', projectId)
    .order('tower').order('floor');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ units: data ?? [] });
}

const UnitSchema = z.object({
  tower: z.string().min(1),
  floor: z.number().int().min(0),
  unit_number: z.string().min(1),
  config: z.string().min(1),
  saleable_sqft: z.number().int().positive(),
  is_penthouse: z.boolean().optional(),
});

const BulkSchema = z.object({
  project_id: z.string().uuid(),
  units: z.array(UnitSchema).min(1).max(1000),
});

/** Bulk upsert of the unit matrix (idempotent on project_id + unit_number). */
export async function POST(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const { project_id, units } = BulkSchema.parse(await request.json());
    const supabase = getSupabaseServer();

    const rows = units.map((u) => ({ ...u, project_id, is_penthouse: u.is_penthouse ?? false }));
    const { error } = await supabase
      .from('project_units')
      .upsert(rows, { onConflict: 'project_id,unit_number' });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logEvent('units_upserted', { projectId: project_id, count: rows.length }, { projectId: project_id });
    return NextResponse.json({ success: true, count: rows.length });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Invalid request body', details: err.errors }, { status: 400 });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

const StatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['available', 'held', 'booked', 'registered']),
});

export async function PATCH(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const { id, status } = StatusSchema.parse(await request.json());
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('project_units')
      .update({ status })
      .eq('id', id)
      .select('id, project_id')
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Unit not found' }, { status: 404 });

    await logEvent('unit_status_updated', { unitId: id, status }, { projectId: data.project_id });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
