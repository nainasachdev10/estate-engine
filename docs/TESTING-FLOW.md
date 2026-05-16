# Realty Engine — Frontend Testing Flow

> Complete walkthrough of every feature in the product, tested via the frontend UI.
> Do this top to bottom after deploying and running `pnpm seed`.

**Prerequisites:** Supabase connected, seed data loaded (`pnpm seed`), Vercel deployed.  
**Your test URL:** `https://estate-engine.vercel.app`  
**Local:** `pnpm dev` → `http://localhost:3000`

---

## 1. Internal Dashboard — Pipeline

**URL:** `/` (root)

### What to test:
1. **Stats bar** — Should show 4 cards: Today's Leads, Qualified Today, Calls Made Today, Avg Score (7d). All start at 0 if no activity today.
2. **Table** — After `pnpm seed`, shows 3 test leads from "The Crest, Worli"
3. **Status filter tabs** — Click "New" → table filters to new leads only. Click "All" to reset.
4. **Search** — Type a name in the search box → table filters in real time (client-side)
5. **Trigger Call button** — Click "📞 Call" on any row → toast notification appears (green = success, red = error). Check Supabase `call_logs` table for new row.
6. **Row click** → navigates to `/leads/[id]` detail page
7. **Auto-refresh** — Page re-fetches every 30s (check network tab to confirm)

### Expected:
- Stats show real numbers (not placeholders)
- Table loads with masked names (e.g. "T*** L*** O***")
- Toast appears within 1s of clicking Call
- Clicking a row opens the lead detail

---

## 2. Lead Detail Page

**URL:** `/leads/[id]` — click any lead from the pipeline

### What to test:
1. **Timeline** — Shows empty state if no calls/messages yet. After a call, shows call card with outcome, sentiment, score.
2. **Call transcript** — Click "Show transcript" on a call card → expands with full conversation
3. **Action Panel (right side):**
   - **Lead info** — Shows name (unmasked), masked phone, source, score bar
   - **Status dropdown** — Change status to "Qualified" → PATCH fires → status badge updates instantly → toast appears
   - **Trigger Call button** — Click → toast appears
   - **Pause/Resume sequence** — If lead is in a sequence, button appears. Click to pause → button changes to "Resume"
   - **Notes** — Type something in the textarea → click "Save Note" → toast confirms → note persists on reload

### Expected:
- All actions show loading states while pending
- Toast appears for every action (success or error)
- Status change reflects immediately without page reload

---

## 3. Leads List

**URL:** `/leads`

### What to test:
1. **Table loads** — shows all leads sorted by score (highest first)
2. **Click lead name** → navigates to `/leads/[id]`
3. **Filter by status** (if status query param is supported)

---

## 4. Projects

**URL:** `/projects`

### What to test:
1. **3 project cards** appear after seed: The Crest Worli (luxury/gold), Skyline Heights Pune (premium/blue), Green Acres Lonavala (plot/green)
2. **Lead counts** — each card shows total leads + qualified count
3. **"Creatives" button** → navigates to creatives page
4. **"Landing Page ↗" button** → opens `/p/[slug]` in new tab
5. **"View Leads" button** → navigates to `/leads?project=[id]`

---

## 5. Landing Pages (Public)

**URL:** `/p/the-crest-worli`, `/p/skyline-heights-pune`, `/p/green-acres-lonavala`

### What to test:
1. **Luxury page** (`/p/the-crest-worli`) — Dark hero, gold accents, Playfair Display headings, USP grid, RERA badge, lead form
2. **Premium page** (`/p/skyline-heights-pune`) — Split layout, amenities grid, modern styling
3. **Plot page** (`/p/green-acres-lonavala`) — Light background, big price callout, WhatsApp CTA
4. **Lead form submission:**
   - Fill name, phone (10 digits), optional email
   - Click CTA button
   - See success state: "Aapko 2 minute mein call aayegi"
   - Check `/` pipeline — new lead appears
   - If Bolna is configured: phone rings in ~2 minutes

### Expected:
- All 3 pages look distinct and premium
- Form validates phone (must be 10 digits)
- After submit: success state shows masked phone number
- PostHog captures `landing_page_view` and `lead_form_success` events

---

## 6. Ad Creatives Generator

**URL:** `/projects/[id]/creatives`  
(From Projects page → click "Creatives" on any project)

### What to test:
1. **Page loads** — shows existing creatives or empty state
2. **"Generate 10 Creatives" button** — click → loading spinner → wait 15–30s → 10 cards appear
3. **Cards** — each shows platform badge (meta/google/99acres), headline, primary text
4. **"Copy" button** — copies ad copy to clipboard → button briefly says "Copied!"
5. **"Mark live" toggle** — click → status badge changes to green "Live"
6. **"🚀 Launch on Meta" button** — appears on meta platform cards (only if `META_ACCESS_TOKEN` is set) → creates campaign on Meta as PAUSED → shows Campaign ID

