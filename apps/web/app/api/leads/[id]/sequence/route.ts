import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer } from '@realty-engine/core';

const Schema = z.object({ paused: z.boolean() });

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { paused } = Schema.parse(await request.json());
    const supabase = getSupabaseServer();
    await supabase.from('leads').update({ sequence_paused: paused }).eq('id', params.id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}
