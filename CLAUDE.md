# CLAUDE.md — Project Context for Claude Code

> This file is read by Claude Code at the start of every session. Keep it tight. Update it when decisions change.

## Project: Realty Engine

A productized acquisition engine for Indian real estate developers. Five modules: voice agent, WhatsApp/email follow-up, lead generation, Claude-powered content brain, social media scheduler. Built as a monorepo. Single operator should run 5-10 clients.

## Stack (locked — do not swap without asking)

- **Runtime:** Node.js 20 + TypeScript everywhere. No Python.
- **Framework:** Next.js 14 App Router (frontend + API routes)
- **DB:** Supabase Postgres
- **AI:** Anthropic Claude Sonnet 4.5 via `@anthropic-ai/sdk`
- **Voice:** Bolna API (Hinglish), Sarvam for TTS/STT
- **WhatsApp:** AiSensy API
- **Email:** Brevo (Sendinblue) API
- **Queue:** Inngest (for scheduled drips, retries, nightly jobs)
- **Hosting:** Vercel (web) + Railway (workers if needed)
- **Analytics:** PostHog
- **Styling:** Tailwind + shadcn/ui — keep it dark, premium, gold accents (luxury real estate vibe)

## Folder structure (enforce this)

```
/apps
  /web                  Next.js app (dashboard + landing pages + API)
/packages
  /core                 shared types, db client, claude client
  /voice                Bolna integration
  /messaging            AiSensy + Brevo wrappers
  /content              Claude prompts for ads/posts/scripts
/supabase
  /migrations           SQL migrations, run in order
/scripts
  seed.ts, bulk-upload.ts, etc.
```

## Coding conventions

- TypeScript strict mode on
- Zod for runtime validation of every external API response
- Every external API call wrapped in `try/catch` with logging to Supabase `events` table
- Never log PII (phone numbers, emails) in plaintext — hash or mask
- All money in paise (integers), never floats
- Indian phone numbers stored as E.164 with `+91` prefix
- Server actions over API routes where possible
- Component files < 200 lines — split when bigger

## Domain rules (real estate specific)

- A **lead** belongs to one **project** belongs to one **client** (the developer)
- Lead lifecycle: `new → contacted → qualified → site_visit_booked → visited → negotiating → closed_won | closed_lost`
- Voice agent must call within **2 minutes** of lead creation (the "5-min response = 21x conversion" claim from the pitch)
- All WhatsApp messages must go via approved templates first message, free-form only after the 24hr window opens
- Hinglish ≠ Hindi. The voice agent script is in Roman script mixing English and Hindi words. Don't translate to Devanagari.

## Things to NEVER do

- Don't add Redux, Zustand, or any state library. Use React Server Components + URL state.
- Don't add an ORM (Prisma/Drizzle). Supabase JS client only.
- Don't create new files when an existing one can be extended.
- Don't write tests in the first 3 weeks unless explicitly asked. Ship first.
- Don't auto-deploy. All deploys are manual via `vercel --prod`.

## Current sprint

Look at `/plans/00-MASTER-PLAN.md` for the 3-week roadmap. Currently in: **[update this each week]**.

## Decisions log

- **2026-05-13:** Picked Supabase over Zoho — owns data, no per-seat cost
- **2026-05-13:** Picked AiSensy over Interakt — cheaper at entry
- **2026-05-13:** Picked Postiz over Buffer — open source, self-host saves ₹2K/mo at scale
