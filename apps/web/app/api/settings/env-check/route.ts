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
  'ANTHROPIC_API_KEY',
  'BOLNA_API_KEY',
  'BOLNA_AGENT_ID',
  'AISENSY_API_KEY',
  'BREVO_API_KEY',
  'INNGEST_EVENT_KEY',
  'POSTHOG_KEY',
] as const;

export async function GET() {
  const result: Record<string, boolean> = {};
  for (const v of REQUIRED_VARS) {
    result[v] = isConfigured(v);
  }
  // Also surface a couple of optional public vars used by the front end
  result['NEXT_PUBLIC_POSTHOG_KEY'] = isConfigured('NEXT_PUBLIC_POSTHOG_KEY');
  result['NEXT_PUBLIC_APP_URL'] = isConfigured('NEXT_PUBLIC_APP_URL');

  return NextResponse.json({ vars: result });
}
