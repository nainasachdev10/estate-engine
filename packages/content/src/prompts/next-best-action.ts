import { complete } from '@realty-engine/core';
import { z } from 'zod';

// ─── Next Best Action ─────────────────────────────────────────────────────────
// For each lead: what should the sales team do next, on which channel, and
// with what opening line — so acting on a profile takes minutes, not research.

export const NextBestActionSchema = z.object({
  action: z.enum(['contact', 'nurture', 'wait', 'drop']),
  channel: z.enum(['call', 'whatsapp', 'email']),
  best_time_ist: z.string(),
  opening_line: z.string(),
  reason: z.string(),
});

export type NextBestAction = z.infer<typeof NextBestActionSchema>;

export interface NbaLeadContext {
  fullName: string;
  status: string;
  score: number;
  horizon: string | null;
  languagePref: string | null;
  callSummary?: string | null;
  triggers: Array<{ trigger: string; evidence?: string | null; confidence?: number | null }>;
  recentMessages: Array<{ direction: string; channel: string; body: string }>;
  project: {
    name: string;
    location?: string | null;
    segment?: string | null;
    priceRange: string;
  };
  brandName: string;
}

const SYSTEM_PROMPT = `You are a senior real estate sales strategist for the Indian market.
Given everything known about a lead, you decide the single next best action for the human sales team.
You are decisive and practical. Opening lines are personal, reference the lead's actual situation, and never sound like a script.
For Hinglish leads write the opening line in Roman-script Hinglish. Never Devanagari.
Return ONLY valid JSON. No markdown fences.`;

export async function generateNextBestAction(ctx: NbaLeadContext): Promise<NextBestAction> {
  const triggerLines = ctx.triggers.slice(0, 3)
    .map((t) => `- ${t.trigger}${t.evidence ? ` (evidence: ${t.evidence})` : ''}${t.confidence != null ? ` [${t.confidence}%]` : ''}`)
    .join('\n') || '- none detected';

  const messageLines = ctx.recentMessages.slice(0, 5)
    .map((m) => `- [${m.direction === 'in' ? 'LEAD' : 'US'} · ${m.channel}] ${m.body.slice(0, 120)}`)
    .join('\n') || '- none';

  const userPrompt = `Decide the next best action for this real estate lead.

LEAD:
- Name: ${ctx.fullName}
- Pipeline status: ${ctx.status}
- Buying score: ${ctx.score}/100 (${ctx.horizon ?? 'unbanded'})
- Language: ${ctx.languagePref ?? 'hinglish'}
${ctx.callSummary ? `- Last call summary: ${ctx.callSummary}` : ''}

WHY-NOW TRIGGERS:
${triggerLines}

RECENT MESSAGES (newest first):
${messageLines}

PROJECT:
- ${ctx.project.name}, ${ctx.project.location ?? 'India'} (${ctx.project.segment ?? 'residential'}) · ${ctx.project.priceRange}
- Developer brand: ${ctx.brandName}

Rules:
- "contact" = the team should reach out now (hot). "nurture" = keep automated drip going. "wait" = a follow-up is already scheduled or the lead asked for time. "drop" = stop pursuing.
- channel: "call" for hot leads and callback requests; "whatsapp" for warm conversational follow-up; "email" for formal/document-heavy steps.
- best_time_ist: a concrete window like "11:00 AM - 1:00 PM" (respect 9am-9pm IST).
- opening_line: ONE sentence the salesperson can actually open with — reference the trigger or the last thing the lead said. Personal, warm, zero pressure.
- reason: one sentence explaining the recommendation.

Return this exact JSON:
{ "action": "contact" | "nurture" | "wait" | "drop", "channel": "call" | "whatsapp" | "email", "best_time_ist": "...", "opening_line": "...", "reason": "..." }`;

  const raw = await complete(userPrompt, {
    systemPrompt: SYSTEM_PROMPT,
    maxTokens: 400,
    temperature: 0.4,
  });

  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  return NextBestActionSchema.parse(JSON.parse(cleaned));
}
