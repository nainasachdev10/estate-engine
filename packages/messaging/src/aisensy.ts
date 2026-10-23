import { getSupabaseServer, logEvent, complete, fetchWithRetry, normalizePhoneNumber, addLeadTrigger, rescoreLead, isQuietHoursIST, detectEscalation, createEscalation, parseUnitQuery } from '@realty-engine/core';
import { buildCostSheetReply } from './costsheet-desk';

const AISENSY_API_URL = 'https://backend.aisensy.com/campaign/t1/api/v2';

export interface AisensyCreds {
  apiKey?: string;
  senderId?: string;
}

export interface SendTemplateParams {
  phone: string;
  templateName: string;
  params: string[];
  mediaUrl?: string;
  leadId?: string;
  creds?: AisensyCreds;
}

export interface SendFreeFormParams {
  phone: string;
  body: string;
  mediaUrl?: string;
  leadId?: string;
  creds?: AisensyCreds;
}

type Intent = 'interested' | 'objection' | 'out_of_market' | 'asking_question' | 'spam' | 'opt_out';

// Deterministic opt-out detection — never depend on the LLM for compliance.
// Covers English + common Hindi/Hinglish phrasings. Precision matters both
// ways: a missed opt-out is a DPDP violation, but a false positive silently
// blacklists an interested buyer ("can we STOP BY the site?"). So a bare
// "stop" only counts when it IS the message; inside a sentence it must be
// aimed at messaging/calling. Exported for smoke tests.
export function isOptOutMessage(body: string): boolean {
  const trimmed = body.trim().toLowerCase();
  if (/^(stop|unsubscribe|opt\s*out)[\s.!]*$/.test(trimmed)) return true;
  return /\b(unsubscribe|opt\s*out|remove me|stop (message|messaging|msg|msgs|texting|calling|contacting|sending)|don'?t (message|msg|call|contact)|band karo|mat (bhejo|karo|call karo)|message mat)\b/i.test(body);
}

async function checkDoNotContact(leadId: string): Promise<boolean> {
  const supabase = getSupabaseServer();
  const { data } = await supabase.from('leads').select('do_not_contact').eq('id', leadId).single();
  return Boolean(data?.do_not_contact);
}

async function isWithin24hrWindow(leadId: string): Promise<boolean> {
  const supabase = getSupabaseServer();
  const { data } = await supabase.from('leads').select('whatsapp_window_open_until').eq('id', leadId).single();
  if (!data?.whatsapp_window_open_until) return false;
  return new Date(data.whatsapp_window_open_until) > new Date();
}

async function isDailyRateLimitOk(leadId: string): Promise<boolean> {
  const supabase = getSupabaseServer();
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const { count } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('lead_id', leadId)
    .eq('channel', 'whatsapp')
    .eq('direction', 'out')
    .gte('created_at', since.toISOString());
  // Cap of 2/day — the qualified drip's designed day-one cadence is two
  // touches (brochure at +5m, visit nudge at +60m); a cap of 1 made the second
  // step permanently undeliverable.
  return (count ?? 0) < 2;
}

async function recordMessage(params: {
  leadId?: string;
  channel: 'whatsapp';
  direction: 'out' | 'in';
  templateName?: string;
  body: string;
  providerMessageId?: string;
  status: string;
}) {
  if (!params.leadId) return;
  const supabase = getSupabaseServer();
  await supabase.from('messages').insert([{
    lead_id: params.leadId,
    channel: params.channel,
    direction: params.direction,
    template_name: params.templateName ?? null,
    body: params.body,
    status: params.status,
    provider_message_id: params.providerMessageId ?? null,
    sent_at: params.direction === 'out' ? new Date().toISOString() : null,
    replied_at: params.direction === 'in' ? new Date().toISOString() : null,
  }]);
}

export async function sendTemplate(params: SendTemplateParams): Promise<{ messageId: string }> {
  if (process.env.MESSAGING_ENABLED === 'false') throw new Error('Messaging disabled');
  if (params.leadId && (await checkDoNotContact(params.leadId))) throw new Error('Lead opted out');
  if (isQuietHoursIST()) throw new Error('Quiet hours');
  if (params.leadId && !(await isDailyRateLimitOk(params.leadId))) throw new Error('Daily rate limit reached');

  const body = {
    apiKey: params.creds?.apiKey ?? process.env.AISENSY_API_KEY,
    campaignName: params.templateName,
    destination: params.phone,
    userName: params.creds?.senderId ?? process.env.AISENSY_SENDER_ID,
    templateParams: params.params,
    ...(params.mediaUrl ? { media: { url: params.mediaUrl, filename: 'document.pdf' } } : {}),
  };

  const res = await fetchWithRetry(AISENSY_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }, { provider: 'aisensy' });

  const data = await res.json();
  if (!res.ok) {
    await logEvent('aisensy_send_failed', { error: data }, { leadId: params.leadId });
    throw new Error(`AiSensy error: ${JSON.stringify(data)}`);
  }

  const messageId = data.messageId ?? data.id ?? 'unknown';
  await recordMessage({
    leadId: params.leadId,
    channel: 'whatsapp',
    direction: 'out',
    templateName: params.templateName,
    body: params.params.join(' | '),
    providerMessageId: messageId,
    status: 'sent',
  });
  await logEvent('whatsapp_template_sent', { templateName: params.templateName, messageId }, { leadId: params.leadId });
  return { messageId };
}

