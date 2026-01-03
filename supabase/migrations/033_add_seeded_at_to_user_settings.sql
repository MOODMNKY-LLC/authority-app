-- Add seeded_at timestamp to track when user databases were seeded
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS seeded_at TIMESTAMPTZ;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_seeded_at 
ON user_settings(seeded_at) 
WHERE seeded_at IS NOT NULL;

-- Add comment
COMMENT ON COLUMN user_settings.seeded_at IS 'Timestamp when user Notion databases were automatically seeded with sample data';



