import { NextRequest, NextResponse } from 'next/server';

/**
 * Verify caller is an internal/admin request.
 * Internal routes require header: X-Internal-Token: <INTERNAL_API_SECRET>
 *
 * Set INTERNAL_API_SECRET in Vercel env vars to a random 32-char string.
 * All internal tooling (seed scripts, Inngest, etc.) must pass this header.
 */
export function requireInternalToken(request: NextRequest): NextResponse | null {
  const secret = process.env.INTERNAL_API_SECRET;

  // If not configured (dev/first boot), allow but warn
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'INTERNAL_API_SECRET not configured' }, { status: 500 });
    }
    return null; // allow in dev
  }

  const token = request.headers.get('x-internal-token');
  if (!token || token !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null; // allowed
}

/**
 * Simple rate limit check via Supabase events table.
 * Returns true if the caller has exceeded the limit.
 */
export async function isRateLimited(
  key: string,
  maxPerMinute: number
): Promise<boolean> {
  // Lightweight in-memory rate limit using a module-level map
  // Works per-serverless-instance — not distributed, but good enough for abuse prevention
  const now = Date.now();
  const window = 60_000;
  const counts = rateLimitMap.get(key) ?? [];
  const recent = counts.filter((t) => now - t < window);
  if (recent.length >= maxPerMinute) return true;
  recent.push(now);
  rateLimitMap.set(key, recent);
  return false;
}

const rateLimitMap = new Map<string, number[]>();
