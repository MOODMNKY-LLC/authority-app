-- Add columns for API key verification status and user info
-- API keys will be encrypted client-side before storage (encrypted as TEXT, not BYTEA for simplicity)
-- The encryption/decryption happens in the application layer

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS flowise_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS flowise_user_info JSONB,
ADD COLUMN IF NOT EXISTS n8n_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS n8n_user_info JSONB,
ADD COLUMN IF NOT EXISTS ai_provider_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_provider_user_info JSONB,
ADD COLUMN IF NOT EXISTS notion_token_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notion_token_user_info JSONB;

-- Add comments
COMMENT ON COLUMN user_settings.flowise_verified IS 'Whether Flowise API key has been verified';
COMMENT ON COLUMN user_settings.flowise_user_info IS 'User information from Flowise API verification (name, email, etc.)';
COMMENT ON COLUMN user_settings.n8n_verified IS 'Whether N8n API key has been verified';
COMMENT ON COLUMN user_settings.n8n_user_info IS 'User information from N8n API verification';
COMMENT ON COLUMN user_settings.ai_provider_verified IS 'Whether AI provider API key has been verified';
COMMENT ON COLUMN user_settings.ai_provider_user_info IS 'User information from AI provider API verification';
COMMENT ON COLUMN user_settings.notion_token_verified IS 'Whether Notion integration token has been verified';
COMMENT ON COLUMN user_settings.notion_token_user_info IS 'User information from Notion API verification';

-- Note: API keys are stored encrypted using application-level encryption
-- The encryption key is stored in Supabase secrets (ENCRYPTION_KEY)

