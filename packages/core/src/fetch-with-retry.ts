/**
 * fetch-with-retry.ts — Resilient HTTP client with exponential backoff.
 *
 * Retries on transient network errors and specific HTTP status codes.
 * Respects Retry-After headers from 429 responses.
 * Logs permanent failures via logEvent.
 */

import { logEvent } from './logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RetryOptions {
  /** Total number of attempts (first try + retries). Default: 3 */
  attempts?: number;
  /** Base delay in ms for exponential backoff. Default: 500 */
  baseDelayMs?: number;
  /** Provider name for structured logging (e.g. 'bolna', 'meta'). */
  provider?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Status codes that warrant a retry. */
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

/**
 * Strips the query string and replaces path segments that look like IDs
 * (UUIDs, numeric IDs, 20+ char opaque strings) with ':id'.
 *
 * Examples:
 *   /leads/550e8400-e29b-41d4-a716-446655440000/call  →  /leads/:id/call
 *   /users/12345                                       →  /users/:id
 */
function maskUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    const maskedPath = u.pathname
      .split('/')
      .map((segment) => {
        if (!segment) return segment;
        // UUID pattern
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) {
          return ':id';
        }
        // Pure numeric ID
        if (/^\d{4,}$/.test(segment)) {
          return ':id';
        }
        // Long opaque token / API key fragment (20+ chars, no dots)
        if (segment.length >= 20 && !segment.includes('.')) {
          return ':id';
        }
        return segment;
      })
      .join('/');
    return `${u.origin}${maskedPath}`;
  } catch {
    // If URL parsing fails, strip everything after '?'
    return rawUrl.split('?')[0];
  }
}

/**
 * Parses a Retry-After header value and returns the number of milliseconds
 * to wait.  Accepts both integer-seconds and HTTP-date formats.
 */
function parseRetryAfterMs(headerValue: string): number | null {
  const trimmed = headerValue.trim();

  // Integer seconds
  const seconds = parseInt(trimmed, 10);
  if (!isNaN(seconds) && String(seconds) === trimmed) {
    return Math.max(0, seconds * 1000);
  }

  // HTTP-date (e.g. "Wed, 07 Jun 2026 12:00:00 GMT")
  const date = new Date(trimmed);
  if (!isNaN(date.getTime())) {
    return Math.max(0, date.getTime() - Date.now());
  }

  return null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Wraps the global `fetch` with automatic retry and backoff.
 *
 * @throws The last encountered error/response after all attempts are exhausted.
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  options: RetryOptions = {}
): Promise<Response> {
  const { attempts = 3, baseDelayMs = 500, provider = 'unknown' } = options;

  const maskedUrl = maskUrl(url);
  let lastStatus: number | undefined;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, init);

      if (response.ok) {
        return response;
      }

      lastStatus = response.status;

      // Non-retryable 4xx — return immediately without logging as exhausted
      if (!RETRYABLE_STATUSES.has(response.status)) {
        return response;
      }

      // Last attempt — fall through to log + throw
      if (attempt === attempts) {
        break;
      }

      // Respect Retry-After on 429
      let waitMs: number;
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const parsed = retryAfter ? parseRetryAfterMs(retryAfter) : null;
        waitMs = parsed ?? baseDelayMs * Math.pow(2, attempt - 1);
      } else {
        waitMs = baseDelayMs * Math.pow(2, attempt - 1);
      }

      await delay(waitMs);
    } catch (err) {
      // Network-level error (DNS failure, connection refused, etc.)
      lastError = err;

      if (attempt === attempts) {
        break;
      }

      const waitMs = baseDelayMs * Math.pow(2, attempt - 1);
      await delay(waitMs);
    }
  }

  // All attempts exhausted — log and propagate
  await logEvent('fetch_retry_exhausted', {
    provider,
    url: maskedUrl,
    status: lastStatus,
    attempts,
    error: lastError instanceof Error ? lastError.message : String(lastError ?? ''),
  });

  if (lastError) {
    throw lastError;
  }

  // Return a synthetic 503 so callers always get a Response object
  return new Response(JSON.stringify({ error: 'fetch_retry_exhausted' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' },
  });
}
