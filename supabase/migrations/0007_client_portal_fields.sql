-- Add slug and portal_allowed_emails to clients table
-- slug: URL-safe identifier for client portal (e.g. /portal/naina)
-- portal_allowed_emails: additional emails permitted to view the portal beyond contact_email
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS portal_allowed_emails TEXT[] DEFAULT '{}';

-- Partial unique index on non-null slugs (allows multiple clients with null slug)
-- ON CONFLICT usage: ON CONFLICT (slug) WHERE slug IS NOT NULL
CREATE UNIQUE INDEX IF NOT EXISTS clients_slug_unique ON clients (slug) WHERE slug IS NOT NULL;
