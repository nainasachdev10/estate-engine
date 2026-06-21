import { getSupabaseServer } from '@realty-engine/core';
import { logEvent } from '@realty-engine/core';
import { fetchWithRetry } from '@realty-engine/core';

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
    available_units: project?.available_units ? `${project.available_units} units available` : 'limited units available',
    possession_date: project?.possession_date ? new Date(project.possession_date).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : 'soon',
    site_address: project?.site_address ?? project?.location ?? 'our site',
  };

  const appUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.APP_URL ?? 'https://estate-engine.vercel.app';
  const payload: Record<string, any> = {
    agent_id: client?.bolna_agent_id || process.env.BOLNA_AGENT_ID,
    recipient_phone_number: lead.phone_e164,
    user_data: variables,
    webhook_url: `${appUrl}/api/voice/webhook`,
  };
  const fromNumber = client?.bolna_from_number || process.env.BOLNA_FROM_NUMBER;
  if (fromNumber) payload.from_number = fromNumber;

  const res = await fetchWithRetry(`${BOLNA_API_URL}/call`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.BOLNA_API_KEY}`,
    },
    body: JSON.stringify(payload),
  }, { provider: 'bolna' });

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
  const res = await fetchWithRetry(`${BOLNA_API_URL}/call/${bolnaCallId}`, {
    headers: {
      Authorization: `Bearer ${process.env.BOLNA_API_KEY}`,
    },
  }, { provider: 'bolna' });

  if (!res.ok) {
    throw new Error(`Bolna API error ${res.status}`);
  }

  return res.json();
}

const MULTILINGUAL_AGENT_PROMPT = `You are a friendly and professional voice assistant calling on behalf of {client_brand} about the {project_name} real estate project in {project_location}.

LANGUAGE RULE — CRITICAL:
- Start the call in Hinglish (mix of Hindi and English).
- In your FIRST response, ask: "Aap kaunsi language mein baat karna chahenge — Hindi, English, Gujarati, ya koi aur?"
- ONCE the person indicates a language preference, switch COMPLETELY to that language for the entire rest of the call.
- Never mix languages after the preference is stated.
- If they say Gujarati, speak ONLY Gujarati. If English, ONLY English. If Hindi, ONLY Hindi.

YOUR GOAL:
1. Introduce yourself and the project warmly
2. Understand their requirements (budget, timeline, family size)
3. Address any objections about {project_name}
4. If interested, book a site visit

PROJECT DETAILS:
- Name: {project_name}
- Location: {project_location}
- Unit type: {unit_type}
- Price: {price_range}
- Key amenities: {key_amenities}
- Possession: {possession_date}
- Available units: {available_units}

CALL GUIDELINES:
- Keep responses SHORT (2-3 sentences max) — this is a phone call
- Be warm, helpful, never pushy
- If they ask to call back, get a specific time and agree
- If they say not interested or wrong number, politely end the call
- Never make up details not in the project info above`;

interface CreateAgentOptions {
  agentName: string;
  useSarvam?: boolean;
}

export async function createOrUpdateBolnaAgent(
  options: CreateAgentOptions
): Promise<{ agentId: string }> {
  const { agentName, useSarvam = true } = options;
  const authHeader = { Authorization: `Bearer ${process.env.BOLNA_API_KEY}` };

  // Check if agent already exists
  try {
    const listRes = await fetchWithRetry(`${BOLNA_API_URL}/agent`, { headers: authHeader }, { provider: 'bolna' });
    if (listRes.ok) {
      const agents = await listRes.json() as Array<{ agent_name: string; agent_id?: string; id?: string }>;
      const existing = agents.find((a) => a.agent_name === agentName);
      if (existing) {
        const agentId = existing.agent_id ?? existing.id ?? '';
        await logEvent('bolna_agent_already_exists', { agentName, agentId });
        return { agentId };
      }
    }
  } catch (err) {
    // Non-fatal — proceed to create
    await logEvent('bolna_agent_list_failed', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const transcriberConfig = useSarvam
    ? { provider: 'sarvam', model: 'saarika:v2', language: 'hi', stream: true }
    : { provider: 'deepgram', model: 'nova-2', language: 'hi', stream: true };

  const synthesizerConfig = useSarvam
    ? { provider: 'sarvam', model: 'bulbul:v1', stream: true, sampling_rate: 8000, voice: 'meera' }
    : { provider: 'elevenlabs', model: 'eleven_turbo_v2', stream: true, sampling_rate: 8000, voice: 'meera' };

  const agentPayload = {
    agent_name: agentName,
    agent_type: 'IVR',
    agent_config: {
      agent_welcome_message:
        'Namaste! Main {client_brand} se bol raha hun {project_name} ke baare mein. Aap kaunsi language mein baat karna chahenge — Hindi, English, Gujarati, ya koi aur language?',
      agent_prompt: MULTILINGUAL_AGENT_PROMPT,
      language: 'hi',
      interruption_threshold_duration: 100,
    },
    task_config: [
      {
        task_type: 'conversation',
        toolchain: {
          execution: 'parallel',
          pipelines: [['transcriber', 'llm', 'synthesizer']],
        },
        tools_config: {
          input: { provider: 'telephony', format: 'pcm', sampling_rate: 8000 },
          output: { provider: 'telephony', format: 'pcm', sampling_rate: 8000 },
          transcriber: transcriberConfig,
          llm_agent: {
            provider: 'anthropic',
            model: 'claude-haiku-4-5',
            family: 'claude',
            base_url: 'https://api.anthropic.com',
            max_tokens: 150,
            temperature: 0.3,
          },
          synthesizer: synthesizerConfig,
        },
      },
    ],
  };

  let createRes: Response;
  try {
    createRes = await fetchWithRetry(`${BOLNA_API_URL}/agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify(agentPayload),
    }, { provider: 'bolna' });
  } catch (err) {
    await logEvent('bolna_agent_create_request_failed', {
      agentName,
      error: err instanceof Error ? err.message : String(err),
    });
    throw new Error(`Bolna agent create network error: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!createRes.ok) {
    const errText = await createRes.text();
    await logEvent('bolna_agent_create_failed', { agentName, status: createRes.status, error: errText });
    throw new Error(`Bolna agent create error ${createRes.status}: ${errText}`);
  }

  const created = await createRes.json() as { agent_id?: string; id?: string };
  const agentId = created.agent_id ?? created.id ?? '';

  await logEvent('bolna_agent_created', { agentName, agentId });
  return { agentId };
}
