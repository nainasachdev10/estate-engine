import { z } from 'zod';

// Client
export const ClientSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  brand_name: z.string().nullable(),
  contact_email: z.string().email().nullable(),
  contact_phone: z.string().nullable(),
  gold_color_hex: z.string(),
  logo_url: z.string().url().nullable(),
  status: z.enum(['active', 'paused']),
  monthly_fee_paise: z.number().int().nonnegative(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type Client = z.infer<typeof ClientSchema>;

// Project
export const ProjectSchema = z.object({
  id: z.string().uuid(),
  client_id: z.string().uuid(),
  name: z.string(),
  location: z.string().nullable(),
  segment: z.enum(['luxury', 'premium', 'mid', 'affordable', 'plot']).nullable(),
  unit_type: z.string().nullable(),
  price_min_paise: z.number().int().nonnegative().nullable(),
  price_max_paise: z.number().int().nonnegative().nullable(),
  brochure_url: z.string().url().nullable(),
  key_amenities: z.record(z.any()).nullable(),
  status: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type Project = z.infer<typeof ProjectSchema>;

// Lead
export const LeadSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  full_name: z.string(),
  phone_e164: z.string(),
  email: z.string().email().nullable(),
  source: z.enum(['meta', 'google', '99acres', 'organic', 'walkin', 'manual']),
  source_meta: z.record(z.any()).nullable(),
  status: z.enum(['new', 'contacted', 'qualified', 'site_visit_booked', 'visited', 'negotiating', 'closed_won', 'closed_lost', 'unresponsive']),
  score: z.number().int().min(0).max(100),
  language_pref: z.enum(['en', 'hi', 'hinglish']),
  location_city: z.string().nullable(),
  location_country: z.string(),
  notes: z.string().nullable(),
  last_contacted_at: z.coerce.date().nullable(),
  next_followup_at: z.coerce.date().nullable(),
  assigned_to: z.string().uuid().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type Lead = z.infer<typeof LeadSchema>;

// Call log
export const CallLogSchema = z.object({
  id: z.string().uuid(),
  lead_id: z.string().uuid(),
  bolna_call_id: z.string().nullable(),
  started_at: z.coerce.date().nullable(),
  ended_at: z.coerce.date().nullable(),
  duration_seconds: z.number().int().nonnegative().nullable(),
  outcome: z.enum(['no_answer', 'qualified', 'not_qualified', 'callback', 'wrong_number']).nullable(),
  transcript: z.string().nullable(),
  recording_url: z.string().url().nullable(),
  summary: z.string().nullable(),
  sentiment: z.enum(['positive', 'neutral', 'negative']).nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type CallLog = z.infer<typeof CallLogSchema>;

// Message
export const MessageSchema = z.object({
  id: z.string().uuid(),
  lead_id: z.string().uuid(),
  channel: z.enum(['whatsapp', 'email', 'sms']),
  direction: z.enum(['out', 'in']),
  template_name: z.string().nullable(),
  body: z.string(),
  status: z.enum(['queued', 'sent', 'delivered', 'read', 'replied', 'failed']),
  provider_message_id: z.string().nullable(),
  sent_at: z.coerce.date().nullable(),
  replied_at: z.coerce.date().nullable(),
  claude_personalisation_meta: z.record(z.any()).nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type Message = z.infer<typeof MessageSchema>;

// Campaign
export const CampaignSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  platform: z.enum(['meta', 'google', '99acres']),
  name: z.string(),
  status: z.string(),
  budget_paise_daily: z.number().int().nonnegative().nullable(),
  headline: z.string().nullable(),
  primary_text: z.string().nullable(),
  creative_url: z.string().url().nullable(),
  external_campaign_id: z.string().nullable(),
  started_at: z.coerce.date().nullable(),
  ended_at: z.coerce.date().nullable(),
  leads_count: z.number().int().nonnegative(),
  spend_paise: z.number().int().nonnegative(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type Campaign = z.infer<typeof CampaignSchema>;

// Social post
export const SocialPostSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  platform: z.enum(['instagram', 'facebook', 'linkedin', 'twitter']),
  caption: z.string().nullable(),
  media_urls: z.array(z.string().url()).nullable(),
  scheduled_at: z.coerce.date().nullable(),
  posted_at: z.coerce.date().nullable(),
  status: z.enum(['draft', 'scheduled', 'posted', 'failed']),
  claude_brief: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type SocialPost = z.infer<typeof SocialPostSchema>;

// Event
export const EventSchema = z.object({
  id: z.string().uuid(),
  lead_id: z.string().uuid().nullable(),
  project_id: z.string().uuid().nullable(),
  kind: z.string(),
  payload: z.record(z.any()).nullable(),
  created_at: z.coerce.date(),
});

export type Event = z.infer<typeof EventSchema>;
