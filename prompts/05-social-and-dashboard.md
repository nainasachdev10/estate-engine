# Prompt 05 — Social Media Engine + Client Dashboard Polish

> Final week. Build the social scheduler and finish the dashboard so a paying client can actually log in and see value.

---

## Task

Two things this session:
1. **Social media auto-scheduler** — Claude generates 30 days of posts per project, you (the operator) approve with one tap, Postiz publishes
2. **Client-facing dashboard** — clean, premium, what the client actually pays to look at

Read `CLAUDE.md`.

### 1. Social media engine

#### Setup
- Self-host Postiz on a Railway service (Postiz is open-source). Or use a Postiz cloud account for v1. Document the choice in `docs/postiz-setup.md`.
- Or, if Postiz proves heavy, use **Ayrshare API** as fallback (simpler, ₹2-3K/mo). Make this swappable behind `packages/social/src/scheduler.ts` interface.

#### Generation
Create `/api/social/generate` POST endpoint. Body: `{ projectId, days: number, themes?: string[] }`.

Server:
1. Pulls project info (USPs, segment, location, brand voice from `clients.brand_voice_notes`)
2. Calls Claude with prompt at `packages/content/src/prompts/generate-social-month.ts`
3. Claude returns JSON with `days × 1.5` posts (we slightly over-generate so operator can drop weak ones):

```json
{
  "posts": [
    {
      "platform": "instagram" | "facebook" | "linkedin" | "twitter",
      "post_type": "carousel" | "single_image" | "reel_script" | "story",
      "caption": "...",
      "hashtags": ["...", "..."],
      "media_brief": "Plain English description of what image/video to make",
      "suggested_post_at": "2026-05-15T11:00:00+05:30",
      "theme": "lifestyle" | "amenities" | "neighborhood" | "trust_signal" | "offer" | "testimonial"
    }
  ]
}
```

Save to `social_posts` table with `status: 'draft'`.

Themes to rotate (Claude must distribute evenly):
- Lifestyle (drone shots, sunset views)
- Amenities deep-dive
- Neighborhood guide (nearby schools, cafes, hospitals)
- Trust signals (RERA, developer track record, certifications)
- Limited-time offers
- Resident/buyer testimonials (Claude generates a *brief* — actual content needs human)
- Construction progress updates

Best times for Indian real estate by platform:
- Instagram: 11am, 7pm, 9pm IST
- Facebook: 1pm, 8pm IST
- LinkedIn: 9am, 12pm weekdays only
- Twitter: 8am, 6pm IST

Claude must spread posts across these windows.

#### Approval UI

`apps/web/app/(dashboard)/social/page.tsx`:
- Calendar grid view (use a lightweight calendar like FullCalendar or build with Tailwind grid)
- Each cell shows the post card with caption preview, platform icon, status badge
- Click cell → side drawer with full post, hashtags, media-brief, "Approve" / "Edit" / "Skip" / "Regenerate this one"
- Bulk action: "Approve all drafts for this week"
- Once approved, status moves to `scheduled`, Postiz API is called

### 2. Client-facing dashboard

Make the dashboard premium. This is what wins recurring revenue.

Create the client portal at `/portal/[client_slug]/...` (auth gated, separate from internal `/dashboard` we've been building).

Auth: magic link via Brevo email + Supabase Auth. No passwords. Per-client login.

Pages:
- `/portal/[slug]` — **Pipeline overview**
  - Hero stats (gold accents): leads this month, qualified this month, site visits booked, est. revenue in pipeline
  - Funnel chart (Recharts): new → contacted → qualified → site_visit → visited → negotiating → closed
  - Daily lead-volume chart (last 30 days)
  - "Hot leads" list — leads with score ≥ 80, not yet contacted by human

- `/portal/[slug]/leads`
  - Full pipeline table (kanban-style: drag between status columns)
  - Filter by project, source, score, language pref
  - Click lead → drawer with timeline (calls, messages, notes), action buttons to: "Call now" (re-trigger voice agent), "Send WhatsApp", "Mark as site-visit booked", "Add note"

- `/portal/[slug]/projects/[id]`
  - Project performance: leads count, cost per qualified lead, top-performing campaigns
  - Active social posts this week
  - Active ad creatives this week

- `/portal/[slug]/team` — invite team members (sales rep role can only see leads, manager sees everything)

### 3. Notifications

- Daily 9am IST email to client: "Yesterday: 12 leads, 3 qualified, 1 site visit booked"
- Real-time Slack/WhatsApp ping when a hot lead (score ≥ 90) is generated
- Weekly Monday 8am email: "Week-over-week growth + this week's top campaign"

Use the existing Brevo + AiSensy integrations.

### 4. Polish pass on internal dashboard

- Add a "switch client" selector in the top nav for the operator (you)
- Add `/dashboard/billing` showing which clients are paying, mock for now
- Add `/dashboard/health` — system health page: pending Inngest jobs, last call time, last message time, errors in last 24hr
- Fix any layout issues found during the build

### 5. Demo script doc

Write `docs/demo-script.md`: a 7-minute demo flow you can do with a prospective client. Steps:
1. Show the pitch (use the Nexora-style pitch deck angle — "₹X crore sitting waiting")
2. Open the portal: show pipeline
3. Click a lead, show timeline with real call transcript
4. Switch to internal dashboard, generate fresh creatives live in 30s
5. Open `/p/the-crest-worli` landing page
6. Submit a test form, prospect's own phone rings on stage
7. Show approved-by-Meta WhatsApp templates
8. Wrap with pricing: ₹50K setup + ₹50K-1L/mo + 1% success fee

---

## Deliverables

1. Social calendar works: generate, approve, schedule, publish
2. Client portal works: magic link login → dashboard → click lead → see everything
3. Daily + weekly emails go out
4. Demo script doc exists
5. Hot-lead Slack/WhatsApp pings fire

After this, you have a sellable product. Stop and demo to first paying client.