export async function sendFreeForm(params: SendFreeFormParams): Promise<{ messageId: string }> {
  if (process.env.MESSAGING_ENABLED === 'false') throw new Error('Messaging disabled');
  if (params.leadId && (await checkDoNotContact(params.leadId))) throw new Error('Lead opted out');
  if (isQuietHoursIST()) throw new Error('Quiet hours');
  if (params.leadId && !(await isWithin24hrWindow(params.leadId))) throw new Error('Outside 24hr window');
  if (params.leadId && !(await isDailyRateLimitOk(params.leadId))) throw new Error('Daily rate limit reached');

  const DIRECT_API_URL = 'https://backend.aisensy.com/direct-apis/t1/messages';

  const body: Record<string, any> = {
    apiKey: params.creds?.apiKey ?? process.env.AISENSY_API_KEY,
    campaignName: process.env.AISENSY_SESSION_CAMPAIGN ?? 'freeform_session',
    destination: params.phone,
    userName: params.creds?.senderId ?? process.env.AISENSY_SENDER_ID,
    source: 'direct',
    message: {
      type: 'text',
      text: { body: params.body },
    },
  };

  if (params.mediaUrl) {
    body.message = {
      type: 'image',
      image: { link: params.mediaUrl, caption: params.body },
    };
  }

  const res = await fetchWithRetry(DIRECT_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }, { provider: 'aisensy' });

  const data = await res.json();
  if (!res.ok) {
    await logEvent('aisensy_freeform_failed', { error: data }, { leadId: params.leadId });
    throw new Error(`AiSensy error: ${JSON.stringify(data)}`);
  }

  const messageId = data.messageId ?? data.id ?? 'unknown';
  await recordMessage({ leadId: params.leadId, channel: 'whatsapp', direction: 'out', body: params.body, providerMessageId: messageId, status: 'sent' });
  return { messageId };
}

async function classifyInboundIntent(message: string, projectContext: string): Promise<{
  intent: Intent;
  autoReply?: string;
  trigger?: { trigger: string | null; evidence: string | null; confidence: number } | null;
}> {
  const raw = await complete(
    `A real estate lead sent this WhatsApp reply: "${message}"\n\nProject context: ${projectContext}\n\nClassify the intent and optionally provide a short auto-reply (max 2 sentences).\nIMPORTANT — reply in the SAME language and script the lead wrote in (Gujarati script → Gujarati script, Hindi → Hindi, Hinglish → Hinglish, English → English). Warm, human tone; never robotic.\nAnswer ONLY from the project context provided — if the answer isn't in it, say a colleague will confirm shortly (never guess).\nAlso extract a buying TRIGGER if the message reveals a "why now" life/money event (relocation, marriage, rent increase, sold property, child's school, investment). Use null when none — never invent one.\n\nReturn JSON only:\n{\n  "intent": "interested" | "objection" | "out_of_market" | "asking_question" | "spam" | "opt_out",\n  "autoReply": "optional reply or null",\n  "trigger": { "trigger": "<one sentence>", "evidence": "<their words>", "confidence": <0-100> } | null\n}`,
    { maxTokens: 300, temperature: 0.2 }
  );
  try {
    const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return { intent: 'interested' };
  }
}

/** Marks a lead as opted out: hard-stops every automated send path. */
async function markOptedOut(leadId: string, viaBody: string): Promise<void> {
  const supabase = getSupabaseServer();
  await supabase.from('leads').update({
    do_not_contact: true,
    sequence_paused: true,
  }).eq('id', leadId);
  await logEvent('lead_opted_out', { leadId, snippet: viaBody.slice(0, 60) }, { leadId });
}

