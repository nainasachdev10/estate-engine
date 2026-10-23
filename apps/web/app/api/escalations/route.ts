import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/utils/api-auth';
import { z } from 'zod';
import { getSupabaseServer, logEvent } from '@realty-engine/core';

const Schema = z.object({ id: z.string().uuid() });

/** Mark a human-handover escalation as handled. */
export async function PATCH(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const { id } = Schema.parse(await request.json());
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('escalations')
      .update({ status: 'handled', handled_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, lead_id, kind')
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Escalation not found' }, { status: 404 });

    await logEvent('escalation_handled', { escalationId: id, kind: data.kind }, { leadId: data.lead_id });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
