import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer, normalizePhoneNumber, logEvent } from '@realty-engine/core';
import { inngest } from '@/inngest-client';

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('project_id');

  try {
    // 99acres sends either JSON or form-encoded depending on integration config
    const contentType = request.headers.get('content-type') ?? '';
    let payload: Record<string, any> = {};

    if (contentType.includes('application/json')) {
      payload = await request.json();
    } else {
      const text = await request.text();
      const params = new URLSearchParams(text);
      params.forEach((v, k) => {
        payload[k] = v;
      });
    }

    const phoneRaw =
      payload.mobile ??
      payload.phone ??
      payload.Phone ??
      payload.Mobile ??
      '';
    const fullName =
      payload.name ??
      payload.Name ??
      payload.full_name ??
      'Unknown';
    const email = payload.email ?? payload.Email ?? undefined;

    if (!phoneRaw || !projectId) {
      await logEvent('99acres_webhook_missing_data', {
        hasPhone: !!phoneRaw,
        hasProject: !!projectId,
      });
      return NextResponse.json({ received: true });
    }

    let phone_e164: string;
    try {
      phone_e164 = normalizePhoneNumber(phoneRaw);
    } catch {
      await logEvent('99acres_webhook_invalid_phone', {});
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
          source: '99acres',
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
      await logEvent('99acres_insert_failed', { error: insertErr.message });
      // Always return 200 so 99acres doesn't retry
      return NextResponse.json({ received: true });
    }

    inngest
      .send({ name: 'lead/created', data: { leadId: newLead.id } })
      .catch(() => {});
    await logEvent('99acres_lead_created', { leadId: newLead.id });
    return NextResponse.json({ success: true });
  } catch (err) {
    await logEvent('99acres_webhook_error', {
      error: err instanceof Error ? err.message : String(err),
    });
    // Always return 200 so 99acres doesn't retry
    return NextResponse.json({ received: true });
  }
}
