import { complete } from '@realty-engine/core';
import { z } from 'zod';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SocialPlatform = 'instagram' | 'facebook' | 'linkedin' | 'twitter';

export type SocialTheme =
  | 'lifestyle'
  | 'amenities'
  | 'neighborhood'
  | 'trust_signal'
  | 'offer'
  | 'testimonial'
  | 'construction_progress';

export interface GeneratedSocialPost {
  platform: SocialPlatform;
  post_type: string;
  caption: string;
  hashtags: string[];
  media_brief: string;
  suggested_post_at: string;
  theme: SocialTheme;
}

const PostSchema = z.object({
  platform: z.enum(['instagram', 'facebook', 'linkedin', 'twitter']),
  post_type: z.string(),
  caption: z.string(),
  hashtags: z.array(z.string()),
  media_brief: z.string(),
  suggested_post_at: z.string(),
  theme: z.enum([
    'lifestyle',
    'amenities',
    'neighborhood',
    'trust_signal',
    'offer',
    'testimonial',
    'construction_progress',
  ]),
});

const ResponseSchema = z.object({ posts: z.array(PostSchema).min(1) });

// ─── Inputs ───────────────────────────────────────────────────────────────────

export interface SocialGenProject {
  name: string;
  location: string | null;
  segment: 'luxury' | 'premium' | 'mid' | 'affordable' | 'plot' | null;
  unit_type: string | null;
  price_min_paise: number | null;
  price_max_paise: number | null;
  usp_bullets?: string[] | null;
  key_amenities?: Record<string, unknown> | null;
  developer_about?: string | null;
}

export interface SocialGenClient {
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

const DEFAULT_THEMES: SocialTheme[] = [
  'lifestyle',
  'amenities',
  'neighborhood',
  'trust_signal',
  'offer',
  'testimonial',
  'construction_progress',
];

const SYSTEM_PROMPT = `You are the head of social media for a luxury Indian real estate developer.
You schedule a month of posts that mix lifestyle, social proof, and trust signals.
You write platform-native captions: Instagram (visual + emotion), Facebook (longer, community), LinkedIn (developer/investor angle), Twitter (short, news/launches).
You schedule posts at proven peak times in IST.
You return ONLY valid JSON. No markdown fences.`;

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function generateSocialMonth(
  project: SocialGenProject,
  client: SocialGenClient,
  days: number,
  themes?: SocialTheme[]
): Promise<GeneratedSocialPost[]> {
  const themeList = (themes && themes.length > 0 ? themes : DEFAULT_THEMES).join(', ');
  const priceRange = priceRangeINR(project.price_min_paise, project.price_max_paise);
  const usps = (project.usp_bullets ?? []).filter(Boolean).slice(0, 6).join('; ') || 'not specified';
  const amenities = project.key_amenities
    ? Object.values(project.key_amenities).flat().slice(0, 6).join(', ')
    : 'not specified';

  const startDate = new Date();
  const startIso = startDate.toISOString().split('T')[0];

  const userPrompt = `Generate a ${days}-day social media plan for the following project.

PROJECT:
- Name: ${project.name}
- Location: ${project.location ?? 'India'}
- Segment: ${project.segment ?? 'unspecified'}
- Unit type: ${project.unit_type ?? 'unspecified'}
- Price range: ${priceRange}
- USPs: ${usps}
- Amenities: ${amenities}
- Brand: ${client.brand_name ?? client.name}
- Brand voice: ${client.brand_voice_notes ?? 'premium, trustworthy, warm'}

THEMES TO ROTATE EVENLY: ${themeList}

PLATFORM PEAK TIMES (IST — schedule at these hours only):
- Instagram: 11:00, 19:00, 21:00 (any day)
- Facebook: 13:00, 20:00 (any day)
- LinkedIn: 09:00, 12:00 (Mon–Fri only — no weekends)
- Twitter: 08:00, 18:00 (any day)

RULES:
- Start date: ${startIso} (date strings must be on/after this, in ISO 8601 with timezone +05:30).
- Distribute the ${days} days across platforms; not every day on every platform — pick 1–2 posts per day mixing platforms.
- For LinkedIn, only schedule on Mon-Fri.
- Vary themes evenly across the month.
- Captions must be platform-native — Instagram emotive, LinkedIn analytical, Facebook community-warm, Twitter punchy.
- hashtags: 3–8 per post, no spaces in tag.
- media_brief: 1 sentence describing the photo/video the human team should shoot.
- post_type: e.g. "carousel", "single_image", "reel", "story", "video", "text".

Return JSON in this shape:
{
  "posts": [
    {
      "platform": "instagram",
      "post_type": "carousel",
      "caption": "...",
      "hashtags": ["#worli", "#luxuryhomes"],
      "media_brief": "...",
      "suggested_post_at": "2026-05-16T11:00:00+05:30",
      "theme": "lifestyle"
    }
  ]
}

Aim for roughly ${Math.round(days * 1.2)} total posts over ${days} days.`;

  const raw = await complete(userPrompt, {
    systemPrompt: SYSTEM_PROMPT,
    maxTokens: 8000,
    temperature: 0.85,
  });

  const cleaned = stripFences(raw.trim());
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`generateSocialMonth: Claude returned non-JSON: ${cleaned.slice(0, 200)}`);
  }

  const result = ResponseSchema.parse(parsed);
  return result.posts;
}

function stripFences(s: string): string {
  return s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
}
