# Realty Engine — Production Checklist

> Step-by-step for going live. Do this in order. Each section has a ✅ you can tick off.

---

## Phase 1 — Accounts & API Keys (2–3 hours)

Do this before touching any code or deployment settings.

### 1.1 Supabase
- [ ] Create project at **supabase.com** (free tier is fine to start)
- [ ] Go to **Settings → API** and copy:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Go to **Authentication → URL Configuration**:
  - Set **Site URL** → `https://estate-engine.vercel.app`
  - Add **Redirect URL** → `https://estate-engine.vercel.app/auth/callback`
- [ ] Go to **Authentication → Email** → Enable **Magic Link (OTP)** login

### 1.2 Anthropic (Claude AI)
- [ ] Sign up at **console.anthropic.com**
- [ ] Add payment method and buy **$5 credits** to start
- [ ] Go to **API Keys** → Create key → Copy `ANTHROPIC_API_KEY`
- [ ] Set a usage limit (Settings → Limits → set ₹5,000/month limit to prevent runaway costs)

### 1.3 Bolna (Voice Agent)
- [ ] Sign up at **bolna.dev**
- [ ] Add ₹1,000 prepaid credit
- [ ] Create your agent (follow `docs/bolna-agent-setup.md`)
- [ ] Copy:
  - `BOLNA_API_KEY` from Settings → API Keys
  - `BOLNA_AGENT_ID` from your agent settings page
  - `BOLNA_FROM_NUMBER` — purchase an India number from Bolna (under **My Numbers**)
  - `BOLNA_WEBHOOK_SECRET` — set a secret in Bolna's webhook settings, copy here
- [ ] **Set webhook URL** in agent's Call tab → `https://estate-engine.vercel.app/api/voice/webhook`

### 1.4 AiSensy (WhatsApp)
- [ ] Sign up at **aisensy.com** (free trial available)
- [ ] Register a WhatsApp Business number (takes 24–48 hours for Meta approval)
- [ ] Copy:
  - `AISENSY_API_KEY`
  - `AISENSY_SENDER_ID`
- [ ] **Set webhook URL** in AiSensy dashboard → `https://estate-engine.vercel.app/api/messaging/whatsapp-webhook`
- [ ] Submit the 6 WhatsApp templates from `docs/whatsapp-templates.md` (takes 24–48 hours)

### 1.5 Brevo (Email)
- [ ] Sign up at **brevo.com** (free — 300 emails/day)
- [ ] Verify your sender email domain (DNS records)
- [ ] Copy:
  - `BREVO_API_KEY` from Settings → API Keys
  - `BREVO_SENDER_EMAIL` (your verified email)
  - `BREVO_SENDER_NAME` (e.g. "Realty Engine")
- [ ] **Set webhook URL** in Brevo → Transactional → Webhooks → `https://estate-engine.vercel.app/api/messaging/email-webhook`
  - Events to track: delivered, opened, clicked, bounced, spam

### 1.6 Inngest (Background Jobs)
- [ ] Sign up at **inngest.com** (free tier)
- [ ] Create a new app called `realty-engine`
- [ ] Go to **Keys** → copy:
  - `INNGEST_EVENT_KEY`
  - `INNGEST_SIGNING_KEY`
- [ ] After deploying to Vercel, go to **Inngest → Syncs** → add your app URL:
  - `https://estate-engine.vercel.app/api/inngest`

### 1.7 PostHog (Analytics)
- [ ] Sign up at **posthog.com** (free — 1M events/month)
- [ ] Create a new project
- [ ] Copy:
  - `NEXT_PUBLIC_POSTHOG_KEY`
  - `NEXT_PUBLIC_POSTHOG_HOST` (usually `https://app.posthog.com`)

### 1.8 Ayrshare (Social Publishing)
- [ ] Sign up at **ayrshare.com** (~$29/month, or use free trial)
- [ ] Connect your social profiles (Instagram, Facebook, LinkedIn, Twitter)
- [ ] Copy: `AYRSHARE_API_KEY`
- [ ] Set `SOCIAL_PROVIDER=ayrshare` in env vars

