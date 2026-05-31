-- Score change recorded per call so the lead timeline can show +/- movement
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS score_delta INTEGER;
