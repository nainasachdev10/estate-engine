# Prompt 01 — Foundation

> Paste this into Claude Code at the root of an empty folder. It scaffolds the monorepo, sets up Supabase, and creates the lead pipeline schema.

---

## Task

You are bootstrapping a productized SaaS called **Realty Engine** — an acquisition engine for Indian real estate developers. Read `CLAUDE.md` and `plans/00-MASTER-PLAN.md` before doing anything else. Do not deviate from the stack or folder structure defined there.

In this session, build the foundation only:

### 1. Initialise the monorepo

Use **pnpm workspaces** (not Turborepo — keep it simple).

```
/
├── apps/web/           Next.js 14 App Router, TypeScript strict, Tailwind, shadcn/ui
├── packages/core/      shared
├── supabase/migrations/
├── CLAUDE.md           (already exists, do not overwrite)
├── plans/              (already exists, do not overwrite)
├── package.json        (root, with workspaces)
├── pnpm-workspace.yaml
└── .env.example
```

### 2. Supabase schema (migration 0001)

Create `supabase/migrations/0001_init.sql` with these tables. Use `uuid` primary keys, `created_at` and `updated_at` on every table, RLS enabled with permissive policies for now (we'll tighten later).

- **clients** — the developer/broker who pays us. Columns: id, name, brand_name, contact_email, contact_phone, gold_color_hex, logo_url, status (active/paused), monthly_fee_paise.
- **projects** — a single property/launch belonging to a client. Columns: id, client_id, name, location, segment (luxury/premium/mid/affordable/plot), unit_type (e.g. "5.5 BHK"), price_min_paise, price_max_paise, brochure_url, key_amenities (jsonb), status.
- **leads** — captured prospects. Columns: id, project_id, full_name, phone_e164, email, source (meta/google/99acres/organic/walkin/manual), source_meta (jsonb — campaign id, ad id, etc.), status (enum below), score (0-100), language_pref (en/hi/hinglish), location_city, location_country, notes, last_contacted_at, next_followup_at, assigned_to.
  - status enum: `new, contacted, qualified, site_visit_booked, visited, negotiating, closed_won, closed_lost, unresponsive`
- **call_logs** — every voice agent call. Columns: id, lead_id, bolna_call_id, started_at, ended_at, duration_seconds, outcome (no_answer/qualified/not_qualified/callback/wrong_number), transcript (text), recording_url, summary (text — Claude-generated), sentiment (positive/neutral/negative).
- **messages** — every WhatsApp and email sent or received. Columns: id, lead_id, channel (whatsapp/email/sms), direction (out/in), template_name, body (text), status (queued/sent/delivered/read/replied/failed), provider_message_id, sent_at, replied_at, claude_personalisation_meta (jsonb).
- **campaigns** — ad campaigns we run on behalf of clients. Columns: id, project_id, platform (meta/google/99acres), name, status, budget_paise_daily, headline, primary_text, creative_url, external_campaign_id, started_at, ended_at, leads_count, spend_paise.
- **social_posts** — scheduled social content. Columns: id, project_id, platform (instagram/facebook/linkedin/twitter), caption, media_urls (text[]), scheduled_at, posted_at, status (draft/scheduled/posted/failed), claude_brief (text — what the AI was asked to write).
- **events** — append-only log of everything that happens. Columns: id, lead_id (nullable), project_id (nullable), kind (string), payload (jsonb), created_at. This is our audit trail.

Add indexes:
- `leads(project_id, status)`
- `leads(phone_e164)` unique constraint (per client — composite with client_id via projects)
- `messages(lead_id, created_at desc)`
- `events(created_at desc)`

Add a trigger to auto-update `updated_at` on row update for all tables.

### 3. Core package

In `packages/core/src/`:

- `db.ts` — exports a typed Supabase server client and a browser client
- `claude.ts` — exports a configured Anthropic client with a `complete(systemPrompt, userPrompt, opts?)` helper that defaults to Sonnet 4.5, returns parsed text, and logs token usage to the `events` table
- `types.ts` — Zod schemas matching every table, plus inferred TypeScript types
- `logger.ts` — thin wrapper that writes to `events` and to console in dev
- `phone.ts` — utility to normalize Indian phone numbers to E.164 (`+91XXXXXXXXXX`), reject invalid ones

### 4. Web app skeleton

In `apps/web/`:

- Next.js 14 with App Router, TypeScript strict, Tailwind, shadcn/ui pre-configured with a dark luxury theme (background `#0a0a0a`, accent gold `#d4af37`, serif headings via Playfair Display, sans body via Inter)
- App layout with a sidebar nav: Pipeline, Leads, Projects, Campaigns, Social, Settings
- A placeholder home page that just says "Realty Engine — pipeline view coming next" so we know it boots
- `/api/leads/intake` route — accepts POST JSON `{full_name, phone, email, project_id, source, source_meta}`, validates with Zod, inserts into `leads` table, returns the new lead id. This is the endpoint ads/landing pages will hit.

### 5. Environment

Create `.env.example` with placeholder keys for everything we'll need across all 5 modules:

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Anthropic
ANTHROPIC_API_KEY=

# Voice (Bolna)
BOLNA_API_KEY=
BOLNA_AGENT_ID=
BOLNA_FROM_NUMBER=

# Sarvam (STT/TTS fallback)
SARVAM_API_KEY=

# WhatsApp (AiSensy)
AISENSY_API_KEY=
AISENSY_SENDER_ID=

# Email (Brevo)
BREVO_API_KEY=
BREVO_SENDER_EMAIL=
BREVO_SENDER_NAME=

# Inngest
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

# PostHog
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=

# App
APP_URL=http://localhost:3000
```

### 6. README

Write a `README.md` at root with: what the project is (2 lines), how to run locally (`pnpm i && pnpm dev`), how to apply migrations (`supabase db push`), and the 5-module overview.

---

## Deliverables for this session

When done, I should be able to:
1. `pnpm install && pnpm dev` and see the home page at localhost:3000
2. `curl -X POST localhost:3000/api/leads/intake -d '{...}'` and have a row appear in Supabase
3. See `events` rows being written for every lead intake

Stop after foundation is done. Do NOT start on voice agent or any other module. Confirm by listing all created files.
