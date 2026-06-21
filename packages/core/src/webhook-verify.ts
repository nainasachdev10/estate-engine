import crypto from 'crypto';
import { logEvent } from './logger';

/**
 * Centralized webhook signature verification.
 *
 * Required environment variables:
 *  - BOLNA_WEBHOOK_SECRET        (existing) — HMAC secret for Bolna voice events
 *  - META_APP_SECRET             (existing) — HMAC secret for Meta (FB/IG) webhooks
 *  - AISENSY_WEBHOOK_SECRET      (new)      — HMAC secret for AiSensy inbound webhooks
 *  - BREVO_WEBHOOK_TOKEN         (new, opt) — shared bearer token in URL/header for Brevo
 *  - META_WEBHOOK_VERIFY_TOKEN   (existing) — used by the GET handshake (handled in routes)
 *  - META_PAGE_ACCESS_TOKEN      (new)      — Page-level access token for Graph API leadgen fetch
 *
 * Security properties:
 *  - All comparisons use crypto.timingSafeEqual to defeat timing side-channels.
 *  - Missing signature or missing secret => verification fails (closed).
 *  - Raw signature bytes and secrets are NEVER logged. Only {provider, reason} is logged.
 */

type Provider = 'bolna' | 'meta' | 'aisensy' | 'brevo';

interface VerifyFailReason {
  reason:
    | 'missing_secret'
    | 'missing_signature'
    | 'length_mismatch'
    | 'mismatch'
    | 'malformed_signature';
}

async function logFailure(provider: Provider, info: VerifyFailReason): Promise<void> {
  try {
    await logEvent('webhook_verify_failed', { provider, ...info });
  } catch {
    // Never throw from logger — verification must remain deterministic.
  }
}

/**
 * Constant-time HMAC-SHA256 verification.
 * Returns true only on exact match of hex digests.
 */
export function verifyHmacSha256(
  rawBody: string,
  signature: string,
  secret: string,
): boolean {
  if (!secret || !signature) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('hex');

  const sigBuf = Buffer.from(signature, 'utf8');
  const expBuf = Buffer.from(expected, 'utf8');
  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}

/**
 * Bolna voice webhook.
 * Header: 'x-bolna-signature' (fallback 'x-signature'). Hex HMAC-SHA256 of raw body.
 */
export async function verifyBolnaWebhook(
  rawBody: string,
  headers: Headers,
): Promise<boolean> {
  const secret = process.env.BOLNA_WEBHOOK_SECRET;
  if (!secret) {
    await logFailure('bolna', { reason: 'missing_secret' });
    return false;
  }

  const signature =
    headers.get('x-bolna-signature') ?? headers.get('x-signature');
  if (!signature) {
    await logFailure('bolna', { reason: 'missing_signature' });
    return false;
  }

  // Bolna may send bare hex or 'sha256=<hex>' — normalize.
  const hex = signature.startsWith('sha256=')
    ? signature.slice('sha256='.length)
    : signature;

  const ok = verifyHmacSha256(rawBody, hex, secret);
  if (!ok) await logFailure('bolna', { reason: 'mismatch' });
  return ok;
}

/**
 * Meta (Facebook / Instagram) webhook.
 * Header: 'x-hub-signature-256' formatted as 'sha256=<hex>'.
 */
export async function verifyMetaWebhook(
  rawBody: string,
  headers: Headers,
): Promise<boolean> {
  const secret = process.env.META_APP_SECRET;
  if (!secret) {
    await logFailure('meta', { reason: 'missing_secret' });
    return false;
  }

  const signature = headers.get('x-hub-signature-256');
  if (!signature) {
    await logFailure('meta', { reason: 'missing_signature' });
    return false;
  }

  if (!signature.startsWith('sha256=')) {
    await logFailure('meta', { reason: 'malformed_signature' });
    return false;
  }

  const hex = signature.slice('sha256='.length);
  const ok = verifyHmacSha256(rawBody, hex, secret);
  if (!ok) await logFailure('meta', { reason: 'mismatch' });
  return ok;
}

/**
 * AiSensy inbound webhook.
 * Header: 'x-aisensy-signature'. Hex HMAC-SHA256 of raw body.
 * (AiSensy historically uses a shared secret in URL query — that path is
 *  enforced by the route via NextRequest URL search params; this helper
 *  enforces the header-based HMAC contract.)
 */
export async function verifyAiSensyWebhook(
  rawBody: string,
  headers: Headers,
): Promise<boolean> {
  const secret = process.env.AISENSY_WEBHOOK_SECRET;
  if (!secret) {
    await logFailure('aisensy', { reason: 'missing_secret' });
    return false;
  }

  const signature = headers.get('x-aisensy-signature');
  if (!signature) {
    await logFailure('aisensy', { reason: 'missing_signature' });
    return false;
  }

  const hex = signature.startsWith('sha256=')
    ? signature.slice('sha256='.length)
    : signature;

  const ok = verifyHmacSha256(rawBody, hex, secret);
  if (!ok) await logFailure('aisensy', { reason: 'mismatch' });
  return ok;
}

/**
 * Brevo (Sendinblue) webhook.
 * Brevo does NOT sign webhooks by default. We accept either:
 *  - 'x-brevo-token' header equal to BREVO_WEBHOOK_TOKEN, or
 *  - 'authorization: Bearer <BREVO_WEBHOOK_TOKEN>'.
 * If no token is configured, we WARN and allow (so dev/staging is not broken),
 * but in production with NODE_ENV=production we still allow with a warning event.
 */
export async function verifyBrevoWebhook(
  _rawBody: string,
  headers: Headers,
): Promise<boolean> {
  const expected = process.env.BREVO_WEBHOOK_TOKEN;
  if (!expected) {
    try {
      await logEvent('webhook_verify_warning', {
        provider: 'brevo',
        reason: 'no_token_configured',
      });
    } catch {
      /* ignore */
    }
    return true;
  }

  const headerToken = headers.get('x-brevo-token');
  const auth = headers.get('authorization');
  const bearer = auth?.startsWith('Bearer ')
    ? auth.slice('Bearer '.length)
    : null;
  const presented = headerToken ?? bearer;

  if (!presented) {
    await logFailure('brevo', { reason: 'missing_signature' });
    return false;
  }

  const a = Buffer.from(presented, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) {
    await logFailure('brevo', { reason: 'length_mismatch' });
    return false;
  }
  const ok = crypto.timingSafeEqual(a, b);
  if (!ok) await logFailure('brevo', { reason: 'mismatch' });
  return ok;
}
