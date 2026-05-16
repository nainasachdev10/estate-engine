-- Add WhatsApp 24hr window tracking to leads
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS whatsapp_window_open_until TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS sequence_paused BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sequence_name TEXT,
  ADD COLUMN IF NOT EXISTS sequence_step INTEGER DEFAULT 0;

-- Add FAQ and messaging controls to projects
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS faq JSONB;

-- Add messaging pause control to clients
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS messaging_paused BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS slack_webhook_url TEXT;

-- WhatsApp approved templates registry
CREATE TABLE IF NOT EXISTS wa_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  category TEXT CHECK (category IN ('UTILITY', 'MARKETING', 'AUTHENTICATION')),
  language TEXT DEFAULT 'en',
  body_template TEXT NOT NULL,
  variables TEXT[],
  approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE wa_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all" ON wa_templates FOR ALL USING (true);

-- Seed the templates we'll use (unapproved until Meta approves)
INSERT INTO wa_templates (name, category, language, body_template, variables, approved) VALUES
  ('lead_intro_hi',      'UTILITY',   'hi', 'Namaste {{1}}, {{2}} ki taraf se main bol rahi hun. Aapne {{3}} ke baare mein enquire kiya tha. Bohot shukriya! Kya main aapko quick brochure bhej sakti hun? Reply *YES* karein.', ARRAY['lead_name','brand_name','project_name'], false),
  ('lead_intro_en',      'UTILITY',   'en', 'Hi {{1}}, this is {{2}} from {{3}}. You had enquired about {{4}} — thank you! Can I send you a quick brochure? Reply *YES* to receive it.', ARRAY['lead_name','agent_name','brand_name','project_name'], false),
  ('brochure_followup',  'UTILITY',   'hi', 'Namaste {{1}} ji! Yahan {{2}} ka brochure hai: {{3}} — Agar koi bhi sawaal ho toh zaroor poochein!', ARRAY['lead_name','project_name','brochure_url'], false),
  ('site_visit_invite',  'MARKETING', 'hi', 'Hi {{1}}, kya aap is weekend {{2}} site visit ke liye available hain? {{3}} mein ek brand new model flat ready hai dekhne ke liye. Reply *YES* ya apna preferred time batayein.', ARRAY['lead_name','project_name','project_location'], false),
  ('callback_confirm',   'UTILITY',   'hi', 'Namaste {{1}} ji, {{2}} ki taraf se — humne note kar liya hai ki aap {{3}} pe baat karna chahte hain. Hum tab call karenge. Shukriya!', ARRAY['lead_name','brand_name','callback_time'], false),
  ('gentle_intro',       'UTILITY',   'hi', 'Namaste {{1}} ji! Main {{2}} ki taraf se bol rahi hun. Aapne {{3}} mein property ke baare mein interest dikhaya tha. Koi bhi sawaal ho toh main yahan hun — reply karein!', ARRAY['lead_name','brand_name','project_name'], false)
ON CONFLICT (name) DO NOTHING;

-- Index for sequence processing
CREATE INDEX IF NOT EXISTS idx_leads_sequence ON leads(sequence_name, sequence_step) WHERE sequence_name IS NOT NULL AND sequence_paused = FALSE;
