import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer, logEvent } from '@realty-engine/core';

const Schema = z
  .object({
    contact_email: z.string().email().nullable().optional(),
    portal_allowed_emails: z.array(z.string().email()).optional(),
  })
  .refine((d) => d.contact_email !== undefined || d.portal_allowed_emails !== undefined, {
    message: 'Provide at least one field to update',
  });

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = Schema.parse(await request.json());
    const supabase = getSupabaseServer();

    const update: Record<string, unknown> = {};
    if (body.contact_email !== undefined) update.contact_email = body.contact_email;
    if (body.portal_allowed_emails !== undefined) {
      update.portal_allowed_emails = body.portal_allowed_emails;
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
