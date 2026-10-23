-- CRITICAL security fix: drop the permissive "allow everyone" RLS policies.
--
-- Every table was created with `CREATE POLICY "all" ... FOR ALL USING (true)`,
-- which grants the PUBLIC (anon) role full SELECT/INSERT/UPDATE/DELETE via
-- Supabase's auto-generated REST API. The anon key ships in the browser bundle
-- of every public landing page — so anyone could dump leads (names + phones),
-- call transcripts, messages, and client API credentials, or modify them.
--
-- The app performs ALL table access server-side with the service-role key
-- (which bypasses RLS); browser-side Supabase usage is auth-only. Therefore:
-- RLS stays ENABLED and all permissive policies are dropped — anon gets
-- nothing, the server keeps working unchanged.

DROP POLICY IF EXISTS "all" ON clients;
DROP POLICY IF EXISTS "all" ON projects;
DROP POLICY IF EXISTS "all" ON leads;
DROP POLICY IF EXISTS "all" ON call_logs;
DROP POLICY IF EXISTS "all" ON messages;
DROP POLICY IF EXISTS "all" ON campaigns;
DROP POLICY IF EXISTS "all" ON social_posts;
DROP POLICY IF EXISTS "all" ON events;
DROP POLICY IF EXISTS "all" ON wa_templates;
DROP POLICY IF EXISTS "all" ON ad_creative_media;
DROP POLICY IF EXISTS "all" ON webhook_events;
DROP POLICY IF EXISTS "all" ON lead_triggers;
