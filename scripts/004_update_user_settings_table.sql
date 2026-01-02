-- Add new columns to user_settings table for ElevenLabs and n8n integration

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS elevenlabs_api_key TEXT,
ADD COLUMN IF NOT EXISTS n8n_api_key TEXT,
ADD COLUMN IF NOT EXISTS n8n_webhook_url TEXT,
ADD COLUMN IF NOT EXISTS selected_voice TEXT DEFAULT 'EXAVITQu4vr4xnSDxMaL';

-- Add comment to explain the table structure
COMMENT ON TABLE user_settings IS 'Stores user preferences, API keys, and personalization settings for Authority';
COMMENT ON COLUMN user_settings.elevenlabs_api_key IS 'ElevenLabs API key for text-to-speech';
COMMENT ON COLUMN user_settings.n8n_api_key IS 'n8n API key for workflow automation';
COMMENT ON COLUMN user_settings.n8n_webhook_url IS 'n8n webhook URL for triggering workflows';
COMMENT ON COLUMN user_settings.selected_voice IS 'ElevenLabs voice ID for Authority character voice';
