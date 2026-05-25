# Realty Engine — Setup Guide

Complete setup reference. Work through each section in order. Section 1 is the only mandatory step; everything else unlocks progressively.

---

## 1. Core Infrastructure (Required — nothing works without this)

### Supabase
1. Create a project at [supabase.com](https://supabase.com)
2. Settings → API → copy three values:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
3. Run all migrations from `/supabase/migrations/` in order via Supabase SQL editor

### Admin access
Set which email addresses get access to the operator dashboard:
```
ADMIN_EMAILS=you@yourdomain.com,colleague@yourdomain.com
```
These must be Supabase Auth users. After first login they'll be routed to `/pipeline` automatically.

### Supabase Auth — Google OAuth
1. Supabase Dashboard → Authentication → Providers → Google → Enable
2. Create a Google Cloud project at console.cloud.google.com
3. APIs & Services → Credentials → Create OAuth 2.0 Client ID (Web)
4. Authorised redirect URI: `https://[your-supabase-project].supabase.co/auth/v1/callback`
5. Copy Client ID and Secret into Supabase Google provider settings

### App URL
```
# Local dev
APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Production (Vercel)
APP_URL=https://your-app.vercel.app
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
```

### Internal API secret (protects Claude-burning routes)
Generate a random 32-character string and set **both**:
```
INTERNAL_API_SECRET=your-random-32-char-string
NEXT_PUBLIC_INTERNAL_API_SECRET=your-random-32-char-string
```
These must match exactly.

---

## 2. AI Brain (Claude — ad creatives + social posts)

Already set if you have `ANTHROPIC_API_KEY`. Verify it's in your env:
```
ANTHROPIC_API_KEY=sk-ant-...
```
Once set: Projects → Creatives → "Generate 10 Creatives" works. Social → "Generate 30 Posts" works.

---

## 3. Voice AI (Bolna — Hinglish auto-calling)

### Required env vars
```
BOLNA_API_KEY=your_bolna_api_key
BOLNA_AGENT_ID=your_agent_id
BOLNA_FROM_NUMBER=+91XXXXXXXXXX
BOLNA_WEBHOOK_SECRET=your_webhook_secret   # optional but recommended
```

### Bolna dashboard setup
1. [app.bolna.dev](https://app.bolna.dev) → Create a Hinglish agent
2. Agent script should use these variables (passed per call):
   - `{{lead_name}}`, `{{project_name}}`, `{{project_location}}`
   - `{{price_range}}`, `{{key_amenities}}`, `{{client_brand}}`
3. Copy Agent ID into `BOLNA_AGENT_ID`

### Webhook (for transcripts + auto-scoring)
In Bolna dashboard → Webhook URL:
```
https://your-app.vercel.app/api/voice/webhook
```
After each call, Bolna posts the transcript here. Claude reads it, updates the lead score, and logs the call.

---

## 4. WhatsApp (AiSensy)

### Required env vars
```
AISENSY_API_KEY=your_key
AISENSY_SENDER_ID=your_sender_id
```

### AiSensy setup
1. Sign up at [aisensy.com](https://aisensy.com)
2. Connect a WhatsApp Business number (requires Meta Business Manager)
3. Create a message template — must be approved by Meta (takes 24–48h)
   - Template category: MARKETING
   - Template name: `lead_followup` (or update the code to match your name)
4. Get API Key from AiSensy dashboard → Settings → API
5. Sender ID is your WhatsApp Business number in E.164 format

### Inbound webhook (for reply tracking)
AiSensy dashboard → Developer → Webhook URL:
```
https://your-app.vercel.app/api/messaging/whatsapp-webhook
```

---

## 5. Email (Brevo)

### Required env vars
```
BREVO_API_KEY=your_key
BREVO_SENDER_EMAIL=noreply@yourdomain.com
BREVO_SENDER_NAME=Realty Engine
```

### Brevo setup
1. Sign up at [brevo.com](https://brevo.com) — free tier: 300 emails/day
2. Settings → API Keys → Generate new key
3. Senders → Add and verify a sender email address
4. (Optional) Configure your sending domain for better deliverability

---

## 6. Social Media Scheduling (Ayrshare)

### Required env vars
```
AYRSHARE_API_KEY=your_key
SOCIAL_PROVIDER=ayrshare
```

### Ayrshare setup
1. Sign up at [ayrshare.com](https://ayrshare.com)
2. Connect social accounts: Instagram, Facebook, LinkedIn, Twitter
3. API → copy your API Key
4. Once connected: Social Calendar → Generate Posts → Approve → posts publish on schedule

---

## 7. Meta Ads (Launch campaigns directly)

### Required env vars
```
META_ACCESS_TOKEN=your_long_lived_token
META_AD_ACCOUNT_ID=act_XXXXXXXXX
META_PAGE_ID=your_facebook_page_id
```

### Meta setup
1. [developers.facebook.com](https://developers.facebook.com) → My Apps → create or use existing app
2. Add product: Marketing API
3. Generate a long-lived User Access Token with permissions:
   - `ads_management`, `ads_read`, `pages_read_engagement`
4. Business Manager → Ad Accounts → copy your Ad Account ID (format: `act_123456`)
5. Find Page ID: Facebook Page → About → scroll to Page ID
6. Campaigns launch **PAUSED** — review in Meta Ads Manager before going live

---

## 8. Auto-calling Queue (Inngest)

Inngest fires the auto-call 90 seconds after a lead submits a form. Without it, the Call button on the kanban still works manually.

### Required env vars
```
INNGEST_EVENT_KEY=your_event_key
INNGEST_SIGNING_KEY=your_signing_key
```

### Inngest setup
1. Sign up at [inngest.com](https://inngest.com) — generous free tier
2. Create an app → get Event Key and Signing Key
3. Configure webhook in Inngest dashboard:
   ```
   https://your-app.vercel.app/api/inngest
   ```

---

## 9. Client Portal Setup

Each real estate developer client gets a branded read-only portal at `/portal/[slug]`.

1. In Supabase → `clients` table, add a row for the developer:
   - `name`: Developer company name
   - `brand_name`: Display name (optional)
   - `slug`: URL slug (e.g., `prestige-group`)
   - `contact_email`: Primary client email
   - `portal_allowed_emails`: Array of additional emails that can view the portal
2. Client logs in at `/login` with their email → automatically routed to their portal
3. They see: pipeline summary, call stats, lead counts, project breakdown

---

## 10. Vercel Deployment

### Environment variables to set in Vercel
Add all variables from sections 1–9 under Project → Settings → Environment Variables.

The minimum set to go live:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
INTERNAL_API_SECRET
NEXT_PUBLIC_INTERNAL_API_SECRET
APP_URL
NEXT_PUBLIC_SITE_URL
ADMIN_EMAILS
```

### Supabase Auth redirect URLs
Supabase Dashboard → Authentication → URL Configuration:
- **Site URL**: `https://your-app.vercel.app`
- **Redirect URLs** (add both):
  ```
  https://your-app.vercel.app/**
  http://localhost:3000/**
  ```

---

## Feature Status Reference

| Feature | Works Now | What's Needed |
|---|---|---|
| Lead pipeline (kanban + table) | ✅ | — |
| Lead scoring (display) | ✅ | — |
| Bulk lead upload | ✅ | — |
| Analytics dashboard | ✅ | — |
| Client portal | ✅ | Add client row in Supabase |
| Manual voice call trigger | ✅ | Bolna keys already set |
| AI ad creative generation | ✅ | Anthropic key already set |
| AI social post generation | ✅ | Anthropic key already set |
| Auto-call on lead arrival | ⚠️ | Inngest setup (§8) |
| Call transcripts + scoring | ⚠️ | Bolna webhook (§3) |
| WhatsApp drip | ⚠️ | AiSensy setup (§4) |
| Email drip | ⚠️ | Brevo setup (§5) |
| Social publishing | ⚠️ | Ayrshare setup (§6) |
| Meta campaign launch | ⚠️ | Meta API setup (§7) |

---

## Quick Local Dev Checklist

```bash
# 1. Copy env
cp .env.example apps/web/.env.local
# Fill in at minimum: SUPABASE keys, ANTHROPIC_API_KEY, APP_URL=http://localhost:3000

# 2. Install
pnpm install

# 3. Run migrations
# Paste each file from /supabase/migrations/ into Supabase SQL editor

# 4. Start dev server
cd apps/web && pnpm dev

# 5. Open http://localhost:3000
```
