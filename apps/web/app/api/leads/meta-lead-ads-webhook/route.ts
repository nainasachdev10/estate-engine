import { NextRequest, NextResponse } from 'next/server';
import {
  getSupabaseServer,
  normalizePhoneNumber,
  logEvent,
  verifyMetaWebhook,
} from '@realty-engine/core';
import { inngest } from '@/inngest-client';

// ---- Types ----------------------------------------------------------------

interface LeadGenValue {
  leadgen_id: string;
  page_id?: string;
  form_id?: string;
  adgroup_id?: string;
  ad_id?: string;
  campaign_id?: string;
  created_time?: number;
}

interface LeadGenChange {
  field: string;
  value: LeadGenValue;
}

interface LeadGenEntry {
  id?: string;
  time?: number;
  changes?: LeadGenChange[];
}

interface LeadGenPayload {
  object?: string;
  entry?: LeadGenEntry[];
}

interface GraphLeadFieldData {
  name: string;
  values: string[];
}

interface GraphLeadResponse {
  id?: string;
  created_time?: string;
  field_data?: GraphLeadFieldData[];
  error?: { message?: string };
}

// ---- GET: Meta verification handshake ------------------------------------

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge ?? '', {
      status: 200,
      headers: { 'content-type': 'text/plain' },
    });
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// ---- Helpers --------------------------------------------------------------

function extractField(
  fieldData: GraphLeadFieldData[],
  ...names: string[]
): string | undefined {
  for (const n of names) {
    const match = fieldData.find(
      (f) => f.name === n || f.name === n.replace(/_/g, ' '),
    );
    if (match?.values?.[0]) return match.values[0];
  }
  return undefined;
}

async function fetchFullLead(leadgenId: string): Promise<GraphLeadResponse | null> {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  if (!token) {
    await logEvent('meta_leadads_no_page_token', { leadgenId });
    return null;
  }
  const url = `https://graph.facebook.com/v21.0/${encodeURIComponent(
    leadgenId,
  )}?access_token=${encodeURIComponent(token)}`;
  try {
    const res = await fetch(url, { method: 'GET' });
    const json = (await res.json()) as GraphLeadResponse;
    if (!res.ok || json.error) {
      await logEvent('meta_leadads_graph_fetch_failed', {
        leadgenId,
        status: res.status,
        message: json.error?.message ?? 'unknown',
      });
      return null;
    }
    return json;
  } catch (err) {
    await logEvent('meta_leadads_graph_fetch_error', {
      leadgenId,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

async function resolveProjectId(
  supabase: ReturnType<typeof getSupabaseServer>,
  metaCampaignId: string | undefined,
  formId: string | undefined,
): Promise<string | null> {
  // campaigns.external_campaign_id stores the Meta CAMPAIGN id (createMetaCampaign's
  // campaign.id), which matches the leadgen webhook's value.campaign_id — NOT value.ad_id.
  if (metaCampaignId) {
    const { data } = await supabase
      .from('campaigns')
      .select('project_id')
      .eq('external_campaign_id', metaCampaignId)
      .maybeSingle();
    if (data?.project_id) return data.project_id;
  }
  if (formId) {
    const { data } = await supabase
      .from('campaigns')
      .select('project_id')
      .eq('lead_form_id', formId)
      .maybeSingle();
    if (data?.project_id) return data.project_id;
  }
  return null;
}

async function isDuplicateRecent(
  supabase: ReturnType<typeof getSupabaseServer>,
  projectId: string,
  phoneE164: string,
): Promise<boolean> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('leads')
    .select('id')
    .eq('project_id', projectId)
    .eq('phone_e164', phoneE164)
    .gte('created_at', thirtyDaysAgo)
    .limit(1)
    .maybeSingle();
  return Boolean(data?.id);
}

// ---- POST: lead intake ---------------------------------------------------

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  if (!(await verifyMetaWebhook(rawBody, request.headers))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  try {
    const payload = JSON.parse(rawBody) as LeadGenPayload;
    const supabase = getSupabaseServer();

    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== 'leadgen') continue;

        const value = change.value;
        const leadgenId = value.leadgen_id;
        if (!leadgenId) continue;

        const full = await fetchFullLead(leadgenId);
        if (!full?.field_data?.length) continue;

        const fullName =
          extractField(full.field_data, 'full_name', 'name') ?? 'Unknown';
        const phoneRaw = extractField(
          full.field_data,
          'phone_number',
          'phone',
        );
        const email = extractField(full.field_data, 'email');

        if (!phoneRaw) {
          await logEvent('meta_leadads_no_phone', { leadgenId });
          continue;
        }

        let phoneE164: string;
        try {
          phoneE164 = normalizePhoneNumber(phoneRaw);
        } catch {
          await logEvent('meta_leadads_invalid_phone', { leadgenId });
          continue;
        }

        const projectId = await resolveProjectId(supabase, value.campaign_id, value.form_id);
        if (!projectId) {
          await logEvent('meta_leadads_unmapped_ad', {
            leadgenId,
            campaignId: value.campaign_id ?? null,
            adId: value.ad_id ?? null,
            formId: value.form_id ?? null,
          });
          continue;
        }

        if (await isDuplicateRecent(supabase, projectId, phoneE164)) {
          await logEvent('meta_leadads_duplicate_skipped', { leadgenId, projectId });
          continue;
        }

        const { data: newLead, error: insertErr } = await supabase
          .from('leads')
          .insert([
            {
              project_id: projectId,
              full_name: fullName,
              phone_e164: phoneE164,
              email: email ?? null,
              source: 'meta_leadads',
              source_meta: {
                leadgen_id: leadgenId,
                page_id: value.page_id ?? null,
                form_id: value.form_id ?? null,
                ad_id: value.ad_id ?? null,
                adgroup_id: value.adgroup_id ?? null,
                campaign_id: value.campaign_id ?? null,
                created_time: value.created_time ?? null,
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
          await logEvent('meta_leadads_insert_failed', {
            leadgenId,
            error: insertErr.message,
          });
          continue;
        }

        inngest
          .send({ name: 'lead/created', data: { leadId: newLead.id } })
          .catch(() => {});
        await logEvent(
          'meta_leadads_created',
          { leadId: newLead.id, leadgenId },
          { leadId: newLead.id, projectId },
        );
      }
    }
  } catch (err) {
    await logEvent('meta_leadads_webhook_error', {
      error: err instanceof Error ? err.message : String(err),
    });
    // Fall through — Meta must always see 200 OK.
  }

  return NextResponse.json({ received: true });
}