### 1.9 Meta Business (Ads)
> Only needed when you're ready to run paid ads. Can skip for initial launch.
- [ ] Create a **Meta Business Manager** at business.facebook.com
- [ ] Create an **Ad Account** under your Business Manager
- [ ] Create a **Facebook App** at developers.facebook.com with `Marketing API` permissions
- [ ] Generate a **Long-Lived Access Token** with `ads_management` + `ads_read` scopes
- [ ] Copy:
  - `META_ACCESS_TOKEN`
  - `META_AD_ACCOUNT_ID` (format: `act_XXXXXXXXX`)
  - `META_PAGE_ID` (your Facebook page ID)

---

## Phase 2 — Vercel Deployment (30 minutes)

### 2.1 Initial Deploy
- [ ] Push code to GitHub: `git push origin main`
- [ ] Go to **vercel.com** → New Project → Import `nainasachdev10/estate-engine`
- [ ] Set **Root Directory** → `apps/web`
- [ ] Set **Build Command** → `cd ../.. && pnpm --filter @realty-engine/web build`
- [ ] Set **Install Command** → `cd ../.. && pnpm install`
- [ ] Click Deploy (it will fail without env vars — that's OK)

### 2.2 Add Environment Variables
Go to **Vercel → estate-engine → Settings → Environment Variables** and add ALL of these:

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Anthropic
ANTHROPIC_API_KEY=

# Bolna Voice
BOLNA_API_KEY=
BOLNA_AGENT_ID=
BOLNA_FROM_NUMBER=+91XXXXXXXXXX
BOLNA_WEBHOOK_SECRET=

# AiSensy WhatsApp
AISENSY_API_KEY=
AISENSY_SENDER_ID=
MESSAGING_ENABLED=true

# Brevo Email
BREVO_API_KEY=
BREVO_SENDER_EMAIL=
BREVO_SENDER_NAME=Realty Engine

# Inngest
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

# PostHog Analytics
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Social Publishing
SOCIAL_PROVIDER=ayrshare
AYRSHARE_API_KEY=

# Meta Ads (add when ready)
META_ACCESS_TOKEN=
META_AD_ACCOUNT_ID=
META_PAGE_ID=

# Security
INTERNAL_API_SECRET=<generate a random 32-char string e.g. openssl rand -base64 32>
APP_URL=https://estate-engine.vercel.app
```

- [ ] Click **Redeploy** after adding all env vars

### 2.3 Add INTERNAL_API_SECRET to your local .env.local
```bash
echo "INTERNAL_API_SECRET=same-value-as-vercel" >> apps/web/.env.local
```
This header is now required by `/api/creatives/generate` and `/api/social/generate`. The dashboard's "Generate" buttons automatically pass it — you only need it if calling the API directly.

---

## Phase 3 — Database Setup (15 minutes)

### 3.1 Install Supabase CLI
```bash
npm install -g supabase
supabase login
```

### 3.2 Link to your project
```bash
supabase link --project-ref YOUR_PROJECT_REF
# Find project ref in Supabase → Settings → General
```

### 3.3 Run all migrations
```bash
supabase db push
```

This creates all 6 migrations in order:
- `0001_init.sql` — core tables (clients, projects, leads, calls, messages, campaigns, social_posts, events)
- `0002_messaging.sql` — WhatsApp window, sequence tracking, wa_templates
- `0003_landing.sql` — landing page fields (hero_image_url, usp_bullets, public_slug, etc.)
- `0004_client_fields.sql` — client slug, brand_voice_notes, portal_allowed_emails
- `0005_social_external_id.sql` — social post external publishing ID
- `0006_fixes.sql` — phone uniqueness per-project (not global), wa_templates trigger

### 3.4 Seed demo data
Make sure `TEST_PHONE` is set in `apps/web/.env.local` first:
```bash
echo "TEST_PHONE=+91XXXXXXXXXX" >> apps/web/.env.local
pnpm seed
```

This creates:
- Client: **Orchid Developers** (portal: `/portal/orchid-developers`)
- Project 1: **The Crest, Worli** (luxury — landing page: `/p/the-crest-worli`)
- Project 2: **Skyline Heights, Pune** (premium — `/p/skyline-heights-pune`)
- Project 3: **Green Acres, Lonavala** (plot — `/p/green-acres-lonavala`)
- 3 test leads with your phone number

---

## Phase 4 — Inngest Sync (5 minutes)

- [ ] Go to **inngest.com** → your app → **Syncs**
- [ ] Click **Sync App** → enter URL: `https://estate-engine.vercel.app/api/inngest`
- [ ] You should see 5 functions registered:
  - `auto-call-new-lead`
  - `retry-no-answer-lead`
  - `start-qualified-sequence`
  - `start-no-answer-sequence`
  - `daily-report`
- [ ] The `daily-report` cron runs at **9:00am IST every day** automatically

---

## Phase 5 — Portal Setup for First Client (10 minutes)

### 5.1 Update the client's email in Supabase
The portal login verifies the user's email matches `clients.contact_email`.

Go to **Supabase → Table Editor → clients** and set:
- `contact_email` → the client's actual email address
- `slug` → a URL-friendly ID (e.g. `orchid-developers`)

Or update via SQL:
```sql
UPDATE clients 
SET contact_email = 'client@theircompany.com', slug = 'their-slug'
WHERE id = 'CLIENT_UUID';
```

### 5.2 Add additional portal users (optional)
If the client has multiple team members who need portal access:
```sql
UPDATE clients 
SET portal_allowed_emails = ARRAY['user1@company.com', 'user2@company.com']
WHERE id = 'CLIENT_UUID';
```

### 5.3 Test the portal login
1. Open `https://estate-engine.vercel.app/portal/their-slug`
2. Should redirect to login page
3. Enter the client's email → magic link arrives → click → you're in

---

## Phase 6 — WhatsApp Template Approval (async, 24–48 hours)

Submit these **before** expecting WhatsApp messages to send. While waiting for approval, the system will silently skip WhatsApp steps.

- [ ] Go to **AiSensy → Templates → New Template**
- [ ] Submit all 6 templates from `docs/whatsapp-templates.md`
- [ ] Once approved, run in Supabase:
```sql
UPDATE wa_templates SET approved = true WHERE name IN (
  'lead_intro_hi', 'lead_intro_en', 'brochure_followup',
  'site_visit_invite', 'callback_confirm', 'gentle_intro'
);
```

---

## Phase 7 — End-to-End Test (30 minutes)

Do this with your own phone number before going live with real leads.

### 7.1 Test lead intake
```bash
curl -X POST https://estate-engine.vercel.app/api/leads/intake \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Test Naina",
    "phone": "+91XXXXXXXXXX",
    "email": "you@email.com",
    "project_id": "PROJECT_UUID_FROM_SEED",
    "source": "manual"
  }'
```

Expected: `{"success":true,"leadId":"..."}` → your phone rings in ~2 minutes

### 7.2 Verify in Supabase
Check these tables are populated:
- `leads` — new row with status `new`, score `0`
- `events` — `lead_intake_success` event
- After the call: `call_logs` — transcript, outcome, score
- After the call: `leads` — status updated (contacted/qualified)
- If qualified: `messages` — WhatsApp brochure sent within 5 minutes

### 7.3 Test landing page
Open: `https://estate-engine.vercel.app/p/the-crest-worli`
- [ ] Page loads (luxury dark theme, gold accents)
- [ ] Fill form → submit → see "Aapko 2 minute mein call aayegi"
- [ ] Phone rings → have a conversation → hang up
- [ ] Check `/leads/[id]` in dashboard for transcript

### 7.4 Test ad creative generation
- [ ] Go to `https://estate-engine.vercel.app/projects/[project-id]/creatives`
- [ ] Click "Generate 10 Creatives" → wait 20–30s → 10 cards appear
- [ ] Copy a Meta ad → paste into Meta Ads Manager
- [ ] If `META_ACCESS_TOKEN` is set → click "🚀 Launch on Meta" on a meta campaign

### 7.5 Test social post generation
- [ ] Go to `/social`
- [ ] Select the Worli project → click "Generate 30 days of posts"
- [ ] Approve a few → if `AYRSHARE_API_KEY` is set, they'll schedule to your connected profiles

### 7.6 Test bulk upload
- [ ] Go to `/bulk-upload`
- [ ] Download the template CSV
- [ ] Fill in 3 rows with your own phone number (or test numbers)
- [ ] Upload → should show `3 imported`
- [ ] Calls trigger within 2 minutes

---

## Phase 8 — Going Live with First Client (checklist)

Before handing the portal URL to a paying client:

- [ ] Client's `contact_email` is set in Supabase
- [ ] Client's `slug` is set (URL-friendly, lowercase, hyphens)
- [ ] At least 1 project created with `public_slug`, `hero_image_url`, `usp_bullets`, `rera_number`
- [ ] WhatsApp templates approved by Meta
- [ ] Bolna agent tested end-to-end with the actual project name/price
- [ ] Daily report email tested (trigger manually via Inngest dashboard)
- [ ] Slack webhook URL set on client row for hot-lead alerts (optional)
- [ ] Portal login tested with client's email

---

## What Still Needs Manual Work (Known Limitations)

These are not bugs — they require human action or are planned for a future sprint.

| Item | Status | What to do |
|---|---|---|
| Google Ads API | Not wired | Generate copy via Claude, manually upload to Google Ads. Full API integration in week 4. |
| 99acres listing | Claude generates copy | Manually paste into 99acres portal. |
| RLS (Row Level Security) | Permissive for now | Tighten in Supabase after multi-client testing. Add per-client policies. |
| Supabase-generated TypeScript types | Not using | Run `supabase gen types typescript` to get full type safety. Paste into `packages/core/src/db.ts`. |
| CSV upload batching | Sequential (up to 500) | For >500 leads, split CSV into 500-row chunks. Parallel batching in week 4. |
| WhatsApp broadcast to old leads | Not built | Use AiSensy's Campaign tool for one-time blasts to existing leads. |
| DND (Do-Not-Disturb) check | Not implemented | Integrate TRAI DND registry via Exotel/Plivo before calling cold lists. Required for compliance. |
| GDPR / NRI leads | Not implemented | Add data export + delete endpoints if you serve NRI buyers (UK/EU). |
| Supabase auth on internal dashboard | Only portal has auth | The internal `/` dashboard is currently unprotected. For multi-operator use, add Supabase auth to the `(dashboard)` layout. |

---

## Quick Reference: All URLs

| URL | What it is |
|---|---|
| `https://estate-engine.vercel.app/` | Internal pipeline dashboard |
| `https://estate-engine.vercel.app/leads` | All leads across all clients |
| `https://estate-engine.vercel.app/leads/[id]` | Lead detail with call transcripts + messages |
| `https://estate-engine.vercel.app/bulk-upload` | CSV upload (triggers voice calls) |
| `https://estate-engine.vercel.app/projects` | All projects |
| `https://estate-engine.vercel.app/projects/[id]/creatives` | Generate ad copy with Claude |
| `https://estate-engine.vercel.app/social` | Generate + approve 30-day social calendar |
| `https://estate-engine.vercel.app/campaigns` | All ad campaigns |
| `https://estate-engine.vercel.app/health` | System health (errors, pending leads) |
| `https://estate-engine.vercel.app/p/the-crest-worli` | Luxury landing page (demo) |
| `https://estate-engine.vercel.app/p/skyline-heights-pune` | Premium landing page |
| `https://estate-engine.vercel.app/p/green-acres-lonavala` | Plot landing page |
| `https://estate-engine.vercel.app/portal/orchid-developers` | Client portal (magic link auth) |
| `https://estate-engine.vercel.app/portal/[slug]/leads` | Client's lead pipeline |
| `https://estate-engine.vercel.app/portal/[slug]/projects` | Client's projects |
| `https://estate-engine.vercel.app/portal/[slug]/projects/[id]` | Project performance |

## Quick Reference: All Webhook URLs (set in each provider's dashboard)

| Provider | Webhook URL |
|---|---|
| Bolna (post-call) | `https://estate-engine.vercel.app/api/voice/webhook` |
| AiSensy (inbound WhatsApp) | `https://estate-engine.vercel.app/api/messaging/whatsapp-webhook` |
| Brevo (email events) | `https://estate-engine.vercel.app/api/messaging/email-webhook` |
| Inngest (background jobs) | `https://estate-engine.vercel.app/api/inngest` |

---

## Estimated Monthly Costs at 1 Client, 200 leads/month

| Service | Cost |
|---|---|
| Vercel (hobby) | Free |
| Supabase | Free |
| Anthropic Claude | ~$10–20 (100 calls × classification + drip messages) |
| Bolna voice | ~₹1,000–2,000 (200 calls × avg 3 min × ₹2/min) |
| AiSensy | ₹999/month |
| Brevo | Free (up to 300 emails/day) |
| Inngest | Free |
| PostHog | Free |
| Ayrshare | ~$29/month |
| **Total** | **~₹5,000–8,000/month** |

**Revenue:** ₹50,000–1,00,000/client/month. **Margin at 1 client: ~85%.**
