import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer, logEvent } from '@realty-engine/core';

const Schema = z.object({
  contact_email: z.string().email().nullable().optional(),
  portal_allowed_emails: z.array(z.string().email()).optional(),
  bolna_agent_id: z.string().nullable().optional(),
  bolna_from_number: z.string().nullable().optional(),
  aisensy_api_key: z.string().nullable().optional(),
  aisensy_sender_id: z.string().nullable().optional(),
  brevo_sender_email: z.string().email().nullable().optional(),
  brevo_sender_name: z.string().nullable().optional(),
});

const UPDATABLE = [
  'contact_email', 'portal_allowed_emails',
  'bolna_agent_id', 'bolna_from_number',
  'aisensy_api_key', 'aisensy_sender_id',
  'brevo_sender_email', 'brevo_sender_name',
] as const;

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = Schema.parse(await request.json());
    const supabase = getSupabaseServer();

    const update: Record<string, unknown> = {};
    for (const key of UPDATABLE) {
      if (body[key] !== undefined) update[key] = body[key];
    }
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Provide at least one field to update' }, { status: 400 });
    }

    const { error } = await supabase.from('clients').update(update).eq('id', params.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logEvent('client_updated', { clientId: params.id, fields: Object.keys(update) });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
