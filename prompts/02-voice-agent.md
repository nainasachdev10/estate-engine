# Prompt 02 — Voice Agent (Hinglish, Plug & Play)

> Run this after Prompt 01 completes. This is the **highest leverage** module — the pitch deck's whole thesis is "5-min response = 21x conversion." This module IS that.

---

## Task

Build the Bolna voice agent integration. New leads must be auto-called within 2 minutes, in Hinglish, by an AI agent that qualifies them and books a site visit if interested.

Read `CLAUDE.md`. Stay inside the existing folder structure. Don't change foundation files unless absolutely needed.

### 1. The Bolna agent (configured once outside code, via Bolna dashboard)

I will create the agent in Bolna manually. Write me a markdown file at `docs/bolna-agent-setup.md` with:
- The exact system prompt for the agent (in English, mixing Hindi words naturally — "namaste", "kya aap interested hain", "site visit ke liye time mil sakta hai", etc.)
- Voice settings: **Sarvam Bulbul v2 Hindi female voice "Meera"**, temperature 0.6, response delay 200ms
- Variables the agent expects from the API call: `lead_name`, `project_name`, `project_location`, `unit_type`, `price_range`, `key_amenities` (comma-separated string), `client_brand`
- The 6 qualifying questions the agent must ask:
  1. Confirm name and that they enquired about the project
  2. Are they buying for self-use or investment?
  3. Budget range — does our price match?
  4. Timeline — when looking to buy?
  5. Are they pre-approved for a home loan / paying cash?
  6. Can we book a site visit this weekend?
- The "exit conditions": qualified / not qualified / callback later / wrong number / no answer after 3 attempts
- The webhook URL Bolna should call when a call ends: `${APP_URL}/api/voice/webhook`

The system prompt should be ~400 words, warm, professional, Hinglish. The agent should NEVER:
- Quote prices not in the variables
- Promise availability without checking
- Discuss home loan rates
- Speak more than 2 sentences without pausing for the lead to respond

### 2. Voice package

Create `packages/voice/src/`:

- `bolna.ts` — wraps the Bolna REST API. Exports:
  - `triggerCall(leadId: string): Promise<{ bolnaCallId: string }>` — looks up the lead, project, and client; builds the variables object; POSTs to Bolna's `/call` endpoint; inserts a row into `call_logs` with status pending.
  - `getCallStatus(bolnaCallId: string)` — for manual debugging.
- `webhook-handler.ts` — exported function that takes Bolna's webhook payload and:
  1. Validates the signature (Bolna sends an HMAC header)
  2. Finds the matching `call_logs` row by `bolna_call_id`
  3. Updates with duration, transcript, recording url, ended_at
  4. Calls Claude with a prompt to: (a) classify outcome from the 5 enums, (b) score the lead 0-100, (c) write a 2-sentence summary, (d) detect sentiment
  5. Updates the `leads` row with new score, status (`contacted` if no answer, `qualified` if qualified, `not_qualified` if not, etc.), and `last_contacted_at = now()`
  6. If qualified, triggers the WhatsApp follow-up (call `inngest.send('lead.qualified', { leadId })` — Inngest function defined in next prompt)
  7. If no_answer, schedules a retry via Inngest: 30 min later, then 4 hours later, then next day at 11am IST. Max 3 retries.

### 3. The Claude call-classification prompt

In `packages/core/src/prompts/classify-call.ts`, export the prompt as a constant. It should take the transcript and project context and return strict JSON:

```json
{
  "outcome": "qualified" | "not_qualified" | "callback" | "wrong_number" | "no_answer",
  "score": 0-100,
  "summary": "2 sentences max",
  "sentiment": "positive" | "neutral" | "negative",
  "objections": ["budget", "timeline", "location", ...],
  "next_action": "send_whatsapp_brochure" | "schedule_site_visit" | "callback_in_2_days" | "drop"
}
```

Use Claude's structured output with response prefilling. Validate with Zod on return.

### 4. API routes

- `POST /api/voice/trigger` — body `{ leadId }`. Calls `triggerCall`. Returns 200 + `bolnaCallId`.
- `POST /api/voice/webhook` — receives Bolna webhooks. Calls `webhook-handler`. Returns 200 always (so Bolna doesn't retry).

### 5. Auto-trigger on lead creation

Modify the `/api/leads/intake` route from prompt 01: after inserting a lead, fire an Inngest event `lead.created`. Then create an Inngest function `auto-call-new-lead`:
- Triggered by `lead.created`
- Waits 90 seconds (gives the lead's hands time to leave the phone — calling too fast is creepy)
- Calls `triggerCall(leadId)`
- If during 9pm IST – 9am IST window, delay until 10am IST

Set up Inngest with the local dev server. Add `pnpm inngest:dev` script to root.

### 6. Pipeline view (minimal)

Update the home page `/` to show a simple table of last 50 leads with columns: name (masked), project, source, status, score, last_contacted_at. Auto-refresh every 30 seconds via React Server Component revalidation. Add a "Trigger call" button on each row that hits `/api/voice/trigger` for manual testing.

### 7. Test fixtures

In `scripts/seed.ts`: insert 1 dummy client, 1 dummy project, 3 dummy leads with my own phone number (read from env `TEST_PHONE`). Add to `.env.example`.

---

## Deliverables

When done I should be able to:
1. Run `pnpm dev` + `pnpm inngest:dev`
2. Hit `/api/leads/intake` with test data
3. See my phone ring within 2 minutes
4. Have a conversation in Hinglish with the agent
5. Hang up and see the lead's status, score, and summary updated in the pipeline view within ~10 seconds

Show me the markdown file at `docs/bolna-agent-setup.md` at the end so I can configure Bolna manually.

Stop after voice agent is done. Do NOT start the follow-up engine.
