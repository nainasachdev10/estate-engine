-- 1. Allow 'meta_leadads' as a lead source.
--
-- The Meta Lead Ads webhook (/api/leads/meta-lead-ads-webhook) inserts leads
-- with source = 'meta_leadads', but the original 0001 CHECK constraint only
-- permitted meta/google/99acres/organic/walkin/manual — so every lead arriving
-- from a Meta Instant Form failed the constraint and was silently dropped
-- (the webhook logs the failure and still returns 200 to Meta).
--
-- Safe/idempotent: drops the old constraint if present and recreates it with
-- the expanded value set. No existing rows are invalidated.

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_source_check;

ALTER TABLE leads
  ADD CONSTRAINT leads_source_check
  CHECK (source IN ('meta', 'meta_leadads', 'google', '99acres', 'organic', 'walkin', 'manual'));

-- 2. Widen project price columns to BIGINT.
--
-- price_min_paise / price_max_paise were INTEGER (max ~2.1e9). The app stores
-- rupee values in these columns today (all formatters divide by 1e7 for Cr),
-- so ₹21 Cr already sits at the INT4 ceiling and anything above overflows on
-- insert. BIGINT removes the ceiling either way. Idempotent: re-running is a
-- no-op type change.

ALTER TABLE projects
  ALTER COLUMN price_min_paise TYPE BIGINT,
  ALTER COLUMN price_max_paise TYPE BIGINT;

-- campaigns money columns get the same treatment for consistency/safety.
ALTER TABLE campaigns
  ALTER COLUMN budget_paise_daily TYPE BIGINT,
  ALTER COLUMN spend_paise TYPE BIGINT;