### Expected:
- 10 variants generated: 3 Meta single-image, 3 video scripts, 2 Google Search RSA, 1 Google Display, 1 99acres listing
- Each variant tailored to the project's segment (luxury/premium/plot)
- Copy button works without errors

---

## 7. Social Media Calendar

**URL:** `/social`

### What to test:
1. **Project dropdown** — select "The Crest, Worli"
2. **"Generate 30 days of posts" button** — click → loading → wait ~30s → posts appear
3. **Post cards** — each shows platform icon, scheduled date/time (IST), caption preview, theme badge (lifestyle/amenities/etc.), status (Draft)
4. **"Approve" button** — click on a post → status changes to "Scheduled" → if `AYRSHARE_API_KEY` is set, post is scheduled on the social platform → toast confirmation
5. **"Approve all drafts" button** → approves all at once → batch toasts
6. **"Skip" button** → removes post from view

### Expected:
- Posts distributed across Instagram, Facebook, LinkedIn, Twitter
- Best-time scheduling: Instagram at 11am/7pm/9pm IST, LinkedIn only weekdays at 9am/12pm
- Themes distributed evenly: lifestyle, amenities, neighborhood, trust, offer, testimonial, construction

---

## 8. Campaigns Dashboard

**URL:** `/campaigns`

### What to test:
1. **Status filter tabs** — All / Draft / Active / Paused / Ended
2. **After generating creatives** — campaigns appear in "Draft" tab
3. **Click campaign** → navigates to creatives detail

---

## 9. Bulk Lead Upload

**URL:** `/bulk-upload`

### What to test:
1. **"Download template CSV" link** — downloads a correctly formatted CSV
2. **Project selector** — choose "The Crest, Worli"
3. **Upload CSV** — use the downloaded template, fill in 2-3 rows with your phone number
4. **Preview** — first 3 rows appear in the preview table
5. **Upload button** — shows `X leads imported`, `Y failed` with specific error messages
6. **After upload** — go to Pipeline (`/`) → new leads appear → calls trigger in ~2 minutes

### CSV format to test:
```csv
full_name,phone,email,source,language_pref
Rajesh Sharma,9876543210,raj@test.com,meta,hinglish
Priya Mehta,9123456789,,google,en
Test User,9898989898,test@test.com,manual,hi
```

---

## 10. System Health

**URL:** `/health`

### What to test:
1. **Event counts** — shows count of events in last 24hrs grouped by kind
2. **Pending leads** — shows leads stuck in "new" status for >30 minutes (should be 0 if Inngest is working)
3. **Recent errors** — shows any failed events from the events table

---

## 11. Settings

**URL:** `/settings`

### What to test:
1. **Platform section** — shows APP_URL, webhook URLs (Bolna, AiSensy, Brevo, Inngest)
2. **Copy button** — click "Copy" next to any webhook URL → clipboard updated → button briefly shows "Copied ✓"
3. **Environment checklist** — shows which API keys are configured (✅) or missing (❌)
4. **Clients section** — lists all clients from Supabase. Edit contact email inline.

### Verify these show ✅:
- ANTHROPIC_API_KEY
- BOLNA_API_KEY + BOLNA_AGENT_ID
- AISENSY_API_KEY
- BREVO_API_KEY
- INNGEST_EVENT_KEY

---

## 12. Client Portal — Login

**URL:** `/portal/orchid-developers`

### What to test:
1. **Redirect to login** — visiting `/portal/orchid-developers` redirects to `/portal/orchid-developers/login` if not logged in
2. **Login form** — enter the email matching `clients.contact_email` in Supabase (default from seed: `sales@orchiddevelopers.com` — update this to your real email first!)
3. **Magic link** — email arrives in inbox within 60 seconds
4. **Click link** → redirected to `/portal/orchid-developers` → logged in
5. **Unauthorized email test** — try logging in with a different email → gets "not authorised" error

### Setup before testing:
```sql
-- Update contact email to your real email in Supabase
UPDATE clients SET contact_email = 'your-email@gmail.com' WHERE slug = 'orchid-developers';
```

---

## 13. Client Portal — Overview

**URL:** `/portal/orchid-developers` (after login)

### What to test:
1. **Hero stats** — 4 gold cards: Leads This Month, Qualified, Site Visits, Pipeline Value
2. **Funnel chart** — horizontal bars showing lead count per status stage (New → Won)
3. **Hot Leads panel** — leads with score ≥70 (appears after voice calls qualify leads)
4. **Daily Volume chart** — 30-day area chart of lead creation
5. **Navigation** — Overview | Leads | Projects tabs in top nav
6. **Sign out** — click button → redirected to login

