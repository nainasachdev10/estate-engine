-- Project intake completeness: the client's "new project" form must capture
-- everything the pipeline runs on. The named escalation person (workforce
-- proposal input #5) is who takes discount/complaint/penthouse handovers.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS escalation_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS escalation_contact_phone TEXT;
