import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer, normalizePhoneNumber, logEvent, addLeadTrigger, rescoreLead } from '@realty-engine/core';
import { inngest } from '@/inngest-client';
import { isRateLimited } from '@/utils/api-auth';

const IntakeSchema = z.object({
  full_name: z.string().min(1),
  phone: z.string().min(10),
  email: z.string().email().optional(),
  project_id: z.string().uuid(),
  source: z.enum(['meta', 'google', '99acres', 'organic', 'walkin', 'manual', 'referral', 'channel_partner']),
  source_meta: z.record(z.any()).optional(),
  // Channel-partner attribution: pass the CP's share code and the lead is
  // stamped to that partner at creation, permanently (the attribution ledger).
  cp_code: z.string().max(64).optional(),
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

    const { data: existing } = await supabase
      .from('leads')
      .select('id, status')
      .eq('phone_e164', phone_e164)
      .eq('project_id', validated.project_id)
      .not('status', 'in', '("closed_lost","unresponsive")')
      .maybeSingle();

    // Resolve CP attribution BEFORE the duplicate check so a duplicate can log
    // the disputed claim — but the original attribution is never overwritten:
    // first touch wins, timestamped, permanently.
    let channelPartnerId: string | null = null;
    if (validated.cp_code) {
      const { data: cp } = await supabase
        .from('channel_partners')
        .select('id, status')
        .eq('cp_code', validated.cp_code)
        .maybeSingle();
      if (cp?.status === 'active') channelPartnerId = cp.id;
    }

    if (existing) {
      if (channelPartnerId) {
        // Later CP claim on an existing lead = the exact dispute the ledger
        // exists to settle. Log it; do NOT reassign.
        await logEvent('cp_attribution_conflict', {
          cpCode: validated.cp_code, keptOriginal: true,
        }, { leadId: existing.id });
      }
      // A repeat inquiry is a strong intent signal — record it and re-rank.
      await addLeadTrigger({
        leadId: existing.id,
        trigger: 'Re-inquired via lead form',
        evidence: `Submitted the ${validated.source} form again`,
        confidence: 60,
        source: 'lead_form',
      });
      await rescoreLead(existing.id);
      await logEvent('lead_intake_duplicate', { projectId: validated.project_id }, { leadId: existing.id });
      return NextResponse.json({ success: true, leadId: existing.id, duplicate: true });
    }

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
        channel_partner_id: channelPartnerId,
        cp_locked_at: channelPartnerId ? new Date().toISOString() : null,
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
