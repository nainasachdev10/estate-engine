# Realty Engine — Production Setup Guide

This guide walks you through going live with the Realty Engine platform, from creating
accounts to activating your first client project. It is written for a non-technical founder
working through this step-by-step. Expect the full setup to take 1-2 days of calendar time
(mostly waiting for approvals and DNS propagation).

**Start Phase 2 (Meta App Review) first** — it is the longest blocker at 3-7 business days.
You can work on everything else while you wait.

---

## Phase 1: Create accounts and collect keys (1-2 hours)

Work through these in order. Keep a scratchpad open — you will copy API keys into your
`.env` file at the end of this phase.

### Supabase (database)

- [ ] Go to [supabase.com](https://supabase.com) and create a free account
- [ ] Click **New project** — choose a region close to India (Singapore is closest)
- [ ] Set a strong database password and save it somewhere secure
- [ ] Once the project is ready, go to **Settings → API**
- [ ] Copy these three values into your scratchpad:
  - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
  - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

> The `service_role` key is powerful — it bypasses row-level security. Never expose it in
> frontend code. It lives only in server-side environment variables.

### Anthropic (Claude AI — content brain)

- [ ] Go to [console.anthropic.com](https://console.anthropic.com) and create an account
- [ ] Add a payment method and load at least **$5 credit** (required before API calls work)
- [ ] Go to **API Keys → Create key**
- [ ] Copy the key → `ANTHROPIC_API_KEY`

### Bolna (voice agent)

- [ ] Go to [platform.bolna.ai](https://platform.bolna.ai) and sign up
- [ ] Purchase the **$150 credit pack** — this covers India routing and Hinglish TTS via Sarvam
- [ ] Create a new agent using the Hinglish script in `/scripts/bolna-agent-script.txt`
- [ ] Copy from your agent dashboard:
  - API key → `BOLNA_API_KEY`
  - Agent ID → `BOLNA_AGENT_ID`
  - Assigned outbound number → `BOLNA_FROM_NUMBER` (format: `+91XXXXXXXXXX`)
- [ ] In Bolna webhook settings, set your webhook URL to:
  `https://your-app.vercel.app/api/voice/webhook`
- [ ] Generate a webhook secret → `BOLNA_WEBHOOK_SECRET`

### AiSensy (WhatsApp)

- [ ] Go to [aisensy.com](https://aisensy.com) and sign up for the **Pro plan** (approx ₹3,200/mo)
- [ ] Connect your WhatsApp Business number during onboarding
- [ ] Go to **Settings → API** and copy:
  - API key → `AISENSY_API_KEY`
  - Sender ID (your WhatsApp number) → `AISENSY_SENDER_ID`
- [ ] Set your webhook URL in AiSensy to: `https://your-app.vercel.app/api/messaging/whatsapp-webhook`
- [ ] Generate a webhook secret → `AISENSY_WEBHOOK_SECRET`

> Template approval takes 24-48 hours per template (see Phase 3 for the full list).

### Brevo (email)

- [ ] Go to [brevo.com](https://brevo.com) and sign up for the **Starter plan** (approx ₹1,345/mo)
- [ ] Go to **SMTP & API → API Keys → Create a new API key**
- [ ] Copy the key → `BREVO_API_KEY`
- [ ] Set `BREVO_SENDER_EMAIL` to a verified email on your domain (e.g. `hello@yourcompany.com`)
- [ ] Set `BREVO_SENDER_NAME` to your company or brand name
- [ ] In Brevo **Settings → Webhooks**, add: `https://your-app.vercel.app/api/messaging/email-webhook`
  and note the shared secret → `BREVO_WEBHOOK_TOKEN`

### Higgsfield (AI image + video generation)

- [ ] Go to [higgsfield.ai](https://higgsfield.ai) and sign up for the **Plus plan** ($49/mo)
- [ ] Go to **Settings → API** and create an API key → `HIGGSFIELD_API_KEY`

### Vercel (hosting)

- [ ] Go to [vercel.com](https://vercel.com) and sign up for the **Pro plan** ($20/mo)
- [ ] Connect your GitHub account and import the `estate-engine` repository
- [ ] Do not deploy yet — you need keys in place first (covered in Phase 4)

### Inngest (workflow orchestration)

- [ ] Go to [inngest.com](https://inngest.com) and create a free account
- [ ] Go to your dashboard and create a new app
- [ ] Copy:
  - Event key → `INNGEST_EVENT_KEY`
  - Signing key → `INNGEST_SIGNING_KEY`
- [ ] The free tier is fine to start — upgrade once you have more than 10 concurrent projects

### PostHog (analytics — optional but recommended)

- [ ] Go to [posthog.com](https://posthog.com) and create a free account
- [ ] Create a project and copy:
  - Project API key → `NEXT_PUBLIC_POSTHOG_KEY`
  - Leave `NEXT_PUBLIC_POSTHOG_HOST` as `https://app.posthog.com` unless you self-host

### Meta Business Manager

- [ ] Go to [business.facebook.com](https://business.facebook.com) and create a Business Manager account
- [ ] Add your Facebook Page and Instagram Business account to the Business Manager
- [ ] Verify your business (Settings → Business verification) — this is required for ad spend and API access
- [ ] Note down your **Ad Account ID** (format: `act_XXXXXXXXX`) → `META_AD_ACCOUNT_ID`
- [ ] Note down your **Facebook Page ID** → `META_PAGE_ID`
- [ ] Note down your **Instagram Business Account ID** (found in Instagram settings → Account → About) → `META_IG_BUSINESS_ID`

---

## Phase 2: Meta App Review (3-7 business days — start this immediately)

This is the longest step. Start it before anything else so it runs in parallel.

- [ ] Go to [developers.facebook.com](https://developers.facebook.com) and create a developer account
- [ ] Click **My Apps → Create App**
  - App type: **Business**
  - App name: `Realty Engine` (or your brand)
  - Business Manager: connect the one you created in Phase 1
- [ ] Add these products to your app from the dashboard:
  - [ ] **Marketing API**
  - [ ] **Webhooks**
  - [ ] **Instagram Graph API**
  - [ ] **Pages API**
- [ ] Go to **App Review → Permissions and Features** and request:
  - [ ] `ads_management`
  - [ ] `instagram_content_publish`
  - [ ] `pages_manage_posts`
  - [ ] `pages_read_engagement`
  - [ ] `leads_retrieval`
  - [ ] `business_management`
- [ ] For each permission, fill in the use-case description (the reviewer needs to know you are building a
  CRM for real estate developers to manage their own pages)
- [ ] Submit for App Review — allow 3-7 business days

**While you wait for approval**, you can still test using your own developer account:
- Your personal Facebook and Instagram profiles automatically have test access
- Organic posting to your own FB Page and IG account will work
- Lead Ads and Ads Management require approved access before they work with client accounts

**After approval:**
- [ ] Go to **Tools → Graph API Explorer**
- [ ] Select your app and your Facebook Page
- [ ] Click **Generate Access Token** → select your Page → check all permissions
- [ ] Click **Open in Access Token Tool** → **Extend Access Token**
- [ ] Copy the long-lived page token → `META_PAGE_ACCESS_TOKEN`

> Long-lived page tokens for Business Pages do not expire. Personal tokens expire in 60 days.

**Set up the Meta App settings for webhooks:**
- [ ] Go to **Webhooks** in your app dashboard
- [ ] Subscribe to the `leadgen` object
- [ ] Callback URL: `https://your-app.vercel.app/api/leads/meta-lead-ads-webhook`
- [ ] Verify token: pick any secret string and set it as `META_WEBHOOK_VERIFY_TOKEN`
  (use the same string in both Meta and your `.env`)
- [ ] Copy your **App Secret** from **Settings → Basic** → `META_APP_SECRET`

---

## Phase 3: Per-client setup (2-5 days, mostly waiting for approvals)

Do this for each real estate developer client you onboard.

### Bolna agent

- [ ] Either reuse your shared agent or create a client-specific agent in Bolna with their project details
- [ ] Update the agent prompt with the client's project name, unit types, price range, and site address
- [ ] Test a call to your own number before going live

### AiSensy — WhatsApp templates

You need 6 templates approved before sending any automated messages. They are already
seeded (unapproved) in the `wa_templates` table by migration `0002_messaging.sql` — submit
each one via **AiSensy → Templates → New Template** using the exact name and body below.
Expect 24-48 hours per template. Once Meta approves a template, set `approved = true` for
that row in `wa_templates`.

- [ ] **lead_intro_hi** — first contact after a lead enquires (Hinglish)
  - Category: Utility | Language: Hindi
  - Body: "Namaste {{1}}, {{2}} ki taraf se main bol rahi hun. Aapne {{3}} ke baare mein enquire kiya tha. Bohot shukriya! Kya main aapko quick brochure bhej sakti hun? Reply *YES* karein."
- [ ] **lead_intro_en** — first contact after a lead enquires (English)
  - Category: Utility | Language: English
  - Body: "Hi {{1}}, this is {{2}} from {{3}}. You had enquired about {{4}} — thank you! Can I send you a quick brochure? Reply *YES* to receive it."
- [ ] **brochure_followup** — sends the project brochure link
  - Category: Utility | Language: Hindi
  - Body: "Namaste {{1}} ji! Yahan {{2}} ka brochure hai: {{3}} — Agar koi bhi sawaal ho toh zaroor poochein!"
- [ ] **site_visit_invite** — invites the lead to book a site visit
  - Category: Marketing | Language: Hindi
  - Body: "Hi {{1}}, kya aap is weekend {{2}} site visit ke liye available hain? {{3}} mein ek brand new model flat ready hai dekhne ke liye. Reply *YES* ya apna preferred time batayein."
- [ ] **callback_confirm** — confirms a requested callback time
  - Category: Utility | Language: Hindi
  - Body: "Namaste {{1}} ji, {{2}} ki taraf se — humne note kar liya hai ki aap {{3}} pe baat karna chahte hain. Hum tab call karenge. Shukriya!"
- [ ] **gentle_intro** — softer re-engagement intro
  - Category: Utility | Language: Hindi
  - Body: "Namaste {{1}} ji! Main {{2}} ki taraf se bol rahi hun. Aapne {{3}} mein property ke baare mein interest dikhaya tha. Koi bhi sawaal ho toh main yahan hun — reply karein!"

### Brevo — domain verification and IP warm-up

- [ ] In Brevo **Settings → Senders & IP → Authenticate a domain**, add DNS records for your domain
- [ ] DNS changes take up to 24 hours to propagate
- [ ] For the first 2 weeks, keep daily email volume under 500 to avoid spam filters (IP warm-up)

### Meta — connect client Instagram

- [ ] In Meta Business Manager, go to **Accounts → Instagram accounts**
- [ ] Add the client's Instagram Business account
- [ ] Assign it to your app so `META_IG_BUSINESS_ID` can be used for posting on their behalf
- [ ] Confirm the client's Facebook Page is also connected

---

## Phase 4: Code deployment

- [ ] Clone the repository:
  ```bash
  git clone https://github.com/your-org/estate-engine.git
  cd estate-engine
  ```
- [ ] Install dependencies:
  ```bash
  pnpm install
  ```
- [ ] Copy the environment file template:
  ```bash
  cp .env.example .env.local
  ```
- [ ] Open `.env.local` and fill in every key from your Phase 1-3 scratchpad
- [ ] Run all database migrations against your Supabase project. Two options:

  **Option A — Supabase CLI (recommended):**
  ```bash
  npx supabase login
  npx supabase link --project-ref your-project-ref
  npx supabase db push
  ```

  **Option B — copy-paste via SQL Editor:**
  - Open your Supabase project → SQL Editor
  - Run each file in order:
    - `supabase/migrations/0001_init.sql`
    - `supabase/migrations/0002_messaging.sql`
    - `supabase/migrations/0003_landing.sql`
    - `supabase/migrations/0004_client_fields.sql`
    - `supabase/migrations/0005_social_external_id.sql`
    - `supabase/migrations/0006_fixes.sql`
    - `supabase/migrations/0007_client_portal_fields.sql`
    - `supabase/migrations/0008_project_extended.sql`
    - `supabase/migrations/0009_client_credentials.sql`
    - `supabase/migrations/0010_call_score_delta.sql`
    - `supabase/migrations/0011_ad_media_webhooks.sql`
    - `supabase/migrations/0012_language_expand.sql`

- [ ] Test locally before deploying:
  ```bash
  pnpm --filter web dev
  ```
  Open [http://localhost:3000](http://localhost:3000) — you should see the login screen.

- [ ] Add environment variables to Vercel:
  - Go to your Vercel project → **Settings → Environment Variables**
  - Add every key from `.env.local` (mark secrets as **Encrypted**)
  - Set `NODE_ENV=production`
  - Set `APP_URL` and `NEXT_PUBLIC_SITE_URL` to your final Vercel URL (e.g. `https://realty-engine.vercel.app`)

- [ ] Deploy to production:
  ```bash
  vercel --prod
  ```

- [ ] After deploy, test webhook signature verification by triggering a test lead from Bolna's dashboard.
  Check the **Supabase → Table Editor → events** table to confirm the event was logged.

---

## Phase 5: Per-project activation

Once you have added a client and project in the dashboard:

- [ ] Go to **Dashboard → Projects** and click **Add Project** — fill in all project details
  (name, location, unit type, price range, amenities, brochure URL, site address)
- [ ] Click **Activate project** on the project card

When activated, Inngest automatically triggers this workflow:
1. Claude generates 10 ad copy variants (headlines + body)
2. Higgsfield generates a hero image for each variant
3. Higgsfield generates a 15-second video for the top 3 variants
4. All creatives land in the **Creatives** tab within 10-15 minutes

- [ ] Go to the **Creatives** tab and review each generated creative
- [ ] For creatives you want to run as paid ads:
  - [ ] Click **Launch on Meta** — this creates the campaign in Meta Ads Manager as **PAUSED**
  - [ ] Go to [Meta Ads Manager](https://adsmanager.facebook.com) to set your budget, audience,
    and flip the campaign live
- [ ] For organic social posts:
  - [ ] Go to the **Social** tab
  - [ ] Schedule posts by clicking the post card and selecting a publish date/time
  - [ ] Posts publish automatically at the scheduled time via the configured `SOCIAL_PROVIDER`

---

## Phase 6: Monitor ongoing operations

### Health check

- [ ] Visit `https://your-app.vercel.app/health` after every deploy
  - Green across all rows = system healthy
  - Any red row = a service is misconfigured or unreachable

### Analytics

- [ ] `https://your-app.vercel.app/analytics` — lead funnel, voice call outcomes,
  WhatsApp/email open rates, top-performing creatives

### Inngest workflow dashboard

- [ ] Log into [app.inngest.com](https://app.inngest.com)
- [ ] Check the **Functions** tab for failed runs — each failure has a full stack trace and retry history
- [ ] Common failure reasons: expired API tokens, rate limits, Supabase connection timeouts

### Supabase logs

- [ ] Log into your Supabase project → **Logs → API logs**
- [ ] Filter by `500` errors to catch any DB or API route failures
- [ ] The `events` table stores every external API call (voice, WhatsApp, email, Meta) with status

---

## Monthly costs (approximate)

This is what to expect at steady state running one active client project.

| Service | Plan | Cost |
|---|---|---|
| Supabase | Pro | $25/mo (~₹2,100) |
| Anthropic | Pay-as-you-go | ~$20/mo (~₹1,680) |
| Bolna | Usage-based | ~$50/mo (~₹4,200) |
| AiSensy | Pro | ₹3,200/mo |
| Brevo | Starter | ₹1,345/mo |
| Higgsfield | Plus | $49/mo (~₹4,100) |
| Vercel | Pro | $20/mo (~₹1,680) |
| Inngest | Free | ₹0 |
| Meta ad spend | Variable | set your own budget |

**Total platform cost (without ad spend): ~₹18,000-20,000/mo**

If you add Ayrshare for social publishing instead of Meta direct:
| Ayrshare | Agency | $299/mo (~₹25,000) |

That pushes the total to approximately ₹43,000-46,000/mo.
The default config (`SOCIAL_PROVIDER=meta`) avoids this cost entirely.

---

## Common problems and fixes

### Bolna calls are not dialling within 60 seconds of a lead arriving

- Check that `INNGEST_EVENT_KEY` is set correctly in Vercel environment variables
- Check the Inngest dashboard for a failed `lead/created` function run — the error message
  will tell you whether it is an auth issue or a Bolna API error
- Bolna calls India numbers only — confirm `BOLNA_FROM_NUMBER` is a registered Indian outbound number

### Instagram posts fail with "not authorised"

- Meta Content Publishing API requires the image URL to be publicly accessible
- If you are hosting images in Supabase Storage, confirm the bucket policy is set to **public**
- Confirm `META_IG_BUSINESS_ID` is the numeric Instagram Business Account ID, not your @handle
- Confirm the Instagram account is connected to your Facebook Page in Business Manager

### Meta Lead Ads webhook is not receiving leads

- Confirm the Meta App webhook subscription is active (in your app dashboard → Webhooks → leadgen object)
- Confirm `META_WEBHOOK_VERIFY_TOKEN` in your `.env` exactly matches the verify token you entered
  in the Meta webhook subscription form
- The webhook URL must be HTTPS and publicly reachable — localhost will not work;
  use a Vercel preview deployment for testing
- After setting up, trigger a test lead from Meta's **Lead Ads Testing Tool**:
  [developers.facebook.com/tools/lead-ads-testing](https://developers.facebook.com/tools/lead-ads-testing)

### AiSensy messages fail after the first template message

- Free-form (session) messages are only allowed within the 24-hour customer service window
- If a lead has not replied within 24 hours, you must use an approved template
- Confirm `AISENSY_SESSION_CAMPAIGN` matches the exact campaign name in your AiSensy dashboard
- AiSensy may pass the webhook secret in a different header depending on their version —
  confirm with AiSensy support which header they use if signature verification fails

### Brevo emails are going to spam

- Complete domain authentication first (DNS records in Brevo settings)
- Keep daily volume under 500 for the first two weeks (IP warm-up)
- Do not send to unverified or purchased email lists — this will get your account flagged

### TypeScript build fails after pulling new code

- Run `pnpm install` after any `git pull` — new workspace packages may have been added
- The `packages/content` package depends on `packages/messaging` via a workspace symlink
  that is created by `pnpm install`

---

## Quick reference: environment variable checklist

Before going live, confirm every value in `.env.example` is filled in your Vercel
environment variables. The **Settings → Platform** page in the dashboard shows a live
checklist of every required and optional variable, grouped by integration, with a
configured/missing status for each.

```
NEXT_PUBLIC_SUPABASE_URL              from Supabase → Settings → API
NEXT_PUBLIC_SUPABASE_ANON_KEY         from Supabase → Settings → API
SUPABASE_SERVICE_ROLE_KEY             from Supabase → Settings → API
ANTHROPIC_API_KEY                     from console.anthropic.com
BOLNA_API_KEY                         from platform.bolna.ai
BOLNA_AGENT_ID                        from your Bolna agent page
BOLNA_FROM_NUMBER                     registered outbound number in Bolna
BOLNA_WEBHOOK_SECRET                  set in Bolna webhook config
AISENSY_API_KEY                       from AiSensy → Settings → API
AISENSY_SENDER_ID                     your WhatsApp Business number
AISENSY_WEBHOOK_SECRET                set in AiSensy webhook config
BREVO_API_KEY                         from Brevo → API Keys
BREVO_SENDER_EMAIL                    verified sender on your domain
BREVO_SENDER_NAME                     display name for outbound email
HIGGSFIELD_API_KEY                    from higgsfield.ai → Settings → API
META_ACCESS_TOKEN                     system user token from Meta Business Manager
META_AD_ACCOUNT_ID                    format: act_XXXXXXXXX
META_PAGE_ID                          your Facebook Page numeric ID
META_PAGE_ACCESS_TOKEN                long-lived page token from Graph API Explorer
META_IG_BUSINESS_ID                   numeric Instagram Business Account ID
META_APP_SECRET                       from Meta App → Settings → Basic
META_WEBHOOK_VERIFY_TOKEN             any string you choose; must match Meta webhook config
INNGEST_EVENT_KEY                     from Inngest dashboard
INNGEST_SIGNING_KEY                   from Inngest dashboard
SOCIAL_PROVIDER                       mock | postiz | ayrshare | meta
APP_URL                               your Vercel production URL
NEXT_PUBLIC_SITE_URL                  same as APP_URL
ADMIN_EMAILS                          comma-separated admin email addresses
NEXT_PUBLIC_POSTHOG_KEY               from PostHog project settings
NEXT_PUBLIC_POSTHOG_HOST              https://app.posthog.com
NODE_ENV                              production
INTERNAL_API_SECRET                   random 32-byte hex string
NEXT_PUBLIC_INTERNAL_API_SECRET       same value as INTERNAL_API_SECRET

# Optional
SARVAM_API_KEY                        from sarvam.ai (multilingual STT/TTS)
SLACK_WEBHOOK_URL                     Slack incoming webhook for stuck-lead alerts
BREVO_WEBHOOK_TOKEN                   optional shared secret to verify inbound Brevo events
AYRSHARE_API_KEY                      only if SOCIAL_PROVIDER=ayrshare
POSTIZ_API_KEY / POSTIZ_API_URL       only if SOCIAL_PROVIDER=postiz
```

> Per-project Meta Lead Ads routing does not use an env var — set `external_campaign_id`
> (auto-filled by "Launch on Meta") or `Lead form ID` (editable on each campaign card)
> per campaign in the dashboard so incoming leads are routed to the right project.

---

*For questions or issues during setup, open a GitHub issue or message the dev team directly.*
