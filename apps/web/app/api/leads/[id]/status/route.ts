import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer, logEvent } from '@realty-engine/core';
import { inngest } from '@/inngest-client';

const Schema = z.object({
  status: z.enum(['new', 'contacted', 'qualified', 'site_visit_booked', 'visited', 'negotiating', 'closed_won', 'closed_lost', 'unresponsive']),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { status } = Schema.parse(await request.json());
    const supabase = getSupabaseServer();

    await supabase.from('leads').update({ status }).eq('id', params.id);
    await logEvent('lead_status_updated', { leadId: params.id, status }, { leadId: params.id });

    // Fire Inngest events for key status transitions
    if (status === 'qualified') {
      inngest.send({ name: 'lead/qualified', data: { leadId: params.id } }).catch(() => {});
    } else if (status === 'site_visit_booked') {
      inngest.send({ name: 'lead/site_visit_booked', data: { leadId: params.id } }).catch(() => {});
    } else if (status === 'closed_lost' || status === 'unresponsive') {
      // Pause any running sequences
      await supabase.from('leads').update({ sequence_paused: true }).eq('id', params.id);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
