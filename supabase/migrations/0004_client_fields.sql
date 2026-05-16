-- Client slug for portal URLs and seeding
ALTER TABLE clients ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS brand_voice_notes TEXT;

-- Index for portal slug lookup
CREATE INDEX IF NOT EXISTS idx_clients_slug ON clients(slug);

-- Allowed portal emails per client (operator can whitelist additional emails beyond contact_email)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_allowed_emails TEXT[];
