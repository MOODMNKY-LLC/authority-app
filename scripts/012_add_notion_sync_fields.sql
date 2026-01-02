-- Add Notion page ID fields to track synced content
ALTER TABLE characters ADD COLUMN IF NOT EXISTS notion_page_id TEXT;
ALTER TABLE worlds ADD COLUMN IF NOT EXISTS notion_page_id TEXT;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS notion_page_id TEXT;
ALTER TABLE chat_hub_sessions ADD COLUMN IF NOT EXISTS notion_page_id TEXT;

-- Add Notion configuration to user settings
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS notion_token TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS notion_databases JSONB DEFAULT '{}'::jsonb;

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_characters_notion_page ON characters(notion_page_id);
CREATE INDEX IF NOT EXISTS idx_worlds_notion_page ON worlds(notion_page_id);
CREATE INDEX IF NOT EXISTS idx_stories_notion_page ON stories(notion_page_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_notion_page ON chat_hub_sessions(notion_page_id);

COMMENT ON COLUMN user_settings.notion_token IS 'User''s personal Notion integration token for syncing content';
COMMENT ON COLUMN user_settings.notion_databases IS 'JSON object mapping content types to Notion database IDs';
COMMENT ON COLUMN characters.notion_page_id IS 'ID of synced Notion page in user''s workspace';
