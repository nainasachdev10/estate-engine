-- Migration: expand language_pref constraint + add detected_language to call_logs
-- Idempotent: safe to run multiple times

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_language_pref_check;
ALTER TABLE leads ADD CONSTRAINT leads_language_pref_check
  CHECK (language_pref IN ('en', 'hi', 'hinglish', 'gu', 'mr', 'bn', 'ta', 'te', 'kn', 'ml', 'pa', 'or'));

ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS detected_language TEXT;
