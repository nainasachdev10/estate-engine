import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Returns booleans indicating whether each expected env var is configured.
 *
 * SECURITY: never return actual values — only configured (true/false).
 * A var is considered configured when it's set, non-empty, and not a placeholder.
 */

const PLACEHOLDER_PREFIXES = ['your-', 'changeme', 'replace', 'xxxx'];

function isConfigured(name: string): boolean {
  const v = process.env[name];
  if (!v) return false;
  const lower = v.trim().toLowerCase();
  if (lower.length === 0) return false;
  return !PLACEHOLDER_PREFIXES.some((p) => lower.startsWith(p));
}

const REQUIRED_VARS = [
  // Core — must be set in every environment
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ANTHROPIC_API_KEY',
  // Voice
  'BOLNA_API_KEY',
  'BOLNA_AGENT_ID',
  'BOLNA_FROM_NUMBER',
  'BOLNA_WEBHOOK_SECRET',
  // WhatsApp
  'AISENSY_API_KEY',
  'AISENSY_SENDER_ID',
  'AISENSY_WEBHOOK_SECRET',
  // Email
  'BREVO_API_KEY',
  'BREVO_SENDER_EMAIL',
  // Meta Ads + Lead Ads
  'META_ACCESS_TOKEN',
  'META_AD_ACCOUNT_ID',
  'META_PAGE_ID',
  'META_APP_SECRET',
  'META_WEBHOOK_VERIFY_TOKEN',
  'META_PAGE_ACCESS_TOKEN',
  'META_IG_BUSINESS_ID',
  // Higgsfield
  'HIGGSFIELD_API_KEY',
  // Admin
  'ADMIN_EMAILS',
  'APP_URL',
] as const;

const OPTIONAL_VARS = [
  'AYRSHARE_API_KEY',
  'POSTIZ_API_KEY',
  'INNGEST_EVENT_KEY',
  'NEXT_PUBLIC_POSTHOG_KEY',
  'SARVAM_API_KEY',
  'SLACK_WEBHOOK_URL',
] as const;

export async function GET() {
  const required: Record<string, boolean> = {};
  for (const v of REQUIRED_VARS) {
    required[v] = isConfigured(v);
  }

  const optional: Record<string, boolean> = {};
  for (const v of OPTIONAL_VARS) {
    optional[v] = isConfigured(v);
  }

  const missingRequired = Object.entries(required)
    .filter(([, ok]) => !ok)
    .map(([k]) => k);

  return NextResponse.json({
    ok: missingRequired.length === 0,
    vars: { required, optional },
    missingRequired,
  });
}
