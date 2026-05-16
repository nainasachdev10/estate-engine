import { complete } from '@realty-engine/core';
import type { MessageContext, GeneratedMessage } from './types';
import type { SequenceKind } from '@realty-engine/messaging';

const SYSTEM_PROMPT = `You are an expert real estate copywriter for the Indian market.
You write WhatsApp messages and emails that feel personal, warm, and never salesy.
You write in the language preference specified. For "hinglish", mix Hindi words naturally in Roman script.
Return ONLY valid JSON — no explanation, no markdown code blocks.`;

const KIND_PROMPTS: Record<SequenceKind, string> = {
  brochure_send: `Write a warm WhatsApp message (max 3 sentences) sharing that you're sending the brochure. Reference the project by name. Make it feel personal, not automated. If brochureUrl is available, mention you'll share it. End with a soft question like asking what matters most to them in a home.`,

  site_visit_nudge: `Write a WhatsApp message (max 3 sentences) nudging them to book a site visit. Keep it casual and low-pressure — "no commitment, just come and see it." Mention a specific weekend day as a suggestion.`,

  developer_credibility: `Write a short email (150-200 words) about the developer's track record and credibility. Focus on delivered projects, quality, and trust. Make it story-like, not a list of achievements. Subject line should be personal and curiosity-driven.`,

  social_proof: `Write a WhatsApp message (max 4 sentences) sharing a "social proof" moment — e.g. units selling fast, a happy buyer, or strong demand. Make it feel like insider information shared by a friend, not a marketing blast.`,

  urgency_inventory: `Write a WhatsApp message (max 3 sentences) creating genuine urgency around limited inventory. Mention the specific unit type. Do NOT make false claims — frame it as "a few left" only, not "last one."`,

  last_chance: `Write a final email (100-150 words) that is warm and honest — this is the last message in the sequence. Say you'll stop reaching out and wish them well. Leave the door open without pressure. Subject should be genuine, not clickbait.`,

  gentle_intro: `Write a gentle WhatsApp message (2-3 sentences) introducing the project to someone who didn't answer the call. Don't mention the missed call. Just introduce yourself and the project warmly, and invite them to ask any questions.`,

  value_prop: `Write a WhatsApp message (max 4 sentences) highlighting 2-3 key value propositions of the project that would matter to a buyer in their city. Focus on lifestyle, not specs. End with a soft call to action.`,

  final_followup: `Write a short, warm email (80-100 words) as a final follow-up to someone who hasn't responded. Acknowledge they might be busy or not interested. Leave it completely open-ended with no pressure. Subject should feel like it's from a real person.`,

  confirm_callback_time: `Write a WhatsApp message (2 sentences max) confirming their requested callback time. Be specific about the time. Make it sound like a personal commitment, not an automated confirmation.`,
};

export async function generateMessage(
  kind: SequenceKind,
  ctx: MessageContext,
  channel: 'whatsapp' | 'email'
): Promise<GeneratedMessage> {
  const kindPrompt = KIND_PROMPTS[kind];
  const langInstruction =
    ctx.lead.languagePref === 'hinglish'
      ? 'Write in Hinglish — mix Hindi words naturally in Roman script. DO NOT use Devanagari.'
      : ctx.lead.languagePref === 'hi'
      ? 'Write in Roman-script Hindi (Hinglish).'
      : 'Write in natural, conversational English.';

  const userPrompt = `
${kindPrompt}

Context:
- Lead name: ${ctx.lead.fullName}
- Language: ${ctx.lead.languagePref}
- Location: ${ctx.lead.locationCity ?? 'India'}
- Project: ${ctx.project.name} in ${ctx.project.location}
- Unit type: ${ctx.project.unitType}
- Price range: ${ctx.project.priceRange}
- Amenities: ${ctx.project.keyAmenities}
- Brand: ${ctx.client.brandName}
- Segment: ${ctx.project.segment}
${ctx.lead.callSummary ? `- Call summary: ${ctx.lead.callSummary}` : ''}
${ctx.lead.objections?.length ? `- Known objections: ${ctx.lead.objections.join(', ')}` : ''}
${ctx.project.brochureUrl ? `- Brochure URL: ${ctx.project.brochureUrl}` : ''}

${langInstruction}

Return this JSON:
{
  ${channel === 'email' ? '"subject": "<email subject line>",' : ''}
  "body": "<message body>",
  "suggestedSendTimeIST": "optional — e.g. 10:00 AM or null"
}`;

  const raw = await complete(userPrompt, {
    systemPrompt: SYSTEM_PROMPT,
    maxTokens: 600,
    temperature: 0.8,
  });

  const cleaned = raw.trim().replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
  return JSON.parse(cleaned) as GeneratedMessage;
}

export async function sanityCheck(body: string): Promise<boolean> {
  const result = await complete(
    `Does this real estate message follow Indian real estate etiquette and avoid making promises or false claims?\n\nMessage: "${body}"\n\nReturn only: YES or a 5-word fix.`,
    { maxTokens: 20, temperature: 0 }
  );
  return result.trim().toUpperCase().startsWith('YES');
}
