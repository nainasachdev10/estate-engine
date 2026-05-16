import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer, logEvent } from '@realty-engine/core';

const Schema = z.object({ note: z.string().min(1).max(1000) });

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { note } = Schema.parse(await request.json());
    const supabase = getSupabaseServer();

    const { data: lead, error } = await supabase
      .from('leads')
      .update({ notes: note })
      .eq('id', params.id)
      .select('id')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logEvent('lead_note_added', { leadId: params.id }, { leadId: params.id });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
