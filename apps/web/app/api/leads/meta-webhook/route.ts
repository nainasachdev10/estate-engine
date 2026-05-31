import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabaseServer, normalizePhoneNumber, logEvent } from '@realty-engine/core';
import { inngest } from '@/inngest-client';

// GET — Meta webhook verification challenge
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge ?? '', { status: 200 });
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

function verifyMetaSignature(body: string, signature: string | null): boolean {
  if (!process.env.META_APP_SECRET) return true; // dev mode — skip verification
  if (!signature) return false;
  const expected =
    'sha256=' +
    crypto
      .createHmac('sha256', process.env.META_APP_SECRET)
      .update(body)
      .digest('hex');
  // Both buffers must be the same length for timingSafeEqual
  if (Buffer.byteLength(signature) !== Buffer.byteLength(expected)) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

function extractField(
  fieldData: Array<{ name: string; values: string[] }>,
  name: string,
): string | undefined {
  return fieldData.find(
    (f) => f.name === name || f.name === name.replace('_', ' '),
  )?.values?.[0];
}

// POST — receive Meta Lead Ads leads
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-hub-signature-256');

  if (!verifyMetaSignature(rawBody, signature)) {
    await logEvent('meta_webhook_invalid_signature', {});
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('project_id');

  try {
    const payload = JSON.parse(rawBody);
    const supabase = getSupabaseServer();

    for (const entry of payload?.entry ?? []) {
      for (const change of entry?.changes ?? []) {
        if (change.field !== 'leadgen') continue;

        const value = change.value;
        const fieldData: Array<{ name: string; values: string[] }> =
          value.field_data ?? [];

        const fullName =
          extractField(fieldData, 'full_name') ??
          extractField(fieldData, 'name') ??
          'Unknown';
        const phoneRaw =
          extractField(fieldData, 'phone_number') ??
          extractField(fieldData, 'phone');
        const email = extractField(fieldData, 'email');

        if (!phoneRaw) {
          await logEvent('meta_webhook_no_phone', { leadgenId: value.leadgen_id });
          continue;
        }

        let phone_e164: string;
        try {
          phone_e164 = normalizePhoneNumber(phoneRaw);
        } catch {
          await logEvent('meta_webhook_invalid_phone', { leadgenId: value.leadgen_id });
          continue;
        }

        if (!projectId) {
          await logEvent('meta_webhook_no_project_id', { leadgenId: value.leadgen_id });
          continue;
        }

        const { data: newLead, error: insertErr } = await supabase
          .from('leads')
          .insert([
            {
              project_id: projectId,
              full_name: fullName,
              phone_e164,
              email: email ?? null,
              source: 'meta',
              source_meta: {
                leadgen_id: value.leadgen_id,
                form_id: value.form_id,
                ad_id: value.ad_id,
                campaign_id: value.campaign_id,
                page_id: value.page_id,
              },
              status: 'new',
              score: 0,
              language_pref: 'hinglish',
              location_country: 'India',
            },
          ])
          .select('id')
          .single();

        if (insertErr) {
          const isDuplicate = insertErr.code === '23505';
          await logEvent('meta_webhook_insert_failed', {
            error: isDuplicate ? 'duplicate' : insertErr.message,
          });
          continue;
        }

        inngest
          .send({ name: 'lead/created', data: { leadId: newLead.id } })
          .catch(() => {});
        await logEvent('meta_lead_created', {
          leadId: newLead.id,
          projectId,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    await logEvent('meta_webhook_error', {
      error: err instanceof Error ? err.message : String(err),
    });
    // Always return 200 so Meta doesn't retry
    return NextResponse.json({ received: true });
  }
}