---

## 14. Client Portal — Leads

**URL:** `/portal/orchid-developers/leads`

### What to test:
1. **Lead table** — shows client's leads (masked names)
2. **Status filter tabs** — All / New / Contacted / Qualified / Site Visit / Won/Lost
3. **Search** — type a name fragment → filters in real-time
4. **"📞 Call" button** — triggers voice agent call → toast confirmation
5. **Status dropdown** — change status → updates instantly → toast
6. **"Load more" button** — loads next 50 leads

---

## 15. Client Portal — Projects

**URL:** `/portal/orchid-developers/projects`

### What to test:
1. **Project cards** — 3 cards: Worli (luxury), Pune (premium), Lonavala (plot)
2. **Click a card** → navigates to project detail

---

## 16. Client Portal — Project Detail

**URL:** `/portal/orchid-developers/projects/[project-id]`  
(Click any project card)

### What to test:
1. **Stats** — Total Leads, Qualified %, Site Visits, Cost per Qualified Lead
2. **Campaigns section** — shows any campaigns for this project
3. **Scheduled Posts section** — shows upcoming social posts
4. **Recent Leads table** — last 10 leads for this project
5. **"View landing page →" link** — opens public landing page

---

## 16. Full End-to-End Flow Test

Run this sequence to test the entire pipeline from a single lead:

```
Step 1: Open /p/the-crest-worli in an incognito window
Step 2: Submit a test lead with your phone number
Step 3: Check / pipeline — lead appears with status "new"
Step 4: Wait ~2 minutes — your phone rings (Bolna voice agent)
Step 5: Have a conversation — say you're interested in buying
Step 6: After hanging up, check /leads/[id]:
        - Status should be "qualified" or "contacted"
        - Score should be > 0
        - Call transcript should appear in timeline
        - If qualified: status = "qualified", score = 60+
Step 7: If qualified, check your phone:
        - WhatsApp message should arrive within 5 minutes (if AiSensy is configured + template approved)
        - Email should arrive within 24 hours (if Brevo is configured)
Step 8: Check /portal/orchid-developers — lead appears in hot leads if score ≥70
Step 9: Check /health — events logged for intake, call, webhook
```

---

## 17. Toast System Test (across the app)

Every user action should produce a toast notification:

| Action | Expected Toast |
|---|---|
| Trigger call from pipeline | "✅ Call triggered" or "❌ Call failed: [reason]" |
| Change lead status | "✅ Status updated to [new status]" |
| Add note to lead | "✅ Note saved" |
| Pause/resume sequence | "✅ Sequence paused/resumed" |
| Generate creatives | "✅ 10 creatives generated" |
| Launch on Meta | "✅ Campaign created on Meta (review before activating)" |
| Approve social post | "✅ Post scheduled" |
| Skip social post | "ℹ️ Post skipped" |
| Bulk upload success | Shows inline result, not toast |

---

## Known Limitations (Won't Fix in this Sprint)

| Limitation | Workaround |
|---|---|
| Internal dashboard has no login | Don't share the Vercel URL publicly. Add Supabase auth to `(dashboard)` layout in week 4. |
| Google Ads not auto-launched | Copy the Google RSA headlines/descriptions from the Creatives page and paste into Google Ads Editor manually. |
| DND registry check missing | Don't upload cold list CSVs of unknown numbers. Only use leads who explicitly enquired. |
| Social publishing preview | Ayrshare doesn't return a preview URL — check your connected social accounts directly. |
| WhatsApp messages need template approval | First message to new leads will silently fail until Meta approves templates (24–48hr). Watch the `events` table for `aisensy_send_failed` entries. |

---

## Quick Links Reference

```
Internal (operator only):
  /                        Pipeline + stats command center
  /leads                   All leads, sorted by score
  /leads/[id]              Lead detail with timeline + actions
  /projects                Project cards with lead counts
  /projects/[id]/creatives Ad creative generator
  /campaigns               All ad campaigns
  /social                  30-day social calendar
  /bulk-upload             CSV upload → auto-calls
  /health                  System health check
  /settings                Webhook URLs, env check, client mgmt

Public (landing pages):
  /p/the-crest-worli       Luxury landing page (demo)
  /p/skyline-heights-pune  Premium landing page
  /p/green-acres-lonavala  Plot landing page

Client portal (magic link login):
  /portal/orchid-developers           Overview + charts
  /portal/orchid-developers/leads     Lead pipeline with actions
  /portal/orchid-developers/projects  Project grid
  /portal/orchid-developers/projects/[id]  Project detail + performance
```
