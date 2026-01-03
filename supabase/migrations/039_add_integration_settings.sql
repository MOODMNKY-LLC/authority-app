-- Add integration settings columns to user_settings
-- Discord, Flowise, N8n, MCP, AI Provider, and database preferences

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS discord_webhook_url TEXT,
ADD COLUMN IF NOT EXISTS discord_bot_invite_url TEXT,
ADD COLUMN IF NOT EXISTS flowise_api_key TEXT,
ADD COLUMN IF NOT EXISTS flowise_base_url TEXT DEFAULT 'https://flowise.ai',
ADD COLUMN IF NOT EXISTS n8n_api_key TEXT,
ADD COLUMN IF NOT EXISTS n8n_base_url TEXT,
ADD COLUMN IF NOT EXISTS mcp_config JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS ai_provider TEXT DEFAULT 'openai',
ADD COLUMN IF NOT EXISTS ai_api_key TEXT;

-- Add comments
COMMENT ON COLUMN user_settings.discord_webhook_url IS 'Discord webhook URL for notifications';
COMMENT ON COLUMN user_settings.discord_bot_invite_url IS 'Discord bot invite URL';
COMMENT ON COLUMN user_settings.flowise_api_key IS 'Flowise API key for chatflow management';
COMMENT ON COLUMN user_settings.flowise_base_url IS 'Flowise instance base URL';
COMMENT ON COLUMN user_settings.n8n_api_key IS 'N8n API key for workflow management';
COMMENT ON COLUMN user_settings.n8n_base_url IS 'N8n instance base URL';
COMMENT ON COLUMN user_settings.mcp_config IS 'MCP tools configuration (JSON object)';
COMMENT ON COLUMN user_settings.ai_provider IS 'AI provider name (openai, anthropic, etc.)';
COMMENT ON COLUMN user_settings.ai_api_key IS 'AI provider API key';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_ai_provider ON user_settings(ai_provider) WHERE ai_provider IS NOT NULL;

