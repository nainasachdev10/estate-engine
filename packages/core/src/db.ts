import { createClient } from '@supabase/supabase-js';

let supabaseClientInstance: any = null;
let supabaseServerInstance: any = null;

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

export const supabaseClient = new Proxy({}, {
  get: (target, prop) => getSupabaseClient()[prop as string],
}) as any;

export const supabaseServer = new Proxy({}, {
  get: (target, prop) => getSupabaseServer()[prop as string],
}) as any;

export interface Database {
  public: {
    Tables: {
      clients: { Row: any; Insert: any; Update: any };
      projects: { Row: any; Insert: any; Update: any };
      leads: { Row: any; Insert: any; Update: any };
      call_logs: { Row: any; Insert: any; Update: any };
      messages: { Row: any; Insert: any; Update: any };
      campaigns: { Row: any; Insert: any; Update: any };
      social_posts: { Row: any; Insert: any; Update: any };
      events: { Row: any; Insert: any; Update: any };
    };
  };
}
