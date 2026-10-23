import { complete } from '@realty-engine/core';
import { z } from 'zod';
import winningAds from '../examples/winning-ads.json';

// ─── Types ────────────────────────────────────────────────────────────────────

export type MetaSingleAd = {
  type: 'meta_single';
  headline: string;
  primary_text: string;
  description: string;
  buyer_persona: string;
};

export type MetaVideoAd = {
  type: 'meta_video';
  duration: '15s' | '30s' | '60s';
  on_screen: string;
  voiceover: string;
  buyer_persona?: string;
};

export type GoogleSearchAd = {
  type: 'google_search';
  headlines: string[];
  descriptions: string[];
  buyer_persona?: string;
};

export type GoogleDisplayAd = {
  type: 'google_display';
  headline: string;
  long_headline: string;
  description: string;
  buyer_persona?: string;
};

export type NinetyNineAcresAd = {
  type: '99acres';
  title: string;
  description: string;
  buyer_persona?: string;
};

export type AdVariant =
  | MetaSingleAd
  | MetaVideoAd
  | GoogleSearchAd
  | GoogleDisplayAd
  | NinetyNineAcresAd;

// ─── Zod schemas (for runtime validation of Claude output) ────────────────────

const MetaSingleSchema = z.object({
  type: z.literal('meta_single'),
  headline: z.string(),
  primary_text: z.string(),
  description: z.string(),
  buyer_persona: z.string(),
});

const MetaVideoSchema = z.object({
  type: z.literal('meta_video'),
  duration: z.enum(['15s', '30s', '60s']),
  on_screen: z.string(),
  voiceover: z.string(),
  buyer_persona: z.string().optional(),
});

const GoogleSearchSchema = z.object({
  type: z.literal('google_search'),
  headlines: z.array(z.string()),
  descriptions: z.array(z.string()),
  buyer_persona: z.string().optional(),
});

const GoogleDisplaySchema = z.object({
  type: z.literal('google_display'),
  headline: z.string(),
  long_headline: z.string(),
  description: z.string(),
  buyer_persona: z.string().optional(),
});

const NinetyNineSchema = z.object({
  type: z.literal('99acres'),
  title: z.string(),
  description: z.string(),
  buyer_persona: z.string().optional(),
});

const VariantSchema = z.discriminatedUnion('type', [
  MetaSingleSchema,
  MetaVideoSchema,
  GoogleSearchSchema,
  GoogleDisplaySchema,
  NinetyNineSchema,
]);

const ResponseSchema = z.object({
  variants: z.array(VariantSchema).min(1),
});

// ─── Inputs ───────────────────────────────────────────────────────────────────

export interface AdGenProject {
  name: string;
  location: string | null;
  segment: 'luxury' | 'premium' | 'mid' | 'affordable' | 'plot' | null;
  unit_type: string | null;
  price_min_paise: number | null;
  price_max_paise: number | null;
  usp_bullets?: string[] | null;
  key_amenities?: Record<string, unknown> | null;
  developer_about?: string | null;
  rera_number?: string | null;
}

