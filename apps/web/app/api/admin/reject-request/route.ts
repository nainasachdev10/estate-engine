import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer } from '@realty-engine/core';

const Schema = z.object({ eventId: z.string().uuid() });

export async function POST(request: NextRequest) {
  try {
    const { eventId } = Schema.parse(await request.json());
    const db = getSupabaseServer();

    const { data: event } = await db.from('events').select('payload').eq('id', eventId).single();
    await db.from('events').update({
      payload: { ...(event?.payload ?? {}), status: 'rejected', rejectedAt: new Date().toISOString() },
    }).eq('id', eventId);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to reject' }, { status: 500 });
  }
}
