import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer, logEvent, addLeadTrigger, rescoreLead } from '@realty-engine/core';
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

    // Store the actual visit slot (10am IST approximation of the chosen date)
    // so reminder timing is anchored to the real visit, not the booking moment.
    const visitAt = new Date(`${preferred_date}T10:00:00+05:30`).toISOString();

    // Append to notes — never clobber what the operator has written.
    const { data: existing } = await supabase.from('leads').select('notes').eq('id', params.id).single();
    const visitNote = `Site visit requested: ${preferred_date} ${preferred_time}`;
    const notes = existing?.notes ? `${existing.notes}\n${visitNote}` : visitNote;

    await supabase
      .from('leads')
      .update({
        status: 'site_visit_booked',
        next_followup_at: visitAt,
        visit_scheduled_at: visitAt,
        notes,
      })
      .eq('id', params.id);

    await addLeadTrigger({
      leadId: params.id,
      trigger: 'Booked a site visit themselves',
      evidence: `Requested ${preferred_date} ${preferred_time} via the visit form`,
      confidence: 90,
      source: 'visit_form',
    });
    await rescoreLead(params.id);

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
