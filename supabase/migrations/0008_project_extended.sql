-- Extended project fields for voice agent context, visit scheduling, and lead qualification

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS site_address TEXT,
  ADD COLUMN IF NOT EXISTS possession_date DATE,
  ADD COLUMN IF NOT EXISTS total_units INTEGER,
  ADD COLUMN IF NOT EXISTS available_units INTEGER,
  ADD COLUMN IF NOT EXISTS site_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS site_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS buyer_profile TEXT;

-- faq JSONB already added in 0002_messaging.sql — no need to re-add
