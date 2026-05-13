# Realty Engine — Master Build Plan

> Productized acquisition engine for Indian real estate developers and brokers. Inspired by the Nexora 9-layer model. Built lean, shipped fast.

---

## 1. What we're building (one paragraph)

A SaaS-style "growth engine" any Indian developer or broker can plug into in under 48 hours. It generates leads via paid ads + organic content, qualifies them with a Hinglish voice agent, nurtures them with WhatsApp + email drip sequences personalised by Claude, and feeds a simple CRM dashboard the client logs into. One operator (you) can run this for 5-10 clients at once.

## 2. The 5 modules (matches your brief)

| # | Module | Core job | Ship week |
|---|--------|----------|-----------|
| 1 | **Voice Agent (Hinglish)** | Auto-call new leads in <5 min, qualify, book site visit | Week 1 |
| 2 | **WhatsApp + Email Follow-up** | Multi-touch drip, personalised by Claude per lead | Week 1 |
| 3 | **Lead Generator** | Meta + Google ad creative + landing pages + form capture | Week 2 |
| 4 | **Claude Brain** | Generates ads, scripts, follow-ups, scoring | Wired into all modules |
| 5 | **Social Media Engine** | Auto-generates + schedules posts per project | Week 3 |

## 3. Tech stack (final picks — chosen for cheap + fast)

| Layer | Picked | Why over the screenshot suggestion |
|---|---|---|
| AI Brain | **Claude Sonnet 4.5** via API | More current than 3.5; smarter for Hinglish nuance |
| Voice AI | **Bolna** (primary) + **Retell** fallback | Bolna has native Hinglish, ₹1-2/min, India phone numbers via Plivo/Exotel |
| STT/TTS | **Sarvam Bulbul-v2** (TTS) + **Saaras** (STT) | Best-in-class Hindi/Hinglish, pay-per-use |
| WhatsApp | **AiSensy** (₹999/mo entry tier) | Cheaper than Interakt/Wati for early stage, official Meta API |
| Email | **Brevo** (free up to 300/day, then ₹525/mo) | Beats Mailmodo on price; AMP email if needed later |
| CRM | **Supabase** (free tier, then $25/mo) | Skip Zoho — build a thin custom CRM on Supabase. Faster, no per-seat fees, owns the data |
| Ads | **Meta Ads + Google Ads + 99acres** | Same as screenshot |
| Social | **Postiz** (open-source, self-host free) OR **Buffer** | Postiz is free if you self-host on a ₹500/mo VPS |
| Landing Pages | **Framer** (₹1.2K/mo) OR Next.js on Vercel (free) | Build template pages once, clone per project |
| Analytics | **PostHog** (free tier) + **GA4** | PostHog gives funnels, heatmaps, session replay in one — replaces Hotjar |
| Hosting | **Vercel** (frontend) + **Railway** (backend workers) | Free tiers cover MVP |
| Database | **Supabase Postgres** | Same as CRM choice |
| Job Queue | **Trigger.dev** OR **Inngest** (free tier) | For scheduled drips and nightly research |

**Total monthly tooling cost at MVP:** ~₹3,000-5,000 (most of it Bolna voice usage which is variable).
**At 5 clients:** ~₹15,000-25,000/mo. Sell the engine at ₹50K-1L/client/mo.

## 4. Architecture (one picture in words)

```
   Ads (Meta/Google) ─┐
   99acres listings  ─┼─→  Landing Page (Framer/Next.js) ─→ Lead form
   Organic social    ─┘                                          │
                                                                 ▼
                                                       Supabase: leads table
                                                                 │
                       ┌─────────────────────────────────────────┤
                       ▼                                         ▼
              Bolna Voice Agent                          Claude (Sonnet 4.5)
              (calls within 2 min,                       — writes WA message
               Hinglish, qualifies)                      — writes email
                       │                                 — scores lead
                       ▼                                         │
              Updates Supabase                                   ▼
              (status, score, transcript)              AiSensy + Brevo APIs
                       │                                 (send + schedule)
                       └─────────────────┬───────────────────────┘
                                         ▼
                              CRM Dashboard (Next.js)
                              — client logs in
                              — sees pipeline, calls, replies
                              — one-click site visit booking
```

## 5. The 3-week sprint

**Week 1 — Core loop (Voice + WhatsApp follow-up)**
- Supabase schema + lead intake webhook
- Bolna Hinglish agent live with qualifier script
- AiSensy template messages approved by Meta
- Claude-powered message personaliser
- Manual lead upload works end-to-end

**Week 2 — Lead generation**
- 3 landing page templates (luxury, mid-segment, plot)
- Meta + Google ad creative generator (Claude writes 10 variants per project)
- Lead capture webhook → triggers voice call + drip

**Week 3 — Social + dashboard + polish**
- Postiz scheduling, Claude generates 30 days of posts
- Client-facing dashboard (read-only views of pipeline)
- Onboarding flow + docs
- First paying client live

## 6. Where Claude Code comes in

Five focused prompts (see `/prompts` folder). Each one builds one module. Run them in order. Each prompt assumes the previous prompt's files exist.

1. `01-foundation.md` — Supabase schema, env, project skeleton
2. `02-voice-agent.md` — Bolna integration + Hinglish call script
3. `03-followup-engine.md` — WhatsApp + email drip with Claude
4. `04-lead-gen.md` — Landing pages + ad creative generator
5. `05-social-and-dashboard.md` — Social scheduler + CRM dashboard

## 7. What I (the human) need before starting

- [ ] Bolna account + ₹1000 prepaid credit
- [ ] AiSensy free trial, business WhatsApp number registered
- [ ] Sarvam API key (free tier first)
- [ ] Anthropic API key with ₹2000 credit
- [ ] Supabase project (free)
- [ ] Vercel + Railway accounts (free)
- [ ] One Meta Business Manager + ad account
- [ ] Domain name (~₹800/yr)

## 8. Success metric for the build itself

You should be able to demo end-to-end on day 21:
1. Upload a CSV of 50 leads
2. Voice agent auto-calls all 50 in Hinglish
3. Qualified ones get WhatsApp + email drip
4. Client logs into dashboard and sees the pipeline filling up
