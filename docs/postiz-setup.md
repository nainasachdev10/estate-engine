# Social Scheduler Setup (Postiz / Ayrshare)

The social engine writes posts via the `schedulePost()` function in
`packages/social/src/scheduler.ts`. That function is provider-agnostic — it
reads `SOCIAL_PROVIDER` from env and dispatches accordingly.

In dev, leave `SOCIAL_PROVIDER` unset to get the **mock** provider, which
logs and returns a fake `externalId`. Drafts get approved into a "scheduled"
state without actually posting anywhere — useful for end-to-end testing.

## Option A — Postiz Cloud (postiz.com)

Postiz is open-source and offers a hosted plan. Best fit if you want to keep
the option open to self-host later for cost savings.

### Steps

1. Sign up at https://postiz.com.
2. Connect your client's social accounts (Instagram, Facebook, LinkedIn, Twitter)
   inside the Postiz dashboard. Each client may need their own Postiz workspace,
   or you can multi-tenant inside one workspace.
3. Go to **Settings → API** and copy your API key.
4. Set the following in `apps/web/.env.local` (or your Vercel project env):

```bash
SOCIAL_PROVIDER=postiz
POSTIZ_API_KEY=your-api-key
POSTIZ_API_URL=https://api.postiz.com/v1/posts  # only needed if self-hosting
```

If you self-host Postiz on Railway / Fly, point `POSTIZ_API_URL` at your
deployment.

### Cost estimate

- Postiz Cloud: ~$20/mo per workspace.
- Self-hosted on Railway: ~$5/mo of infra + your time. Saves ₹2K/mo per
  client at scale (the rationale captured in the project decisions log).

## Option B — Ayrshare (ayrshare.com)

Ayrshare is the simpler, faster-to-integrate option. No self-hosting required.

### Steps

1. Sign up at https://app.ayrshare.com.
2. Connect each client's social accounts under their Ayrshare workspace.
3. Grab the API key from **Dashboard → API Keys**.
4. Set in `apps/web/.env.local`:

```bash
SOCIAL_PROVIDER=ayrshare
AYRSHARE_API_KEY=your-api-key
```

### Cost estimate

- Ayrshare Premium: ~$49/mo per profile.
- More expensive at scale than Postiz, but zero ops overhead.

## Switching providers

Both providers implement the same `schedulePost({ platform, caption,
mediaUrls, scheduledAt })` interface in `packages/social/src/scheduler.ts`.
You can swap at any time by flipping `SOCIAL_PROVIDER` — existing rows in
`social_posts` are unaffected.

> If `SOCIAL_PROVIDER` is missing or unknown, the scheduler falls back to
> the mock provider. This is the safe default for local dev.

## Webhooks (future work)

Neither provider sends "post published" webhooks by default. To flip a row
from `scheduled` to `posted` automatically, we will need to either:

- Poll the provider's `/posts` endpoint on an Inngest cron.
- Or, if Postiz, subscribe to its webhook events under
  `apps/web/app/api/social/webhook/route.ts` (TBD).

Until then, the `status` field stays at `scheduled` and gets bumped to
`posted` manually from the social calendar UI.
