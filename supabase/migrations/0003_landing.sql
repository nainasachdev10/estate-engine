-- Landing page + brand voice extensions

-- Add public landing page fields to projects
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS public_slug TEXT,
  ADD COLUMN IF NOT EXISTS hero_image_url TEXT,
  ADD COLUMN IF NOT EXISTS gallery_urls TEXT[],
  ADD COLUMN IF NOT EXISTS floor_plan_urls TEXT[],
  ADD COLUMN IF NOT EXISTS usp_bullets TEXT[],
  ADD COLUMN IF NOT EXISTS developer_about TEXT,
  ADD COLUMN IF NOT EXISTS rera_number TEXT;

-- Unique index so /p/[slug] resolves deterministically
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_public_slug_unique
  ON projects(public_slug)
  WHERE public_slug IS NOT NULL;

-- Brand voice notes for ad/content generation
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS brand_voice_notes TEXT;

-- Public-facing slug for the client portal (no auth yet — see TODO)
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_slug_unique
  ON clients(slug)
  WHERE slug IS NOT NULL;

-- Social posts: track theme + post_type so the calendar UI can group
ALTER TABLE social_posts
  ADD COLUMN IF NOT EXISTS theme TEXT,
  ADD COLUMN IF NOT EXISTS post_type TEXT,
  ADD COLUMN IF NOT EXISTS hashtags TEXT[],
  ADD COLUMN IF NOT EXISTS media_brief TEXT,
  ADD COLUMN IF NOT EXISTS external_post_id TEXT;

CREATE INDEX IF NOT EXISTS idx_social_posts_project_scheduled
  ON social_posts(project_id, scheduled_at);
