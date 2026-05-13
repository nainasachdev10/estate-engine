# Quick Start Runbook

> Day-by-day playbook to go from zero to first paying client in 21 days. Print this. Tape it to your wall.

## Pre-flight (Day 0, before opening Claude Code)

Spend 2 hours signing up for accounts and getting keys. **All free tier or trial:**

- [ ] Anthropic Console → API key, add ₹2000 credit
- [ ] Supabase → new project, copy URL + anon + service role keys
- [ ] Vercel → connect GitHub, no need to deploy yet
- [ ] Bolna → sign up, get a test phone number, ₹1000 credit
- [ ] Sarvam → API key
- [ ] AiSensy → start free trial, register WhatsApp Business number (you'll do this for your test client first; later they do it themselves)
- [ ] Brevo → free account, verify sender email
- [ ] Inngest → free account, get keys
- [ ] PostHog → free project
- [ ] GitHub → empty repo `realty-engine`
- [ ] Meta Business Manager → connect WhatsApp + ad account

Save every key in a password manager. Drop them into `.env.local` as Claude Code creates the project.

## Days 1-7 — Voice agent live

Day 1-2: Run Prompt 01 + Prompt 02. Configure the Bolna agent in their dashboard following `docs/bolna-agent-setup.md`. Test-call yourself 5 times. Tune the Hinglish prompt until it feels natural.

Day 3: Get your WhatsApp Business number approved. Submit the 7 templates from `docs/whatsapp-templates.md`. Meta takes 24-48 hours.

Day 4-5: Run Prompt 03. Wait for template approvals. Test end-to-end: form submit → call → WhatsApp → email.

Day 6-7: Find your first real lead source. Either:
- Run a tiny ₹500/day Meta ad to your test landing page
- Buy 100 cold leads from a list broker for ₹2000
- Get a friend who's a broker to give you their last 50 enquiries

Iterate on the call script with real conversations. **This is the most important week.**

## Days 8-14 — Lead gen + creatives

Day 8-10: Run Prompt 04. Build all 3 landing-page variants. Make the luxury one beautiful — this is your demo.

Day 11-12: Generate creatives for 1 imaginary luxury project (your demo project). Run them on a tiny budget. Measure CTR. If <1% CTR, regenerate.

Day 13-14: Pitch your first real prospect. Use `docs/demo-script.md`. Target: a broker office or small developer (₹2-10Cr segment) — they sign faster than tier-1 developers.

## Days 15-21 — Polish + first client

Day 15-17: Run Prompt 05. Social engine + client portal.

Day 18-19: Onboard your first paying client. Use `docs/onboarding-checklist.md` (see below — TODO Claude Code will write this).

Day 20: First production lead flows through the system end-to-end.

Day 21: Demo to second prospect with first-client results as proof. Close them.

## What can go wrong (and how to handle)

| Problem | Fix |
|---|---|
| Bolna voice sounds robotic | Switch voice in agent settings; try male voice "Arvind"; lower temperature to 0.4 |
| WhatsApp templates rejected | Remove "click here" CTAs, remove emojis from UTILITY templates, resubmit as MARKETING |
| Claude generates generic ads | Add more examples to `winning-ads.json`; explicitly forbid clichés in the prompt |
| Lead complains about being called | Add `consent_confirmed_at` field, require checkbox on landing form |
| Cost overruns on Claude | Use prompt caching (Anthropic SDK supports it); cache the project context |
| Voice agent gets stuck on objection | Add a fallback "Main aapko ek senior se baat karwa deti hu" → routes to human |

## Important: the legal stuff (don't skip)

- [ ] Display privacy policy on every landing page
- [ ] Add a checkbox "Main consent deta hu Realty Engine se contact ke liye" (DPDP Act compliance)
- [ ] Don't call DND (Do-Not-Disturb) numbers — check TRAI DND registry via Exotel/Plivo API before triggering Bolna
- [ ] WhatsApp messages must respect Meta's policy: no aggressive sales, no claims, no exaggeration
- [ ] If you're storing PII for an EU/UK lead (NRI segment), you're under GDPR — add a data-export and delete endpoint
- [ ] Get a basic Terms of Service drafted by a lawyer (₹5-10K one-time)
