import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer, normalizePhoneNumber, logEvent } from '@realty-engine/core';
import { inngest } from '@/inngest-client';

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('project_id');

  try {
    const payload = await request.json();

    // Google Lead Form webhook payload shape:
    // { user_column_data: [{ column_name: "Phone Number", string_value: "..." }, ...] }
    const columns: Array<{ column_name: string; string_value?: string }> =
      payload.user_column_data ?? [];

    function getCol(name: string): string | undefined {
      return columns.find((c) =>
        c.column_name?.toLowerCase().includes(name.toLowerCase()),
      )?.string_value;
    }

    const phoneRaw = getCol('phone') ?? getCol('mobile');
    const fullName = getCol('name') ?? getCol('full name') ?? 'Unknown';
    const email = getCol('email');

    if (!phoneRaw || !projectId) {
      await logEvent('google_webhook_missing_data', {
        hasPhone: !!phoneRaw,
        hasProject: !!projectId,
      });
      // Always return 200 so Google doesn't retry
      return NextResponse.json({ received: true });
    }

    let phone_e164: string;
    try {
      phone_e164 = normalizePhoneNumber(phoneRaw);
    } catch {
      await logEvent('google_webhook_invalid_phone', {});
      return NextResponse.json({ received: true });
    }

    const supabase = getSupabaseServer();
    const { data: newLead, error: insertErr } = await supabase
      .from('leads')
      .insert([
        {
          project_id: projectId,
          full_name: fullName,
          phone_e164,
          email: email ?? null,
          source: 'google',
          source_meta: payload,
          status: 'new',
          score: 0,
          language_pref: 'hinglish',
          location_country: 'India',
        },
      ])
      .select('id')
      .single();

    if (insertErr) {
      await logEvent('google_insert_failed', { error: insertErr.message });
      // Always return 200 so Google doesn't retry
      return NextResponse.json({ received: true });
    }

    inngest
      .send({ name: 'lead/created', data: { leadId: newLead.id } })
      .catch(() => {});
    await logEvent('google_lead_created', { leadId: newLead.id });
    return NextResponse.json({ success: true });
  } catch (err) {
    await logEvent('google_webhook_error', {
      error: err instanceof Error ? err.message : String(err),
    });
    // Always return 200 so Google doesn't retry
    return NextResponse.json({ received: true });
  }
}
