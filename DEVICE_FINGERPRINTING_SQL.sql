-- SQL queries for device fingerprinting to prevent repeated survey submissions
-- Run these queries if the survey_responses table doesn't have the device_fingerprint column

-- 1. Add device_fingerprint column to survey_responses table (if it doesn't exist)
ALTER TABLE survey_responses
ADD COLUMN IF NOT EXISTS device_fingerprint VARCHAR(255);

-- 2. Create index for faster fingerprint lookups
CREATE INDEX IF NOT EXISTS idx_survey_responses_fingerprint 
ON survey_responses(survey_id, device_fingerprint);

-- 3. Survey fingerprints table (tracks all unique fingerprints per survey)
-- This table is optional but useful for analytics
CREATE TABLE IF NOT EXISTS survey_fingerprints (
  id SERIAL PRIMARY KEY,
  survey_id INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  fingerprint VARCHAR(255) NOT NULL,
  cookie_id VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(survey_id, fingerprint)
);

-- 4. Create index for survey_fingerprints table
CREATE INDEX IF NOT EXISTS idx_survey_fingerprints_survey 
ON survey_fingerprints(survey_id);

-- Optional: View to see duplicate submission attempts
-- This helps identify patterns of duplicate submission attempts
CREATE OR REPLACE VIEW survey_duplicate_attempts AS
SELECT 
  sr.survey_id,
  sr.device_fingerprint,
  COUNT(*) as submission_count,
  MIN(sr.created_at) as first_submission,
  MAX(sr.created_at) as last_submission,
  MAX(sr.created_at) - MIN(sr.created_at) as time_between_submissions
FROM survey_responses sr
WHERE sr.device_fingerprint IS NOT NULL
GROUP BY sr.survey_id, sr.device_fingerprint
HAVING COUNT(*) > 1;

-- Optional: Query to see which devices have attempted duplicate submissions
-- SELECT * FROM survey_duplicate_attempts ORDER BY survey_id, submission_count DESC;

-- Optional: Clean up old duplicate records if needed (keep only first submission per device)
-- WARNING: This will delete duplicate responses. Use with caution!
-- DELETE FROM survey_responses 
-- WHERE id NOT IN (
--   SELECT MIN(id) 
--   FROM survey_responses 
--   WHERE device_fingerprint IS NOT NULL 
--   GROUP BY survey_id, device_fingerprint
-- ) AND device_fingerprint IS NOT NULL;
