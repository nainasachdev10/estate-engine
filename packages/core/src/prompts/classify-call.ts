import { z } from 'zod';
import { complete } from '../claude';

export const CallClassificationSchema = z.object({
  outcome: z.enum(['qualified', 'not_qualified', 'callback', 'wrong_number', 'no_answer']),
  score: z.number().int().min(0).max(100),
  summary: z.string(),
  sentiment: z.enum(['positive', 'neutral', 'negative']),
  objections: z.array(z.string()),
  next_action: z.enum(['send_whatsapp_brochure', 'schedule_site_visit', 'callback_in_2_days', 'drop']),
});

export type CallClassification = z.infer<typeof CallClassificationSchema>;

const SYSTEM_PROMPT = `You are an expert real estate sales analyst. You analyze call transcripts between a voice AI agent and property leads.

You output ONLY valid JSON — no explanation, no markdown, just the JSON object.`;

export async function classifyCall(
  transcript: string,
  projectContext: {
    projectName: string;
    priceRange: string;
    segment: string;
  }
): Promise<CallClassification> {
  const userPrompt = `Analyze this real estate sales call transcript and classify the outcome.

Project: ${projectContext.projectName}
Price Range: ${projectContext.priceRange}
Segment: ${projectContext.segment}

Transcript:
${transcript}

Return this exact JSON (no markdown, no explanation):
{
  "outcome": "qualified" | "not_qualified" | "callback" | "wrong_number" | "no_answer",
  "score": <0-100 integer — 0 = dead lead, 100 = ready to buy today>,
  "summary": "<2 sentences max describing what happened on the call>",
  "sentiment": "positive" | "neutral" | "negative",
  "objections": ["budget" | "timeline" | "location" | "family_decision" | "already_bought" | "not_interested" | "other"],
  "next_action": "send_whatsapp_brochure" | "schedule_site_visit" | "callback_in_2_days" | "drop"
}

Scoring guide:
- 80-100: Said yes to site visit, clear intent, matched budget
- 60-79: Interested, minor hesitation, asked for more info
- 40-59: Warm but unclear timeline or budget mismatch
- 20-39: Exploring early, not ready, needs nurturing
- 0-19: Not interested, wrong number, or no answer`;

  const rawText = await complete(userPrompt, {
    systemPrompt: SYSTEM_PROMPT,
    maxTokens: 512,
    temperature: 0.1,
  });

  const json = JSON.parse(rawText.trim());
  return CallClassificationSchema.parse(json);
}
