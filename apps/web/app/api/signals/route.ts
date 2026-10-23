import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isRateLimited } from '@/utils/api-auth';
import { z } from 'zod';
import { getSupabaseServer, logEvent } from '@realty-engine/core';

const CreateSchema = z.object({
  client_id: z.string().uuid().optional(),
  project_id: z.string().uuid().optional(),
  source: z.enum(['forum', 'youtube', 'community', 'gift_city', 'manual', 'other']),
  quote: z.string().min(1).max(2000),
  url: z.string().url().optional(),
  segment: z.string().optional(),
  score: z.number().int().min(0).max(100).default(0),
  why: z.string().optional(),
  suggested_approach: z.string().optional(),
});

/**
 * Buyer-signal intake (LeadHunter review pool). Signals land here for HUMAN
 * review — nothing in this pool is ever auto-contacted; consent-based outreach
 * only after an operator converts a signal to a lead deliberately.
 *
 * Auth: admin session, OR ?token=LEAD_WEBHOOK_TOKEN for a future prospector
 * worker feeding this pool from outside.
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  if (await isRateLimited(`signals:${ip}`, 60)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const token = request.nextUrl.searchParams.get('token');
  const tokenOk = Boolean(process.env.LEAD_WEBHOOK_TOKEN) && token === process.env.LEAD_WEBHOOK_TOKEN;
  if (!tokenOk) {
    const authError = await requireAdmin();
    if (authError) return authError;
  }

  try {
    const body = CreateSchema.parse(await request.json());
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('buyer_signals')
      .insert([body])
      .select('id')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logEvent('buyer_signal_received', { signalId: data.id, source: body.source, score: body.score });
    return NextResponse.json({ success: true, id: data.id });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Invalid request body', details: err.errors }, { status: 400 });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

const PatchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['reviewed', 'converted', 'dismissed']),
  converted_lead_id: z.string().uuid().optional(),
});

export async function PATCH(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const { id, status, converted_lead_id } = PatchSchema.parse(await request.json());
    const supabase = getSupabaseServer();
    const { error } = await supabase
      .from('buyer_signals')
      .update({ status, converted_lead_id: converted_lead_id ?? null })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logEvent('buyer_signal_reviewed', { signalId: id, status });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
