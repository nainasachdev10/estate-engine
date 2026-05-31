import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer, logEvent } from '@realty-engine/core';
import { inngest } from '@/inngest-client';

const Schema = z.object({
  preferred_date: z.string().min(1),
  preferred_time: z.string().min(1),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { preferred_date, preferred_time } = Schema.parse(body);
    const supabase = getSupabaseServer();

    // Set next_followup_at to preferred date at 10am IST (approximate UTC)
    const followupAt = new Date(`${preferred_date}T10:00:00+05:30`).toISOString();

    await supabase
      .from('leads')
      .update({
        status: 'site_visit_booked',
        next_followup_at: followupAt,
        notes: `Site visit requested: ${preferred_date} ${preferred_time}`,
      })
      .eq('id', params.id);

    await logEvent(
      'site_visit_booked',
      { leadId: params.id, preferred_date, preferred_time },
      { leadId: params.id },
    );

    // Fire Inngest — start site visit reminder sequence (non-blocking)
    inngest
      .send({ name: 'lead/site_visit_booked', data: { leadId: params.id } })
      .catch(() => {});

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
