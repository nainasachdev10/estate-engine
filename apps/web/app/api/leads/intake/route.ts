import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer, normalizePhoneNumber, logEvent } from '@realty-engine/core';
import { inngest } from '@/inngest-client';
import { isRateLimited } from '@/utils/api-auth';

const IntakeSchema = z.object({
  full_name: z.string().min(1),
  phone: z.string().min(10),
  email: z.string().email().optional(),
  project_id: z.string().uuid(),
  source: z.enum(['meta', 'google', '99acres', 'organic', 'walkin', 'manual']),
  source_meta: z.record(z.any()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limit: max 10 lead submissions per minute per IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
    if (await isRateLimited(`intake:${ip}`, 10)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();
    const validated = IntakeSchema.parse(body);

    let phone_e164: string;
    try {
      phone_e164 = normalizePhoneNumber(validated.phone);
    } catch (err) {
      await logEvent('lead_intake_invalid_phone', {
        error: err instanceof Error ? err.message : 'Invalid phone',
      });
      return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    const { data: newLead, error } = await supabase
      .from('leads')
      .insert([{
        project_id: validated.project_id,
        full_name: validated.full_name,
        phone_e164,
        email: validated.email ?? null,
        source: validated.source,
        source_meta: validated.source_meta ?? null,
        status: 'new',
        score: 0,
        language_pref: 'hinglish',
        location_country: 'India',
      }])
      .select()
      .single();

    if (error) {
      await logEvent('lead_intake_insert_failed', { error: error.message });
      return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 });
    }

    await logEvent('lead_intake_success', {
      leadId: newLead.id,
      projectId: validated.project_id,
      source: validated.source,
    }, { leadId: newLead.id, projectId: validated.project_id });

    // Fire Inngest event — auto-call will trigger in 90 seconds
    // Non-blocking: lead is saved even if Inngest isn't configured yet
    inngest.send({
      name: 'lead/created',
      data: { leadId: newLead.id },
    }).catch((err: Error) => {
      console.error('Inngest send failed (non-fatal):', err.message);
    });

    return NextResponse.json({ success: true, leadId: newLead.id });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body', details: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
