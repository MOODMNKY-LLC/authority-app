-- Add columns for Discord webhook verification status
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS discord_webhook_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS discord_webhook_verified_at TIMESTAMPTZ;

COMMENT ON COLUMN user_settings.discord_webhook_verified IS 'Whether Discord webhook URL has been verified';
COMMENT ON COLUMN user_settings.discord_webhook_verified_at IS 'Timestamp when Discord webhook was last verified';


