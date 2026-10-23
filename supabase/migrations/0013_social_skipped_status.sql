-- Allow 'skipped' as a social_posts status.
--
-- The Social calendar UI lets an operator Skip a draft post (distinct from a
-- provider failure). The original 0001 CHECK constraint only permitted
-- draft/scheduled/posted/failed, so the Skip action previously had to persist
-- 'failed', which mislabels a deliberate skip as an error on page reload.
--
-- Safe/idempotent: drops the old constraint if present and recreates it with
-- the expanded value set. No existing rows are invalidated.

ALTER TABLE social_posts DROP CONSTRAINT IF EXISTS social_posts_status_check;

ALTER TABLE social_posts
  ADD CONSTRAINT social_posts_status_check
  CHECK (status IN ('draft', 'scheduled', 'posted', 'failed', 'skipped'));
