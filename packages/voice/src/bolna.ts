import { getSupabaseServer } from '@realty-engine/core';
import { logEvent } from '@realty-engine/core';

const BOLNA_API_URL = 'https://api.bolna.dev';

function paiseToPriceRange(minPaise: number | null, maxPaise: number | null): string {
  const format = (paise: number) => {
    const cr = paise / 10_000_000;
    const lac = paise / 100_000;
    if (cr >= 1) return `₹${cr.toFixed(1)} Cr`;
    return `₹${lac.toFixed(0)} Lac`;
  };

  if (minPaise && maxPaise) return `${format(minPaise)} to ${format(maxPaise)}`;
  if (minPaise) return `starting ${format(minPaise)}`;
  if (maxPaise) return `up to ${format(maxPaise)}`;
  return 'price on request';
}

export async function triggerCall(leadId: string): Promise<{ bolnaCallId: string }> {
  const supabase = getSupabaseServer();

  const { data: lead, error: leadErr } = await supabase
    .from('leads')
    .select('*, projects(*, clients(*))')
    .eq('id', leadId)
    .single();

  if (leadErr || !lead) {
    throw new Error(`Lead not found: ${leadId}`);
  }

  const project = lead.projects;
  const client = project?.clients;

  const amenities: string[] = project?.key_amenities
    ? Object.values(project.key_amenities).flat().slice(0, 5) as string[]
    : [];

  const variables = {
    lead_name: lead.full_name,
    project_name: project?.name ?? 'our project',
    project_location: project?.location ?? 'Mumbai',
    unit_type: project?.unit_type ?? 'units',
    price_range: paiseToPriceRange(project?.price_min_paise, project?.price_max_paise),
    key_amenities: amenities.join(', ') || 'premium amenities',
    client_brand: client?.brand_name ?? client?.name ?? 'our company',
  };

  const payload = {
    agent_id: process.env.BOLNA_AGENT_ID,
    recipient_phone_number: lead.phone_e164,
    user_data: variables,
  };

  const res = await fetch(`${BOLNA_API_URL}/call`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.BOLNA_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    await logEvent('bolna_call_trigger_failed', { leadId, error: errText }, { leadId, projectId: project?.id });
    throw new Error(`Bolna API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const bolnaCallId: string = data.call_id ?? data.id ?? data.callId;

  await supabase.from('call_logs').insert([{
    lead_id: leadId,
    bolna_call_id: bolnaCallId,
    started_at: new Date().toISOString(),
    outcome: null,
  }]);

  await logEvent('bolna_call_triggered', { leadId, bolnaCallId }, { leadId, projectId: project?.id });

  return { bolnaCallId };
}

export async function getCallStatus(bolnaCallId: string): Promise<any> {
  const res = await fetch(`${BOLNA_API_URL}/call/${bolnaCallId}`, {
    headers: {
      Authorization: `Bearer ${process.env.BOLNA_API_KEY}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Bolna API error ${res.status}`);
  }

  return res.json();
}
