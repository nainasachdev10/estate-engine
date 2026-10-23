-- Buyer Intelligence layer (adopted from the buyer-intelligence product spec):
-- transparent scoring, "why now" triggers, horizon bands, next-best-action,
-- opt-out compliance, and referral tracking.

-- 1. Trigger records — every lead can carry "why now" evidence.
CREATE TABLE IF NOT EXISTS lead_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  trigger TEXT NOT NULL,
  evidence TEXT,
  confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
  source TEXT NOT NULL CHECK (source IN ('call', 'whatsapp', 'email', 'visit_form', 'lead_form', 'manual', 'system')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_triggers_lead ON lead_triggers(lead_id, created_at DESC);

ALTER TABLE lead_triggers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all" ON lead_triggers FOR ALL USING (true);

-- 2. Intelligence columns on leads.
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS score_breakdown JSONB,
  ADD COLUMN IF NOT EXISTS score_confidence INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS horizon TEXT CHECK (horizon IN ('hot', 'warm', 'cool')),
  ADD COLUMN IF NOT EXISTS next_best_action JSONB,
  ADD COLUMN IF NOT EXISTS do_not_contact BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES leads(id),
  ADD COLUMN IF NOT EXISTS referral_requested_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS visit_scheduled_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_leads_horizon ON leads(horizon) WHERE horizon IS NOT NULL;

-- 3. 'referral' becomes a first-class lead source (referral engine).
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_source_check;
ALTER TABLE leads
  ADD CONSTRAINT leads_source_check
  CHECK (source IN ('meta', 'meta_leadads', 'google', '99acres', 'organic', 'walkin', 'manual', 'referral'));
