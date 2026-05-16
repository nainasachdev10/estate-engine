import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer, logEvent } from '@realty-engine/core';

const Schema = z.object({
  status: z.enum(['new', 'contacted', 'qualified', 'site_visit_booked', 'visited', 'negotiating', 'closed_won', 'closed_lost', 'unresponsive']),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { status } = Schema.parse(await request.json());
    const supabase = getSupabaseServer();

    await supabase.from('leads').update({ status }).eq('id', params.id);
    await logEvent('lead_status_updated', { leadId: params.id, status }, { leadId: params.id });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
