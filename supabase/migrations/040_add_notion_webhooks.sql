-- Add Notion webhooks storage to user_settings
-- Webhooks enable real-time bidirectional sync (Notion → Authority)

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS notion_webhooks JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN user_settings.notion_webhooks IS 'Notion webhook subscriptions: {database_id: {webhook_id, secret, active, created_at}}. Only available with integration tokens (Enhanced Mode).';

-- Create index for faster webhook lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_notion_webhooks ON user_settings USING GIN (notion_webhooks) WHERE notion_webhooks IS NOT NULL;



