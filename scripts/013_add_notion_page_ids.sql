-- Add notion_page_id columns to all relevant tables

ALTER TABLE characters
ADD COLUMN IF NOT EXISTS notion_page_id TEXT;

ALTER TABLE worlds
ADD COLUMN IF NOT EXISTS notion_page_id TEXT;

ALTER TABLE stories
ADD COLUMN IF NOT EXISTS notion_page_id TEXT;

ALTER TABLE chat_hub_sessions
ADD COLUMN IF NOT EXISTS notion_page_id TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_characters_notion_page_id ON characters(notion_page_id);
CREATE INDEX IF NOT EXISTS idx_worlds_notion_page_id ON worlds(notion_page_id);
CREATE INDEX IF NOT EXISTS idx_stories_notion_page_id ON stories(notion_page_id);
CREATE INDEX IF NOT EXISTS idx_chat_hub_sessions_notion_page_id ON chat_hub_sessions(notion_page_id);

-- Add user_settings column for Notion integration token
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS notion_token TEXT;
