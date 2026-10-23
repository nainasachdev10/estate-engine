-- AI Workforce layer (acquisition scope only): unit inventory + rate cards
-- (instant cost sheets), channel-partner attribution ledger, bookings (the
-- pipeline's outcome), escalation rail, insight log, and a buyer-signal
-- review pool. Post-sale accounting/ops (dues, demand letters, compliance,
-- construction updates) was deliberately cut — out of product scope.
--
-- Money columns here are explicitly suffixed _rupees (integers, never floats)
-- to avoid the historical _paise misnomer on projects. campaigns.* keep paise.
--
-- RLS posture follows 0016: RLS enabled, NO permissive policies — all access
-- is server-side via the service-role key; anon gets nothing.

-- ── 1. Channel partners (attribution ledger) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS channel_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  firm_name TEXT,
  phone_e164 TEXT,
  email TEXT,
  cp_code TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE channel_partners ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS channel_partners_update_updated_at ON channel_partners;
CREATE TRIGGER channel_partners_update_updated_at BEFORE UPDATE ON channel_partners
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- CP attribution is LOCKED at lead creation and never reassigned — that is
-- the whole point of the ledger (one answer to "whose lead was this?").
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS channel_partner_id UUID REFERENCES channel_partners(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cp_locked_at TIMESTAMP WITH TIME ZONE;
CREATE INDEX IF NOT EXISTS idx_leads_channel_partner ON leads(channel_partner_id) WHERE channel_partner_id IS NOT NULL;

-- 'channel_partner' becomes a first-class lead source.
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_source_check;
ALTER TABLE leads
  ADD CONSTRAINT leads_source_check
  CHECK (source IN ('meta', 'meta_leadads', 'google', '99acres', 'organic', 'walkin', 'manual', 'referral', 'channel_partner'));

-- ── 2. Unit inventory + rate cards (the cost-sheet engine's data) ────────────
CREATE TABLE IF NOT EXISTS project_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tower TEXT NOT NULL,                -- e.g. 'A' … 'E'
  floor INTEGER NOT NULL CHECK (floor >= 0),
  unit_number TEXT NOT NULL,          -- e.g. 'E-2501'
  config TEXT NOT NULL,               -- e.g. '3BHK', '4BHK B', 'Duplex Penthouse'
  saleable_sqft INTEGER NOT NULL CHECK (saleable_sqft > 0),
  is_penthouse BOOLEAN DEFAULT FALSE, -- penthouse enquiries are human-only (escalation rail)
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'held', 'booked', 'registered')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (project_id, unit_number)
);
ALTER TABLE project_units ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_project_units_project ON project_units(project_id, tower, floor);
DROP TRIGGER IF EXISTS project_units_update_updated_at ON project_units;
CREATE TRIGGER project_units_update_updated_at BEFORE UPDATE ON project_units
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- One active rate card per project. All rates are ₹/sq ft in whole rupees.
CREATE TABLE IF NOT EXISTS rate_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  base_rate_rupees INTEGER NOT NULL CHECK (base_rate_rupees > 0),
  dev_charges_rupees INTEGER NOT NULL DEFAULT 0,          -- development & infra
  floor_rise_per_floor_rupees INTEGER NOT NULL DEFAULT 0, -- ₹/sqft per floor above start
  floor_rise_from_floor INTEGER NOT NULL DEFAULT 0,       -- floors <= this have no rise
  maintenance_deposit_rupees INTEGER NOT NULL DEFAULT 0,  -- one-time, at possession
  advance_maintenance_rupees INTEGER NOT NULL DEFAULT 0,  -- running maintenance, at possession
  advance_maintenance_years INTEGER NOT NULL DEFAULT 2,
  parking_slots_included INTEGER NOT NULL DEFAULT 0,
  is_demo_rate BOOLEAN DEFAULT TRUE,  -- labelled demonstration rate until the official card lands
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE rate_cards ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS rate_cards_update_updated_at ON rate_cards;
CREATE TRIGGER rate_cards_update_updated_at BEFORE UPDATE ON rate_cards
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 3. Bookings — the acquisition outcome ────────────────────────────────────
-- A booking closes the loop: blocks the unit, records the value, and carries
-- the lead's locked CP attribution into the leaderboard. Post-sale accounting
-- (dues, demand letters, compliance) is deliberately OUT of scope — Realty
-- Engine is an acquisition engine; the developer's accounting system owns that.
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES project_units(id) ON DELETE RESTRICT,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  channel_partner_id UUID REFERENCES channel_partners(id) ON DELETE SET NULL,
  buyer_name TEXT NOT NULL,
  agreement_value_rupees BIGINT NOT NULL CHECK (agreement_value_rupees > 0),
  booking_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_bookings_project ON bookings(project_id, status);
DROP TRIGGER IF EXISTS bookings_update_updated_at ON bookings;
CREATE TRIGGER bookings_update_updated_at BEFORE UPDATE ON bookings
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 7. Escalation rail (discount / complaint / penthouse / uncertain) ───────
CREATE TABLE IF NOT EXISTS escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('discount', 'complaint', 'penthouse', 'uncertain')),
  detail TEXT,                        -- what tripped it (masked, no raw PII)
  brief JSONB,                        -- closer briefing: who/what/say-first
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'handled')),
  handled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE escalations ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_escalations_open ON escalations(status, created_at DESC);

-- ── 8. Experiment log (the self-improving loop's receipts) ──────────────────
CREATE TABLE IF NOT EXISTS experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  desk TEXT NOT NULL CHECK (desk IN ('sales', 'marketing', 'intelligence', 'accounts', 'operations')),
  hypothesis TEXT NOT NULL,
  metric TEXT NOT NULL,
  baseline NUMERIC,
  variant NUMERIC,
  verdict TEXT NOT NULL CHECK (verdict IN ('keep', 'discard', 'inconclusive')),
  detail JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_experiments_created ON experiments(created_at DESC);

-- ── 9. Buyer-signal review pool (LeadHunter intake; never auto-contacted) ────
CREATE TABLE IF NOT EXISTS buyer_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('forum', 'youtube', 'community', 'gift_city', 'manual', 'other')),
  quote TEXT NOT NULL,                -- the public statement, verbatim
  url TEXT,                           -- evidence link
  segment TEXT,                       -- e.g. 'Upgrader', 'NRI'
  score INTEGER DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  why TEXT,                           -- why this is hot
  suggested_approach TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'converted', 'dismissed')),
  converted_lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE buyer_signals ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_buyer_signals_status ON buyer_signals(status, score DESC);

-- ── 10. Campaign guardrails + consortium reporting ───────────────────────────
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS audience_preset TEXT CHECK (audience_preset IN ('upgraders', 'nri', 'gift_city_professionals', 'google_high_intent')),
  ADD COLUMN IF NOT EXISTS cpl_alert_paise INTEGER;  -- flag when spend/lead exceeds this
