-- Fix phone uniqueness: should be per project, not global
-- A buyer can enquire about multiple projects
DROP INDEX IF EXISTS idx_leads_phone_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_phone_project_unique ON leads(project_id, phone_e164);

-- Add missing updated_at trigger on wa_templates
CREATE TRIGGER IF NOT EXISTS wa_templates_update_updated_at BEFORE UPDATE ON wa_templates
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
ALTER TABLE wa_templates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
