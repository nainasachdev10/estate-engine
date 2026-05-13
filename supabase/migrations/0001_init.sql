-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable RLS
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated, service_role;

-- Auto-update trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Clients table
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  brand_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  gold_color_hex TEXT DEFAULT '#d4af37',
  logo_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  monthly_fee_paise INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all" ON clients FOR ALL USING (true);

CREATE TRIGGER clients_update_updated_at BEFORE UPDATE ON clients
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  segment TEXT CHECK (segment IN ('luxury', 'premium', 'mid', 'affordable', 'plot')),
  unit_type TEXT,
  price_min_paise INTEGER,
  price_max_paise INTEGER,
  brochure_url TEXT,
  key_amenities JSONB,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all" ON projects FOR ALL USING (true);

CREATE TRIGGER projects_update_updated_at BEFORE UPDATE ON projects
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Leads table
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone_e164 TEXT NOT NULL,
  email TEXT,
  source TEXT CHECK (source IN ('meta', 'google', '99acres', 'organic', 'walkin', 'manual')),
  source_meta JSONB,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'site_visit_booked', 'visited', 'negotiating', 'closed_won', 'closed_lost', 'unresponsive')),
  score INTEGER DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  language_pref TEXT DEFAULT 'hinglish' CHECK (language_pref IN ('en', 'hi', 'hinglish')),
  location_city TEXT,
  location_country TEXT DEFAULT 'India',
  notes TEXT,
  last_contacted_at TIMESTAMP WITH TIME ZONE,
  next_followup_at TIMESTAMP WITH TIME ZONE,
  assigned_to UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all" ON leads FOR ALL USING (true);

CREATE TRIGGER leads_update_updated_at BEFORE UPDATE ON leads
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_leads_project_status ON leads(project_id, status);
CREATE UNIQUE INDEX idx_leads_phone_unique ON leads(phone_e164);

-- Call logs table
CREATE TABLE call_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  bolna_call_id TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  outcome TEXT CHECK (outcome IN ('no_answer', 'qualified', 'not_qualified', 'callback', 'wrong_number')),
  transcript TEXT,
  recording_url TEXT,
  summary TEXT,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all" ON call_logs FOR ALL USING (true);

CREATE TRIGGER call_logs_update_updated_at BEFORE UPDATE ON call_logs
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  channel TEXT CHECK (channel IN ('whatsapp', 'email', 'sms')),
  direction TEXT CHECK (direction IN ('out', 'in')),
  template_name TEXT,
  body TEXT,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'replied', 'failed')),
  provider_message_id TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  replied_at TIMESTAMP WITH TIME ZONE,
  claude_personalisation_meta JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all" ON messages FOR ALL USING (true);

CREATE TRIGGER messages_update_updated_at BEFORE UPDATE ON messages
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_messages_lead_created ON messages(lead_id, created_at DESC);

-- Campaigns table
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  platform TEXT CHECK (platform IN ('meta', 'google', '99acres')),
  name TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  budget_paise_daily INTEGER,
  headline TEXT,
  primary_text TEXT,
  creative_url TEXT,
  external_campaign_id TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  leads_count INTEGER DEFAULT 0,
  spend_paise INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all" ON campaigns FOR ALL USING (true);

CREATE TRIGGER campaigns_update_updated_at BEFORE UPDATE ON campaigns
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Social posts table
CREATE TABLE social_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  platform TEXT CHECK (platform IN ('instagram', 'facebook', 'linkedin', 'twitter')),
  caption TEXT,
  media_urls TEXT[],
  scheduled_at TIMESTAMP WITH TIME ZONE,
  posted_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'posted', 'failed')),
  claude_brief TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all" ON social_posts FOR ALL USING (true);

CREATE TRIGGER social_posts_update_updated_at BEFORE UPDATE ON social_posts
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Events table (audit trail)
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  kind TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all" ON events FOR ALL USING (true);

CREATE INDEX idx_events_created ON events(created_at DESC);
