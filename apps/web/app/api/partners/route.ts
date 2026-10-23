import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/utils/api-auth';
import { z } from 'zod';
import { getSupabaseServer, normalizePhoneNumber, logEvent, makeSlug } from '@realty-engine/core';

const CreateSchema = z.object({
  client_id: z.string().uuid(),
  name: z.string().min(1),
  firm_name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
});

/** Register a channel partner; cp_code is generated once and never changes. */
export async function POST(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const body = CreateSchema.parse(await request.json());
    const supabase = getSupabaseServer();

    let phone_e164: string | null = null;
    if (body.phone) {
      try { phone_e164 = normalizePhoneNumber(body.phone); }
      catch { return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 }); }
    }

    // CP code: short, human-shareable, unique (e.g. "rahul-shah-4821").
    const cp_code = `${makeSlug(body.name, 24)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const { data, error } = await supabase
      .from('channel_partners')
      .insert([{
        client_id: body.client_id,
        name: body.name,
        firm_name: body.firm_name ?? null,
        phone_e164,
        email: body.email ?? null,
        cp_code,
      }])
      .select('id, cp_code')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logEvent('channel_partner_created', { cpId: data.id, cpCode: data.cp_code });
    return NextResponse.json({ success: true, id: data.id, cp_code: data.cp_code });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Invalid request body', details: err.errors }, { status: 400 });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

const PatchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['active', 'inactive']),
});

export async function PATCH(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const { id, status } = PatchSchema.parse(await request.json());
    const supabase = getSupabaseServer();
    const { error } = await supabase.from('channel_partners').update({ status }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
