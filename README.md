# Realty Engine — Handoff Package

> Everything you need to give Claude Code to build a 9-layer acquisition engine for Indian real estate. Inspired by the Nexora/Panchashil pitch model. Built lean, shipped in 21 days.

## What this folder contains

```
/
├── CLAUDE.md                          ← Persistent context. Drop this at repo root.
├── plans/
│   └── 00-MASTER-PLAN.md              ← The big picture. Read first.
├── prompts/                           ← Paste these into Claude Code in order.
│   ├── 01-foundation.md
│   ├── 02-voice-agent.md
│   ├── 03-followup-engine.md
│   ├── 04-lead-gen.md
│   └── 05-social-and-dashboard.md
└── docs/                              ← Reference material.
    ├── quickstart-runbook.md          ← Day-by-day for you, the operator
    └── pricing-and-packaging.md       ← How to sell it
```

## How to use this with Claude Code

1. Create empty GitHub repo + clone locally
2. Copy `CLAUDE.md` to repo root
3. Copy `plans/` and `docs/` to repo root  
4. Open Claude Code in that folder
5. Paste **Prompt 01** (`prompts/01-foundation.md`) and let it run end-to-end
6. Once it finishes and you've verified the deliverables at the bottom of the prompt, paste **Prompt 02**
7. Continue through 03, 04, 05 in order — do **not** run them in parallel

Each prompt is self-contained and explicitly tells Claude Code to **stop** after its module. This keeps each session focused and prevents scope creep.

## Why the prompts are designed this way

- **Front-loaded context** — `CLAUDE.md` is read on every Claude Code session, so decisions don't drift
- **Explicit stop conditions** — every prompt ends with "Stop here. Do not start the next module."
- **Deliverable checklist** — every prompt ends with "When done I should be able to..." so you know when to move on
- **No premature optimization** — no tests, no Redux, no microservices. Ship in 21 days, then refactor what survives
- **Locked stack** — `CLAUDE.md` lists the stack as non-negotiable, so Claude Code won't suggest replacing Supabase with Prisma+Postgres on day 5

## Stack at a glance

| Layer | Pick |
|---|---|
| AI Brain | Claude Sonnet 4.5 |
| Voice | Bolna (Hinglish) + Sarvam fallback |
| WhatsApp | AiSensy |
| Email | Brevo |
| DB + Auth | Supabase |
| Web | Next.js 14 on Vercel |
| Jobs | Inngest |
| Analytics | PostHog |
| Social | Postiz (self-host) or Ayrshare |

Total monthly tooling at MVP: ~₹3-5K. At 5 clients: ~₹15-25K. Sell at ₹50K-1L/client/mo. See `docs/pricing-and-packaging.md`.

## The 5 modules (the brief, restated)

1. **Voice calling agent (plug & play Hinglish)** → Bolna + Sarvam, 2-min response time
2. **Claude + Ads** → Claude writes 10 ad variants per project, manual launch on Meta/Google
3. **Social media** → Claude generates 30 days, you approve, Postiz publishes
4. **Lead generator** → Three landing-page templates + Meta/Google ads pointing to them
5. **Email + WhatsApp follow-ups** → AiSensy + Brevo, Claude personalises every message

## Realistic timeline

- **Week 1:** Voice + follow-up loop live. You can demo this alone.
- **Week 2:** Landing pages + ad creatives. Top of funnel works.
- **Week 3:** Social + client dashboard. First paying client onboarded.

## Pitfalls to avoid

- **Don't build everything before selling anything.** After Week 1 (voice + WhatsApp), start pitching. You'll learn faster from real clients than from building.
- **Don't try to automate the WhatsApp template approval.** It's a human Meta review process; budget 48 hours.
- **Don't use Hindi (Devanagari) — use Hinglish (Roman).** Real Indian buyers code-switch. The voice agent script reflects this.
- **Don't pitch tier-1 developers (Lodha/Godrej) first.** They take 3-6 months to close. Pitch broker offices and tier-2 developers — they sign in 2 weeks.
- **Don't skip the DND check.** Calling DND-registered numbers gets your phone numbers blacklisted by TRAI fast.

## Questions you'll probably ask Claude Code along the way

- "Add a new field to the leads table for X" → it'll write a new Supabase migration
- "The voice agent script needs to handle objection Y" → it'll update the Bolna system prompt
- "I have a new client onboarding — what do I do?" → run the seed script with the client's details

## What to do NOW

1. Read `plans/00-MASTER-PLAN.md` (5 min)
2. Read `docs/quickstart-runbook.md` (5 min)
3. Sign up for the accounts in the runbook's pre-flight (2 hours)
4. Open Claude Code, paste Prompt 01, watch it build

Total time to first paying client: 21 days if you stay focused. Add a week if you've never used Claude Code before.

Good luck. Build fast.
