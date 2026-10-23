/**
 * escalation.ts — the hard-coded human-handover rail.
 *
 * Rules from the workforce spec that can never be overridden:
 *  - discount/negotiation talk → instant human handover (AI never discusses price cuts)
 *  - complaints → human
 *  - penthouse enquiries → human-only with an AI research brief
 *
 * Detection is deterministic (regex), mirroring the opt-out rail: money/brand
 * risk must not depend on an LLM's mood. Claude only writes the closer brief.
 */

import { getSupabaseServer } from './db';
import { logEvent } from './logger';

export type EscalationKind = 'discount' | 'complaint' | 'penthouse' | 'uncertain';

// "discount", "offer chalega?", "best price", "kuch kam karo", "negotiable",
// "final price", Gujarati/Hindi phrasings buyers actually use.
const DISCOUNT_RE =
  /\b(discount|disc\.?|best (?:price|rate|offer)|final (?:price|rate)|negotiab|price (?:kam|less)|kam (?:karo|hoga|ho sakta|thay)|kuch kam|offer (?:chalega|available|hai)|deal (?:de do|karo)|ડિસ્કાઉન્ટ|છૂટ|भाव कम|कम करो|डिस्काउंट)\b/i;

const COMPLAINT_RE =
  /\b(complain|complaint|grievance|cheat(?:ed|ing)?|fraud|refund|legal (?:action|notice)|consumer (?:court|forum)|rera complaint|very (?:bad|poor) (?:service|experience)|worst|pathetic|फरियाद|शिकायत|ફરિયાદ)\b/i;

const PENTHOUSE_RE = /\b(pent\s?house|duplex[- ]?penthouse|પેન્ટહાઉસ|पेंटहाउस)\b/i;

/** Returns the first hard-rule the message trips, or null. Order = severity. */
export function detectEscalation(message: string): EscalationKind | null {
  if (COMPLAINT_RE.test(message)) return 'complaint';
  if (DISCOUNT_RE.test(message)) return 'discount';
  if (PENTHOUSE_RE.test(message)) return 'penthouse';
  return null;
}

export interface CloserBrief {
  who: string; // who they are, from lead data (no raw phone/email)
  what_they_want: string;
  say_first: string;
}

/**
 * Records an escalation (idempotent per lead+kind while one is still open) and
 * logs it. The caller decides how to notify (email/Slack) — this only persists.
 * Returns the escalation id, or null when an identical one is already open.
 */
export async function createEscalation(params: {
  leadId: string;
  kind: EscalationKind;
  detail: string; // keep PII out — snippet of what tripped it, masked upstream
  brief?: CloserBrief | null;
}): Promise<string | null> {
  const supabase = getSupabaseServer();

  const { data: existing } = await supabase
    .from('escalations')
    .select('id')
    .eq('lead_id', params.leadId)
    .eq('kind', params.kind)
    .eq('status', 'open')
    .maybeSingle();
  if (existing) return null;

  const { data, error } = await supabase
    .from('escalations')
    .insert([{
      lead_id: params.leadId,
      kind: params.kind,
      detail: params.detail.slice(0, 300),
      brief: params.brief ?? null,
    }])
    .select('id')
    .single();

  if (error) {
    await logEvent('escalation_insert_failed', { error: error.message }, { leadId: params.leadId });
    return null;
  }

  await logEvent('lead_escalated', { kind: params.kind }, { leadId: params.leadId });
  return data.id as string;
}
