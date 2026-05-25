import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer } from '@realty-engine/core';

const Schema = z.object({ eventId: z.string().uuid() });

export async function POST(request: NextRequest) {
  try {
    const { eventId } = Schema.parse(await request.json());
    const db = getSupabaseServer();

    // Fetch existing payload so we can merge rather than overwrite
    const { data: event, error: fetchErr } = await db
      .from('events')
      .select('payload')
      .eq('id', eventId)
      .single();

    if (fetchErr || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const { error: updateErr } = await db
      .from('events')
      .update({
        payload: {
          ...(event.payload ?? {}),
          status: 'rejected',
          rejectedAt: new Date().toISOString(),
        },
      })
      .eq('id', eventId)
      .select('id')
      .single();

    if (updateErr) {
      return NextResponse.json({ error: 'Failed to update event', detail: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to reject' }, { status: 500 });
  }
}
