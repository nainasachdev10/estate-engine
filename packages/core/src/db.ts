import type { SupabaseClient } from '@supabase/supabase-js';
import type { Client, Project, Lead, CallLog, Message, Campaign, SocialPost, Event } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// SUPABASE DISABLED (temporarily). Every DB / auth / storage call in the app now
// hits a no-op stub: reads return empty (`[]`, or `null` for .single()), writes
// and sign-ins return an error. Nothing touches the network.
//
// TO RE-ENABLE: search the repo for "SUPABASE DISABLED", delete each stub block
// and uncomment the original code beneath it. Files touched:
//   packages/core/src/db.ts (this file)
//   apps/web/middleware.ts
//   apps/web/utils/supabase/server.ts, apps/web/utils/supabase/middleware.ts
//   apps/web/app/login/page.tsx, app/request-access/page.tsx,
//   app/components/sidebar.tsx, app/auth/callback/route.ts
// ─────────────────────────────────────────────────────────────────────────────

export const SUPABASE_DISABLED = true;
const DISABLED_ERROR = { message: 'Supabase is disabled — see packages/core/src/db.ts', code: 'SUPABASE_DISABLED' };
const WRITE_OPS = new Set(['insert', 'update', 'upsert', 'delete']);

/** Chainable, awaitable query builder that resolves to an empty result. */
function disabledQuery(state: { single: boolean; write: boolean }): unknown {
  return new Proxy(function () {}, {
    get(_t, prop) {
      if (prop === 'then') {
        const result = state.write
          ? { data: null, error: DISABLED_ERROR, count: 0, status: 503, statusText: 'disabled' }
          : { data: state.single ? null : [], error: null, count: 0, status: 200, statusText: 'disabled' };
        return (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(result).then(res, rej);
      }
      return () => disabledQuery({
        single: state.single || prop === 'single' || prop === 'maybeSingle',
        write: state.write || WRITE_OPS.has(String(prop)),
      });
    },
  });
}

/** Auth namespace: always signed out; sign-in/up/admin calls fail. */
function disabledAuth(): unknown {
  const empty = { user: null, session: null, url: null, users: [] };
  return new Proxy({}, {
    get(_t, prop) {
      if (prop === 'admin') return disabledAuth();
      if (prop === 'onAuthStateChange') return () => ({ data: { subscription: { unsubscribe() {} } } });
      const ok = prop === 'getUser' || prop === 'getSession' || prop === 'signOut';
      return async () => ({ data: empty, error: ok ? null : DISABLED_ERROR });
    },
  });
}

/** Storage namespace: uploads fail, URLs are empty. */
function disabledStorage(): unknown {
  return {
    from: () => new Proxy({}, {
      get(_t, prop) {
        if (prop === 'getPublicUrl') return () => ({ data: { publicUrl: '' } });
        return async () => ({ data: null, error: DISABLED_ERROR });
      },
    }),
  };
}

/** Drop-in replacement for a Supabase client. Typed as one so call sites compile unchanged. */
export function createDisabledSupabase(): SupabaseClient {
  return new Proxy({}, {
    get(_t, prop) {
      if (prop === 'auth') return disabledAuth();
      if (prop === 'storage') return disabledStorage();
      if (prop === 'channel') return () => ({ on() { return this; }, subscribe() { return this; }, unsubscribe() {} });
      if (prop === 'removeChannel' || prop === 'removeAllChannels') return async () => 'ok';
      return () => disabledQuery({ single: false, write: false }); // from(), rpc(), schema()
    },
  }) as SupabaseClient;
}

const disabledClient = createDisabledSupabase();
export function getSupabaseClient(): SupabaseClient { return disabledClient; }
export function getSupabaseServer(): SupabaseClient { return disabledClient; }
export const supabaseClient = disabledClient;
export const supabaseServer = disabledClient;

// ── Original implementation (restore when re-enabling Supabase) ──────────────
// import { createClient, type SupabaseClient } from '@supabase/supabase-js';
// import type { Client, Project, Lead, CallLog, Message, Campaign, SocialPost, Event } from './types';
//
// let supabaseClientInstance: SupabaseClient | null = null;
// let supabaseServerInstance: SupabaseClient | null = null;
//
// export function getSupabaseClient() {
//   if (supabaseClientInstance) return supabaseClientInstance;
//
//   const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
//   const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
//
//   if (!url || !key) {
//     throw new Error('Missing Supabase environment variables');
//   }
//
//   supabaseClientInstance = createClient(url, key);
//   return supabaseClientInstance;
// }
//
// export function getSupabaseServer() {
//   if (supabaseServerInstance) return supabaseServerInstance;
//
//   const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
//   const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
//
//   if (!url || !key) {
//     throw new Error('Missing Supabase environment variables');
//   }
//
//   supabaseServerInstance = createClient(url, key);
//   return supabaseServerInstance;
// }
//
// // Lazy proxies so the client is only constructed on first access (and env is
// // only required at call time, not import time). Dynamic prop access is cast
// // through `Record<string, unknown>` since the key isn't statically known here.
// export const supabaseClient = new Proxy({}, {
//   get: (target, prop) => (getSupabaseClient() as unknown as Record<string, unknown>)[prop as string],
// }) as SupabaseClient;
//
// export const supabaseServer = new Proxy({}, {
//   get: (target, prop) => (getSupabaseServer() as unknown as Record<string, unknown>)[prop as string],
// }) as SupabaseClient;

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