export async function handleIncoming(payload: any): Promise<{ leadId?: string; newStatus?: string }> {
  const supabase = getSupabaseServer();
  const phone: string = payload.mobile ?? payload.phone ?? payload.from ?? '';
  const body: string = payload.message ?? payload.text ?? payload.body ?? '';

  if (!phone) return {};

  // AiSensy sends numbers in varying shapes ("919876…", "+919876…", sometimes
  // bare 10 digits). Normalize to the stored E.164 form so the lead lookup
  // actually matches; fall back to a naive '+' prefix for non-Indian numbers.
  let e164: string;
  try {
    e164 = normalizePhoneNumber(phone);
  } catch {
    e164 = phone.startsWith('+') ? phone : `+${phone}`;
  }
  // Include project id and client_id for downstream Slack alert
  const { data: lead } = await supabase
    .from('leads')
    .select('id, status, score, full_name, project_id, projects(id, name, faq, segment, client_id, escalation_contact_name, clients(slack_webhook_url, brand_name, contact_email))')
    .eq('phone_e164', e164)
    .single();

  if (!lead) {
    // Not a lead — maybe a registered channel partner. The CP service desk:
    // a broker on a site visit messages "Block B, 18th floor, 4BHK" and gets
    // the perfect cost sheet while the client is still standing there.
    const { data: cp } = await supabase
      .from('channel_partners')
      .select('id, name, client_id, status')
      .eq('phone_e164', e164)
      .eq('status', 'active')
      .maybeSingle();

    if (cp) {
      const q = parseUnitQuery(body);
      const { data: cpProjects } = await supabase
        .from('projects').select('id').eq('client_id', cp.client_id);
      const projectIds = (cpProjects ?? []).map((p: { id: string }) => p.id);

      const reply = q
        ? await buildCostSheetReply({ projectIds, query: q, leadId: null, requesterLabel: `CP ${cp.name}` })
        : {
            handled: true,
            reply: `Hi ${cp.name}! Send me a unit like "Block E, 25th floor, 4BHK" or a unit number (E-2501) and I'll reply with the exact cost sheet in seconds.`,
          };

      if (reply.reply) {
        try {
          await sendFreeForm({ phone: e164, body: reply.reply });
        } catch (err) {
          await logEvent('cp_desk_reply_failed', { cpId: cp.id, error: err instanceof Error ? err.message : String(err) });
        }
      }
      await logEvent('cp_desk_message_handled', { cpId: cp.id, parsed: Boolean(q) });
      return {};
    }

    await logEvent('whatsapp_incoming_unknown', { phone: e164.slice(-4) });
    return {};
  }

  await recordMessage({ leadId: lead.id, channel: 'whatsapp', direction: 'in', body, status: 'replied' });
  await logEvent('whatsapp_reply_received', { leadId: lead.id }, { leadId: lead.id });

  // Opt-out is checked deterministically BEFORE anything else — an opt-out must
  // never open the 24hr window, get an auto-reply, or advance the pipeline.
  if (isOptOutMessage(body)) {
    await markOptedOut(lead.id, body);
    return { leadId: lead.id };
  }

  // Open 24hr free-form window
  const windowUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await supabase.from('leads').update({ whatsapp_window_open_until: windowUntil }).eq('id', lead.id);

  const project: any = lead.projects;
  const projectCtx = project ? `${project.name} (${project.segment})` : 'real estate project';

  // Hard-rule escalation rail — runs BEFORE the LLM, mirroring the opt-out
  // check. Discount/negotiation, complaints and penthouse enquiries are never
  // auto-replied to: the conversation is handed to a human with a brief.
  const escalationKind = detectEscalation(body);
  if (escalationKind) {
    const sayFirst: Record<string, string> = {
      discount: 'Acknowledge interest, present value before price; commercial calls are yours alone.',
      complaint: 'Call them personally within the hour. Listen first, log the issue, commit to a date.',
      penthouse: 'Senior closer only. Invite for a private walkthrough — no pricing over chat.',
    };
    // The project's named escalation person owns this handover.
    const owner = project?.escalation_contact_name
      ? ` Owner: ${project.escalation_contact_name}.`
      : '';
    await createEscalation({
      leadId: lead.id,
      kind: escalationKind,
      detail: `WhatsApp: "${body.slice(0, 120).replace(/\d{4,}/g, '****')}"`,
      brief: {
        who: `${lead.full_name} — ${lead.status}, score ${lead.score ?? 0}, ${projectCtx}`,
        what_they_want: body.slice(0, 160).replace(/\d{4,}/g, '****'),
        say_first: `${sayFirst[escalationKind] ?? 'Take over the conversation personally.'}${owner}`,
      },
    });
    const clientData = project?.clients;
    if (clientData?.slack_webhook_url) {
      await fetch(clientData.slack_webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 *Human handover needed (${escalationKind})*\nLead: ${lead.full_name} | ${projectCtx}\n"${body.slice(0, 80).replace(/\d{4,}/g, '****')}…"\nAI will not reply — take this one personally.`,
        }),
      }).catch(() => {});
    }
    await rescoreLead(lead.id);
    return { leadId: lead.id };
  }

  // Cost-sheet desk: a structured unit ask ("Block E, 25th floor, 4BHK") gets
  // the exact sheet in-chat, in seconds — deterministic math, no LLM. Runs
  // after the escalation rail so discount talk still goes to a human first.
  const unitQuery = parseUnitQuery(body);
  if (unitQuery) {
    const sheetResult = await buildCostSheetReply({
      projectIds: [lead.project_id],
      query: unitQuery,
      leadId: lead.id,
      requesterLabel: `${lead.full_name} — ${lead.status}, score ${lead.score ?? 0}`,
    });
    if (sheetResult.reply) {
      try {
        await sendFreeForm({ phone: e164, body: sheetResult.reply, leadId: lead.id });
      } catch (err) {
        await logEvent('costsheet_desk_send_failed', {
          error: err instanceof Error ? err.message : String(err),
        }, { leadId: lead.id });
      }
    }
    // Asking for an exact unit's numbers is a serious buying signal.
    await addLeadTrigger({
      leadId: lead.id,
      trigger: 'Requested an exact unit cost sheet on WhatsApp',
      evidence: body.slice(0, 120),
      confidence: 75,
      source: 'whatsapp',
    });
    await rescoreLead(lead.id);
    return { leadId: lead.id };
  }

  // A sender with an active booking is an owner, not a prospect — replies
  // should sound like it (their unit is in the context). Payment/paperwork
  // questions belong to the developer's own accounts team, not this system.
  let careCtx = '';
  try {
    const { data: booking } = await supabase
      .from('bookings')
      .select('id, project_units(unit_number)')
      .eq('lead_id', lead.id)
      .eq('status', 'active')
      .maybeSingle();
    if (booking) {
      const unit: any = Array.isArray(booking.project_units) ? booking.project_units[0] : booking.project_units;
      careCtx = `\nThis person has BOOKED unit ${unit?.unit_number ?? ''} in this project — treat them as an owner, not a prospect. For payment or paperwork questions, say the accounts team will call them personally.`;
    }
  } catch { /* care context is best-effort; classification proceeds without it */ }

  const faqCtx = project?.faq ? `\nProject FAQ: ${JSON.stringify(project.faq).slice(0, 800)}` : '';

  // Classify intent with Claude
  let newStatus: string | undefined;

  try {
    const { intent, autoReply, trigger } = await classifyInboundIntent(body, `${projectCtx}${faqCtx}${careCtx}`);

    // LLM-detected opt-out (phrasings the regex missed)
    if (intent === 'opt_out') {
      await markOptedOut(lead.id, body);
      return { leadId: lead.id };
    }

    // Persist any "why now" trigger the reply revealed
    if (trigger?.trigger) {
      await addLeadTrigger({
        leadId: lead.id,
        trigger: trigger.trigger,
        evidence: trigger.evidence,
        confidence: trigger.confidence,
        source: 'whatsapp',
      });
    }

    // Auto-reply to questions using project FAQ
    if (intent === 'asking_question' && autoReply) {
      await sendFreeForm({ phone: e164, body: autoReply, leadId: lead.id });
    }

    // Update lead status based on intent
    if (intent === 'interested' && lead.status === 'contacted') {
      await supabase.from('leads').update({ status: 'qualified' }).eq('id', lead.id);
      newStatus = 'qualified';
    } else if (intent === 'out_of_market') {
      await supabase.from('leads').update({ status: 'closed_lost' }).eq('id', lead.id);
    }

    // Recompute the blended Buying Score with this fresh engagement
    await rescoreLead(lead.id);

    // Alert via Slack if highly interested — use already-joined client data
    if (intent === 'interested' && (lead.score ?? 0) >= 70) {
      const clientData = (project as any)?.clients;
      if (clientData?.slack_webhook_url) {
        // Mask PII in Slack alert per CLAUDE.md policy
        await fetch(clientData.slack_webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🔥 Hot lead replied on WhatsApp!\nScore: ${lead.score} | Project: ${projectCtx}\nMessage: "${body.slice(0, 60).replace(/\d{4,}/g, '****')}…"`,
          }),
        }).catch(() => {});
      }
    }

    await logEvent('whatsapp_intent_classified', { leadId: lead.id, intent }, { leadId: lead.id });
  } catch (err) {
    await logEvent('whatsapp_intent_classification_failed', { error: err instanceof Error ? err.message : String(err) }, { leadId: lead.id });
  }

  return { leadId: lead.id, newStatus };
}