export interface AdGenClient {
  name: string;
  brand_name?: string | null;
  brand_voice_notes?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function priceRangeINR(min: number | null, max: number | null): string {
  const fmt = (p: number) =>
    p >= 10_000_000 ? `₹${(p / 10_000_000).toFixed(p % 10_000_000 === 0 ? 0 : 1)} Cr` : `₹${(p / 100_000).toFixed(0)} L`;
  if (min && max) return `${fmt(min)}–${fmt(max)}`;
  if (min) return `${fmt(min)} onwards`;
  if (max) return `up to ${fmt(max)}`;
  return 'on request';
}

function segmentPsychology(segment: string | null): string {
  switch (segment) {
    case 'luxury':
      return 'Status, legacy, scarcity, exclusivity. Buyer is a UHNI or top-tier exec. Anchor on address prestige, finishes, neighbours. Never mention EMIs — use "private viewing" CTAs.';
    case 'premium':
      return 'Aspirational lifestyle for SEC-A1 professionals. Anchor on amenities, schools, commute, build quality. EMIs and possession dates matter.';
    case 'mid':
      return 'Value + future appreciation for working families. Connectivity, RERA, possession certainty are critical trust signals.';
    case 'affordable':
      return 'First-home buyers. Anchor on EMI vs rent comparison, possession in 18 months, vastu-compliant, kids\' school zones.';
    case 'plot':
      return 'Investors + plot-buyers want clear title, NA-approval, gated layout, ROI story, and a quick WhatsApp quote. Trust beats lifestyle here.';
    default:
      return 'Generic Indian buyer — emphasise trust (RERA, developer history) and a clear price anchor.';
  }
}

const SYSTEM_PROMPT = `You are a senior performance-marketing copywriter for Indian luxury and mid-market real estate.
Your ads feel human, catchy, and conversational—never robotic or AI-sounding.
You write in flowing, engaging sentences that tell a story and evoke emotion, not in short bullet-point fragments with periods.
You understand Indian buyer psychology by segment: status/aspirational for luxury, trust & value for mid-market, ROI & growth for plots.
You focus on benefits and lifestyle moments, not just features and specs. A buyer should *feel* something, not just read facts.
You never make false claims (no "guaranteed returns", no "limited time" if it isn't).
You return ONLY valid JSON. No markdown fences. No prose.`;

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function generateAdCreatives(
  project: AdGenProject,
  client: AdGenClient,
  options?: { count?: number }
): Promise<AdVariant[]> {
  const count = options?.count ?? 10;
  const priceRange = priceRangeINR(project.price_min_paise, project.price_max_paise);
  const psychology = segmentPsychology(project.segment);
  const usps = (project.usp_bullets ?? []).filter(Boolean).slice(0, 6).join('; ') || 'not specified';
  const amenities = project.key_amenities
    ? Object.values(project.key_amenities).flat().slice(0, 6).join(', ')
    : 'not specified';

  const examplesJson = JSON.stringify(winningAds.examples.slice(0, 4), null, 2);

  const outputInstructions =
    count === 1
      ? `OUTPUT — generate exactly 1 ad creative and respect every character limit STRICTLY:

One Meta single-image ad: { type: "meta_single", headline (<=40 chars), primary_text (<=125 chars), description (<=30 chars), buyer_persona (1 sentence) }.

CHARACTER LIMITS ARE HARD — if you cannot fit a benefit, cut it. Never exceed limits.

Return JSON in this exact shape:
{ "variants": [ ...1 variant... ] }`
      : count === 2
      ? `OUTPUT — generate exactly these 2 contrasting ad creatives and respect every character limit STRICTLY:

1. One Meta single-image ad (Instagram/Facebook placement): { type: "meta_single", headline (<=40 chars), primary_text (<=125 chars), description (<=30 chars), buyer_persona (1 sentence) }.
TONE FOR THIS ONE — creative, conversational, and emotionally compelling—like premium brands (luxury watches, cars, hotels). Imagine copy you'd see in a high-end magazine or a premium Instagram account. The primary_text should flow as one or two engaging sentences, NOT as a list of short fragments with periods. Evoke a moment or a feeling: what does life BECOME here? What does it *feel* like to own this? Focus on benefits and lifestyle, not features. Light on hard specs. This should NOT sound robotic, AI-generated, or like a property listing.

2. One 99acres portal listing: { type: "99acres", title (<=60 chars), description (<=500 chars), buyer_persona }.
TONE FOR THIS ONE — plain, factual, spec-driven, exactly like a real 99acres/property-portal listing: BHK configuration, carpet area / sq ft, price, floor, possession date, RERA if given, key amenities as a short list. No emotional language, no flourishes — a buyer scanning listings should get the facts in 3 seconds.

These two must read as DIFFERENT REGISTERS — one aspirational social ad, one factual listing. Do not blend the tones.

CHARACTER LIMITS ARE HARD — if you cannot fit a benefit, cut it. Never exceed limits.

Return JSON in this exact shape:
{ "variants": [ ...2 variants, meta_single first then 99acres... ] }`
      : `OUTPUT — generate exactly these 10 variants and respect every character limit STRICTLY:

1–3. Three Meta single-image ads. Each: { type: "meta_single", headline (<=40 chars), primary_text (<=125 chars), description (<=30 chars), buyer_persona (1 sentence) }. Vary the persona across the three: e.g. status-seeker, lifestyle-upgrader, investor.

4–6. Three Meta video scripts. Each: { type: "meta_video", duration ("15s" | "30s" | "60s"), on_screen (visual description), voiceover (script, fits the duration), buyer_persona }. Use all three durations across the three videos.

7–8. Two Google Search RSA ads. Each: { type: "google_search", headlines (array of exactly 5 strings, each <=30 chars), descriptions (array of exactly 2 strings, each <=90 chars), buyer_persona }.

9. One Google Display ad: { type: "google_display", headline (<=25 chars), long_headline (<=90 chars), description (<=90 chars), buyer_persona }.

10. One 99acres listing: { type: "99acres", title (<=60 chars), description (<=500 chars), buyer_persona }.

CHARACTER LIMITS ARE HARD — if you cannot fit a benefit, cut it. Never exceed limits.

Return JSON in this exact shape:
{ "variants": [ ...10 variants in order... ] }`;

  const userPrompt = `Generate exactly ${count} ad creative${count === 1 ? '' : 's'} for the following Indian real estate project.

PROJECT:
- Name: ${project.name}
- Location: ${project.location ?? 'India'}
- Segment: ${project.segment ?? 'unspecified'}
- Unit type: ${project.unit_type ?? 'unspecified'}
- Price range: ${priceRange}
- USPs: ${usps}
- Amenities: ${amenities}
- Developer: ${client.brand_name ?? client.name}
- Brand voice: ${client.brand_voice_notes ?? 'premium, trustworthy, warm'}
- RERA: ${project.rera_number ?? 'not provided'}

BUYER PSYCHOLOGY for ${project.segment ?? 'this'} segment:
${psychology}

REFERENCE EXAMPLES (study tone and structure, do not copy):
${examplesJson}

CRITICAL TONE GUIDANCE:
✓ DO: Write flowing, engaging copy that feels human and conversational. Use connected sentences. Tell a story.
✓ DO: Lead with emotion and lifestyle—what does living here feel like? What becomes possible?
✓ DO: Use language that's catchy and memorable, like premium brand ads (not property listing language).
✓ DO: Write in the second person ("you") when it feels natural, drawing the reader into the vision.
✗ DON'T: Write a series of short, disconnected sentences with periods ("Feature one. Feature two. Feature three").
✗ DON'T: Sound robotic, AI-generated, or like a boring spec sheet. Avoid filler words and empty marketing jargon.
✗ DON'T: Dump amenities as a list. Weave them into a narrative if you include them at all.

${outputInstructions}`;

  const raw = await complete(userPrompt, {
    systemPrompt: SYSTEM_PROMPT,
    maxTokens: 4000,
    temperature: 0.85,
  });

  const cleaned = stripFences(raw.trim());
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`generateAdCreatives: Claude returned non-JSON: ${cleaned.slice(0, 200)}`);
  }

  const result = ResponseSchema.parse(parsed);
  return result.variants;
}

function stripFences(s: string): string {
  return s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
}
