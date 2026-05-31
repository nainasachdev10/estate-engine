-- Per-client API credentials for calling, WhatsApp, and email
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS bolna_agent_id TEXT,
  ADD COLUMN IF NOT EXISTS bolna_from_number TEXT,
  ADD COLUMN IF NOT EXISTS aisensy_api_key TEXT,
  ADD COLUMN IF NOT EXISTS aisensy_sender_id TEXT,
  ADD COLUMN IF NOT EXISTS brevo_sender_email TEXT,
  ADD COLUMN IF NOT EXISTS brevo_sender_name TEXT;
