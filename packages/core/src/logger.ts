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
    const logData = {
      kind,
      payload,
      lead_id: options?.leadId || null,
      project_id: options?.projectId || null,
    };

    const { error } = await supabaseServer.from('events').insert([logData]);

    if (error) {
      console.error(`Failed to log event ${kind}:`, error);
      return;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[${kind}]`, payload);
    }
  } catch (err) {
    console.error(`Exception in logEvent:`, err);
  }
}

export function maskPII(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const masked = { ...data };

  if (masked.phone_e164) {
    masked.phone_e164 = `+91****${masked.phone_e164.slice(-4)}`;
  }

  if (masked.email) {
    const [user] = masked.email.split('@');
    masked.email = `${user.slice(0, 2)}***@***`;
  }

  return masked;
}
