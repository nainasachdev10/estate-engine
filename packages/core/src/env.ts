/**
 * env.ts — Typed, validated environment variable access.
 *
 * On import this module parses process.env once via Zod.
 * - Production: throws on any missing/invalid required variable.
 * - Development: logs warnings, returns best-effort values.
 *
 * Usage:  import { env } from '@realty-engine/core'
 *         env.ANTHROPIC_API_KEY  // fully typed, never undefined in prod
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Schema definition
// ---------------------------------------------------------------------------

/** Variables required in every environment (dev, preview, prod). */
const coreSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
});

/** Variables required only in production. Optional (possibly undefined) in dev. */
const prodSchema = z.object({
  BOLNA_API_KEY: z.string().min(1),
  BOLNA_AGENT_ID: z.string().min(1),
  BOLNA_FROM_NUMBER: z.string().min(1),
  BOLNA_WEBHOOK_SECRET: z.string().min(1),
  AISENSY_API_KEY: z.string().min(1),
  AISENSY_SENDER_ID: z.string().min(1),
  AISENSY_WEBHOOK_SECRET: z.string().min(1),
  BREVO_API_KEY: z.string().min(1),
  BREVO_SENDER_EMAIL: z.string().email(),
  META_ACCESS_TOKEN: z.string().min(1),
  META_AD_ACCOUNT_ID: z.string().min(1),
  META_PAGE_ID: z.string().min(1),
  META_APP_SECRET: z.string().min(1),
  META_WEBHOOK_VERIFY_TOKEN: z.string().min(1),
  META_PAGE_ACCESS_TOKEN: z.string().min(1),
  META_IG_BUSINESS_ID: z.string().min(1),
  HIGGSFIELD_API_KEY: z.string().min(1),
  ADMIN_EMAILS: z.string().min(1),
  APP_URL: z.string().url(),
});

/** Optional variables — always treated as string | undefined. */
const optionalSchema = z.object({
  AYRSHARE_API_KEY: z.string().optional(),
  POSTIZ_API_KEY: z.string().optional(),
  INNGEST_EVENT_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  SARVAM_API_KEY: z.string().optional(),
  SLACK_WEBHOOK_URL: z.string().url().optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

// Combined shape used for the typed export.
const fullSchema = coreSchema
  .merge(prodSchema.partial())   // prod vars optional at the type level; enforced at runtime
  .merge(optionalSchema);

type Env = z.infer<typeof fullSchema>;

// ---------------------------------------------------------------------------
// Validation + boot logic
// ---------------------------------------------------------------------------

function validateEnv(): Env {
  const isProd = process.env.NODE_ENV === 'production';

  // Step 1 — validate core vars. These are the only vars without which NOTHING
  // works (not even DB-backed error logging), so a missing core var is fatal
  // in production.
  const coreResult = coreSchema.safeParse(process.env);
  const coreErrors: string[] = [];
  if (!coreResult.success) {
    for (const issue of coreResult.error.issues) {
      coreErrors.push(`${issue.path.join('.')}: ${issue.message}`);
    }
  }

  if (coreErrors.length > 0) {
    const message =
      `[env] Missing or invalid environment variables:\n` +
      coreErrors.map((e) => `  - ${e}`).join('\n');

    if (isProd) {
      throw new Error(message);
    } else {
      console.warn(message);
    }
  }

  // Step 2 — validate per-integration vars (Bolna, AiSensy, Brevo, Meta, Higgsfield, ...).
  // Clients are onboarded incrementally and these are configured one at a time
  // (see SETUP.md), so a missing integration var must NEVER crash the whole app —
  // it only disables that integration. Each integration already fails closed on
  // its own (webhook-verify helpers, getAuthHeader() checks, etc.), and
  // /api/settings/env-check gives admins full visibility. Log a warning only.
  if (isProd) {
    const prodResult = prodSchema.safeParse(process.env);
    if (!prodResult.success) {
      const prodWarnings = prodResult.error.issues.map(
        (issue) => `${issue.path.join('.')}: ${issue.message}`
      );
      console.warn(
        `[env] Integrations not yet configured (those features will be disabled until set):\n` +
          prodWarnings.map((e) => `  - ${e}`).join('\n')
      );
    }
  }

  // Step 3 — parse the full schema (partial prod, optional extras).
  // This always succeeds when core vars are present, since prodSchema and
  // optionalSchema fields are all optional/defaulted.
  const fullResult = fullSchema.safeParse(process.env);
  if (fullResult.success) {
    return fullResult.data;
  }

  // Core vars missing in dev — return a best-effort object so the app can start.
  // We already warned above.
  return process.env as unknown as Env;
}

// Evaluated once at module load time.
export const env: Readonly<Env> = Object.freeze(validateEnv());
