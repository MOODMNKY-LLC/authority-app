-- Add default model to user settings
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS default_model TEXT DEFAULT 'openai/gpt-4o-mini';

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
