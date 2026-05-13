# Prompt 04 — Lead Generator (Landing Pages + Ad Creative Engine)

> Run after Prompt 03. This module fills the top of the funnel: Claude writes the ads, Next.js renders the landing pages, both feed the same `/api/leads/intake` we built in Prompt 01.

---

## Task

Build:
1. Three landing-page templates (luxury, premium, plot) that any project can render in 5 minutes
2. An ad creative generator that produces Meta + Google ad copy variants
3. A simple campaigns dashboard

Read `CLAUDE.md`. Stay within the existing structure.

### 1. Landing pages

Create dynamic route `apps/web/app/p/[slug]/page.tsx`. The slug maps to a `projects.public_slug` column (add this in a new migration `0002_landing.sql` — also add `hero_image_url`, `gallery_urls text[]`, `floor_plan_urls text[]`, `usp_bullets text[]`, `developer_about text`, `rera_number`).

Three layout variants chosen by `projects.segment`:

- **Luxury** (₹10Cr+) — Full-bleed dark hero with cinematic image, serif typography, gold dividers, virtual tour CTA, "Schedule private viewing" form. Inspired by the Trump Towers pitch aesthetic.
- **Premium** (₹2-10Cr) — Split hero, modern sans-serif, amenities grid, EMI calculator widget, "Book site visit" form.
- **Plot/Affordable** (<₹2Cr) — Bright, value-forward, big price callout, savings math, WhatsApp-prominent CTA ("Get quote on WhatsApp").

All three share:
- A `<LeadForm />` component with fields: name, phone (with +91 lock), email (optional), preferred contact time, preferred channel (WhatsApp/Call). Posts to `/api/leads/intake` with `source: 'landing'`, `source_meta: { slug, utm_source, utm_medium, utm_campaign, utm_content }`.
- After submit: shows a thank-you with "Aapko 2 minute mein call aayegi" + a WhatsApp deep link to the client's business number.
- PostHog event `landing_view`, `lead_form_submit`, `lead_form_success`.
- Pixel placeholders for Meta and Google (env-driven IDs per client).

Use Tailwind + shadcn. Make the luxury variant genuinely beautiful — this is what wins the demo.

### 2. Ad creative generator

Create `apps/web/app/(dashboard)/projects/[id]/creatives/page.tsx`. The page has a "Generate creatives" button. Clicking it:

1. POSTs to `/api/creatives/generate` with the project id
2. Server route calls Claude with the prompt at `packages/content/src/prompts/generate-ad-creatives.ts`
3. Claude returns JSON with **10 variants**:
   - 3 Meta single-image ad copies (primary text + headline + description)
   - 3 Meta video ad scripts (15s, 30s, 60s — what should be on screen + voiceover)
   - 2 Google Search responsive ads (headlines + descriptions following Google's character limits)
   - 1 Google Display ad copy
   - 1 99acres listing description
4. All variants tailored to project segment, location, USPs, and intended buyer persona (HNI/NRI/end-user/investor)
5. Saved to `campaigns` table with `status: 'draft'`
6. Rendered as cards on the page with copy-to-clipboard buttons and a "Mark as launched" toggle

The Claude prompt should:
- Pull in the project's USPs, location, price, segment, developer brand
- Pull in 3-5 examples of past **winning ads** from a JSON file `packages/content/src/examples/winning-ads.json` (you create starter examples)
- Output strict JSON with character counts pre-validated for Meta/Google limits
- Optimize for Indian buyer psychology: family, status, ROI, kids' education proximity, vastu — pick what fits the segment

### 3. Image generation (optional, later)

Don't build image generation now. Add a TODO comment for week 4: integrate Recraft or Ideogram API to auto-generate ad creatives. For now, the client uploads images.

### 4. Campaigns dashboard

`apps/web/app/(dashboard)/campaigns/page.tsx`:
- Table of all campaigns across all clients (filterable by client + project + status + platform)
- Columns: project, platform, name, status, daily budget, leads count, cost per lead, started_at
- Click row → detail view showing the creative + a daily leads chart (use Recharts)
- "Sync from Meta" button (stub for now — write the function signature and TODO; we'll wire Meta Marketing API in week 4)

### 5. Per-client UTM convention

Document in `docs/utm-conventions.md`. Force a standard so analytics aren't garbage:
- `utm_source` = platform (`meta` / `google` / `99acres` / `whatsapp_broadcast` / etc.)
- `utm_medium` = `cpc` / `cpm` / `organic` / `referral`
- `utm_campaign` = `<project_slug>-<segment>-<launch_or_evergreen>`
- `utm_content` = creative variant id from `campaigns` table

The lead-intake API should parse UTMs and store them in `source_meta` for full attribution.

### 6. Demo seed

Update `scripts/seed.ts` to also create:
- 1 luxury project ("The Crest, Worli") with realistic USPs
- 1 premium project ("Skyline Heights, Pune")
- 1 plot project ("Green Acres, Lonavala")
- 5 generated creatives for the luxury one (run Claude during seed)

So when I demo, hitting `/p/the-crest-worli` shows a beautiful landing page immediately.

---

## Deliverables

1. Three landing-page variants live at `/p/[slug]`
2. Submitting a form → lead in DB → voice agent call within 2 min (full chain works)
3. Project dashboard → click "Generate creatives" → 10 ad variants appear in <30s
4. Campaigns table shows campaigns across clients
5. UTM doc + seed data

Stop here. Social + dashboard polish next.
