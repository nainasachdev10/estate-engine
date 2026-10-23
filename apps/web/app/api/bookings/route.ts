import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/utils/api-auth';
import { z } from 'zod';
import { getSupabaseServer, logEvent } from '@realty-engine/core';

const CreateSchema = z.object({
  project_id: z.string().uuid(),
  unit_id: z.string().uuid(),
  lead_id: z.string().uuid().optional(),
  buyer_name: z.string().min(1),
  agreement_value_rupees: z.number().int().positive(),
  booking_date: z.string().optional(), // YYYY-MM-DD
});

/**
 * Create a booking — the acquisition outcome. Blocks the unit and inherits CP
 * attribution from the lead (the ledger — locked at intake, flows through
 * unchanged). Post-sale accounting lives in the developer's own systems.
 */
export async function POST(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const body = CreateSchema.parse(await request.json());
    const supabase = getSupabaseServer();

    const { data: unit } = await supabase
      .from('project_units')
      .select('id, status, project_id, unit_number')
      .eq('id', body.unit_id)
      .maybeSingle();
    if (!unit || unit.project_id !== body.project_id) {
      return NextResponse.json({ error: 'Unit not found in this project' }, { status: 404 });
    }
    if (unit.status === 'booked' || unit.status === 'registered') {
      return NextResponse.json({ error: `Unit ${unit.unit_number} is already ${unit.status}` }, { status: 409 });
    }

    // Attribution flows from the lead's locked CP — never entered by hand here.
    let channel_partner_id: string | null = null;
    if (body.lead_id) {
      const { data: lead } = await supabase
        .from('leads').select('channel_partner_id').eq('id', body.lead_id).maybeSingle();
      channel_partner_id = lead?.channel_partner_id ?? null;
    }

    const { data: booking, error } = await supabase
      .from('bookings')
      .insert([{
        project_id: body.project_id,
        unit_id: body.unit_id,
        lead_id: body.lead_id ?? null,
        channel_partner_id,
        buyer_name: body.buyer_name,
        agreement_value_rupees: body.agreement_value_rupees,
        booking_date: body.booking_date ?? new Date().toISOString().slice(0, 10),
      }])
      .select('id')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await supabase.from('project_units').update({ status: 'booked' }).eq('id', body.unit_id);

    await logEvent('booking_created', {
      bookingId: booking.id,
      unitNumber: unit.unit_number,
      value: body.agreement_value_rupees,
      viaCp: Boolean(channel_partner_id),
    }, { projectId: body.project_id, leadId: body.lead_id });

    return NextResponse.json({ success: true, id: booking.id });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Invalid request body', details: err.errors }, { status: 400 });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

const PatchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['active', 'cancelled']),
});

/** Cancel (or reinstate) a booking; the unit's availability follows. */
export async function PATCH(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const { id, status } = PatchSchema.parse(await request.json());
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', id)
      .select('id, unit_id, project_id')
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

    await supabase.from('project_units')
      .update({ status: status === 'cancelled' ? 'available' : 'booked' })
      .eq('id', data.unit_id);

    await logEvent('booking_updated', { bookingId: id, status }, { projectId: data.project_id });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
