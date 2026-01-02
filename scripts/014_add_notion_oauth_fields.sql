-- Add Notion OAuth fields to user_settings
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS notion_access_token TEXT,
ADD COLUMN IF NOT EXISTS notion_workspace_id TEXT,
ADD COLUMN IF NOT EXISTS notion_bot_id TEXT,
ADD COLUMN IF NOT EXISTS notion_template_page_id TEXT,
ADD COLUMN IF NOT EXISTS notion_workspace_name TEXT,
ADD COLUMN IF NOT EXISTS notion_workspace_icon TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_notion_workspace 
ON user_settings(user_id, notion_workspace_id);
