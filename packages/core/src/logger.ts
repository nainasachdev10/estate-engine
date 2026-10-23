import { supabaseServer } from './db';

export interface EventPayload {
  [key: string]: any;
}

export async function logEvent(
  kind: string,
  payload: EventPayload,
  options?: {
    leadId?: string;
    projectId?: string;
  }
) {
  try {
    const safePayload = maskPII(payload);
    const logData = {
      kind,
      payload: safePayload,
      lead_id: options?.leadId || null,
      project_id: options?.projectId || null,
    };

    const { error } = await supabaseServer.from('events').insert([logData]);

    if (error) {
      console.error(`Failed to log event ${kind}:`, error);
      return;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[${kind}]`, safePayload);
    }
  } catch (err) {
    console.error(`Exception in logEvent:`, err);
  }
}

const PHONE_KEYS = new Set(['phone_e164', 'phone', 'mobile', 'phone_number']);
const EMAIL_KEYS = new Set(['email', 'to', 'contact_email']);

function maskPhoneValue(v: string): string {
  return `+91****${v.slice(-4)}`;
}

function maskEmailValue(v: string): string {
  const [user] = v.split('@');
  return `${user.slice(0, 2)}***@***`;
}

/**
 * Recursively masks PII (phones, emails) anywhere in an event payload — not
 * just at the top level, since payloads routinely nest lead rows or provider
 * responses (e.g. dailyReport's hotLeads array).
 */
export function maskPII(data: any, depth = 0): any {
  if (depth > 6 || typeof data !== 'object' || data === null) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => maskPII(item, depth + 1));
  }

  const masked: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string' && value && PHONE_KEYS.has(key)) {
      masked[key] = maskPhoneValue(value);
    } else if (typeof value === 'string' && value.includes('@') && EMAIL_KEYS.has(key)) {
      masked[key] = maskEmailValue(value);
    } else {
      masked[key] = maskPII(value, depth + 1);
    }
  }
  return masked;
}
