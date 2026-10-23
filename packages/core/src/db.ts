import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Client, Project, Lead, CallLog, Message, Campaign, SocialPost, Event } from './types';

let supabaseClientInstance: SupabaseClient | null = null;
let supabaseServerInstance: SupabaseClient | null = null;

export function getSupabaseClient() {
  if (supabaseClientInstance) return supabaseClientInstance;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables');
  }

  supabaseClientInstance = createClient(url, key);
  return supabaseClientInstance;
}

export function getSupabaseServer() {
  if (supabaseServerInstance) return supabaseServerInstance;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables');
  }

  supabaseServerInstance = createClient(url, key);
  return supabaseServerInstance;
}

// Lazy proxies so the client is only constructed on first access (and env is
// only required at call time, not import time). Dynamic prop access is cast
// through `Record<string, unknown>` since the key isn't statically known here.
export const supabaseClient = new Proxy({}, {
  get: (target, prop) => (getSupabaseClient() as unknown as Record<string, unknown>)[prop as string],
}) as SupabaseClient;

export const supabaseServer = new Proxy({}, {
  get: (target, prop) => (getSupabaseServer() as unknown as Record<string, unknown>)[prop as string],
}) as SupabaseClient;

/**
 * Schema shape mapped to the Zod-inferred domain types in `types.ts`.
 * `Row` is the persisted shape; `Insert`/`Update` are partials for writes.
 * Not yet threaded into `createClient<Database>()` — selects with joins return
 * shapes that differ from a single Row, so call sites stay loosely typed until
 * generated Supabase types (`supabase gen types typescript`) replace this.
 */
type TableType<T> = { Row: T; Insert: Partial<T>; Update: Partial<T> };

export interface Database {
  public: {
    Tables: {
      clients: TableType<Client>;
      projects: TableType<Project>;
      leads: TableType<Lead>;
      call_logs: TableType<CallLog>;
      messages: TableType<Message>;
      campaigns: TableType<Campaign>;
      social_posts: TableType<SocialPost>;
      events: TableType<Event>;
    };
  };
}
