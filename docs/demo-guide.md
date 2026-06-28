# Realty Engine — Demo Guide

A productized AI acquisition engine for Indian real estate developers. One operator
runs voice calling, lead scoring, WhatsApp/email follow-up, ad-creative generation,
and a 30-day social calendar for 5–10 developer clients.

This guide gets the project running, populated, and demo-ready in ~5 minutes, then
gives you a tight script for presenting it.

---

## 1. Run it (one-time setup)

**Prerequisites:** Node 20+, `pnpm` (`npm i -g pnpm`).

```bash
# from the repo root
pnpm install

# Seed the demo dataset (1 client, 3 projects, 50 leads across every stage,
# 42 AI call transcripts, 104 WhatsApp/email messages, ad campaigns,
# a 30-day social calendar, and an activity stream)
pnpm seed:demo

# Create a confirmed operator login so you can sign in instantly
npx tsx scripts/ensure-admin.ts
```

**Start the app:**

```bash
pnpm --filter @realty-engine/web dev
# → http://localhost:3000
```

> The environment in `apps/web/.env.local` is already wired to a live Supabase
> project (Postgres + Auth) and an Anthropic key. No extra config needed for the demo.

---

## 2. Log in

Open **http://localhost:3000** → **Sign in**.

| Field | Value |
|---|---|
| Email | `nainasachdev01@gmail.com` |
| Password | `RealtyDemo2026!` |

Admin emails (in `ADMIN_EMAILS`) route to the **operator console** (`/pipeline`).
Everyone else routes to a **client portal** or the access-request screen — that
role split is enforced in `middleware.ts`.

> To reset the data at any time, re-run `pnpm seed:demo` (it's idempotent).

---

## 3. The 5-minute demo script

Tell the story the way a buyer's lead actually moves through the system. Each step
maps to a real screen with real data.

**0. Landing page** (`/`) — *15 sec, set the frame*
> "This is the product a developer signs up for. Five AI modules — voice, ads,
> social, messaging, CRM — running one acquisition funnel. Now let me show you the
> engine behind it."

**1. Pipeline** (`/pipeline`) — *the hero screen*
> "Every lead from Meta, Google, or 99acres lands here in real time. Live kanban
> across 9 stages. The number on each card is a **Claude-generated intent score**
> from the phone call — above 70 goes to sales, below 70 drops into nurture."
- Toggle **Board ↔ Table**. Point at the today-stats: leads today, qualified today,
  calls today, 7-day average score.

**2. Lead detail** (click any *Negotiating* or *Qualified* lead) — *the depth moment*
> "Here's where the AI did the work. This is the actual **Hinglish call transcript** —
> the voice agent called within 60 seconds of the form fill, captured budget and
> timeline, and Claude scored the conversation. Below it: the WhatsApp and email
> drip that fired automatically, and the full event timeline."

**3. Analytics** (`/analytics`)
> "Funnel conversion by stage, source attribution, voice stats, messaging
> engagement — the numbers a developer is paying to see."

**4. Social** (`/social`)
> "30 days of Instagram, Facebook, LinkedIn, and X content, generated per project in
> the developer's brand voice. Past posts are published; future ones are queued."

**5. Campaigns** (`/campaigns`)
> "Claude writes the ad copy — headline and primary text per platform — with live
> spend and leads-per-campaign."

**6. Client portal** (`/portal/orchid-developers`) — *the business model*
> "And this is what the *developer* sees: a branded, read-only view of their own
> pipeline and numbers. Buyer names are masked. No operator access. This is how one
> person runs ten clients."

> Public lead-capture landing pages also exist at `/p/the-crest-worli`,
> `/p/skyline-heights-pune`, `/p/green-acres-lonavala` — the form that starts the
> whole pipeline.

---

## 4. Talking points for Round 3 (the "receipts")

The fellowship asks: *show your work, go deep, tell us where it broke, what's the
hardest problem you solved.* Honest material:

### Architecture (one thing, understood completely)
- **Monorepo** (pnpm workspaces): `apps/web` (Next.js 14 App Router) + domain
  packages — `core` (db/Claude clients, types), `voice` (Bolna), `messaging`
  (AiSensy/Brevo), `content` (Claude prompt engineering), `social` (scheduler).
- **Event-driven core.** A form fill emits `lead/created` → **Inngest** waits a 30s
  human opt-out window → if still `new`, places the Bolna voice call → Claude scores
  the transcript → routes the lead and kicks off the WhatsApp/email drip. A
  quiet-hours guard defers calls outside 9am–9pm IST. This decoupling is what makes
  the "call within 2 minutes" SLA reliable instead of best-effort.
- **Auth & multi-tenancy** in `middleware.ts`: one Supabase Auth identity, two
  worlds — operator console vs. per-client portal — gated by email role, with
  careful cookie-refresh handling so token rotation survives redirects.

### Where it broke (real bugs, found and fixed making this demo-ready)
1. **The app pointed at a dead database.** `apps/web/.env.local` referenced a
   Supabase project that no longer resolves — every dashboard would have rendered
   empty. Repointed to the live project and documented it.
2. **Integer overflow hiding in the money layer.** `price_*_paise` is an INT4
   column, but the project convention is "all money in paise." ₹8.5 Cr in *paise* is
   8.5×10⁹ — past INT4's 2.1×10⁹ ceiling, so luxury projects silently failed to
   insert. The formatters actually treat the column as **rupees**, not paise — a
   name/units mismatch. (Real fix: widen to `BIGINT` and rename; for the demo the
   seed matches the formatter.)
3. **A malformed env line** had merged `TEST_PHONE` into `INTERNAL_API_SECRET`.

### Hardest technical problem
Pick the one you want to own on the call — each is true here:
- **Making "respond in under 60 seconds" actually hold** under retries, quiet
  hours, and opt-outs — solved with a durable Inngest workflow, not a cron job.
- **Hinglish that isn't Hindi.** The voice script mixes English + Hindi in Roman
  script; getting Claude to score intent from a code-mixed transcript (budget,
  timeline, objection handling) without translating it.
- **One identity, two product surfaces** — operator vs. client portal — secured at
  the edge without leaking buyer PII into the client's view.

---

## 5. Troubleshooting

| Symptom | Fix |
|---|---|
| Dashboards look empty | Re-run `pnpm seed:demo` |
| Can't log in | Re-run `npx tsx scripts/ensure-admin.ts`; sign in with the creds above |
| Port 3000 in use | `pnpm --filter @realty-engine/web dev -- -p 3001` |
| Want a clean reset | `pnpm seed:demo` wipes and rebuilds the demo client |

**Demo data lives under one client** (`Orchid Developers`, slug
`orchid-developers`) so it's fully isolated and safe to reset.
