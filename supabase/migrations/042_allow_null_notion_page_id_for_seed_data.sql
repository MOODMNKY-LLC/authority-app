-- Allow notion_page_id to be NULL for seed data that hasn't been synced to Notion yet
-- This enables the sync process to find seed data by querying for notion_page_id IS NULL

-- Alter notion_characters_sync
ALTER TABLE notion_characters_sync 
  ALTER COLUMN notion_page_id DROP NOT NULL;

-- Drop the unique constraint temporarily to allow multiple NULLs
-- (PostgreSQL allows multiple NULLs in unique columns, but we need to recreate the constraint)
ALTER TABLE notion_characters_sync 
  DROP CONSTRAINT IF EXISTS notion_characters_sync_notion_page_id_key;

-- Recreate unique constraint that allows NULL (only enforces uniqueness on non-NULL values)
CREATE UNIQUE INDEX IF NOT EXISTS notion_characters_sync_notion_page_id_unique 
  ON notion_characters_sync(notion_page_id) 
  WHERE notion_page_id IS NOT NULL;

-- Alter notion_worlds_sync
ALTER TABLE notion_worlds_sync 
  ALTER COLUMN notion_page_id DROP NOT NULL;

ALTER TABLE notion_worlds_sync 
  DROP CONSTRAINT IF EXISTS notion_worlds_sync_notion_page_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS notion_worlds_sync_notion_page_id_unique 
  ON notion_worlds_sync(notion_page_id) 
  WHERE notion_page_id IS NOT NULL;

-- Alter notion_stories_sync
ALTER TABLE notion_stories_sync 
  ALTER COLUMN notion_page_id DROP NOT NULL;

ALTER TABLE notion_stories_sync 
  DROP CONSTRAINT IF EXISTS notion_stories_sync_notion_page_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS notion_stories_sync_notion_page_id_unique 
  ON notion_stories_sync(notion_page_id) 
  WHERE notion_page_id IS NOT NULL;

-- Alter notion_chat_sessions_sync
ALTER TABLE notion_chat_sessions_sync 
  ALTER COLUMN notion_page_id DROP NOT NULL;

ALTER TABLE notion_chat_sessions_sync 
  DROP CONSTRAINT IF EXISTS notion_chat_sessions_sync_notion_page_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS notion_chat_sessions_sync_notion_page_id_unique 
  ON notion_chat_sessions_sync(notion_page_id) 
  WHERE notion_page_id IS NOT NULL;

-- Alter notion_pages_sync
ALTER TABLE notion_pages_sync 
  ALTER COLUMN notion_page_id DROP NOT NULL;

ALTER TABLE notion_pages_sync 
  DROP CONSTRAINT IF EXISTS notion_pages_sync_notion_page_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS notion_pages_sync_notion_page_id_unique 
  ON notion_pages_sync(notion_page_id) 
  WHERE notion_page_id IS NOT NULL;

-- Update existing seed data: Set fake UUIDs (with dashes) to NULL
-- Notion page IDs are 32-character hex strings without dashes
-- Seed data uses gen_random_uuid() which creates UUIDs with dashes
-- This allows the sync process to find seed data by querying for notion_page_id IS NULL

UPDATE notion_characters_sync 
SET notion_page_id = NULL 
WHERE notion_page_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
-- UUID format (with dashes) = seed data fake UUID
-- Notion page IDs are 32-char hex (no dashes)

UPDATE notion_worlds_sync 
SET notion_page_id = NULL 
WHERE notion_page_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

UPDATE notion_stories_sync 
SET notion_page_id = NULL 
WHERE notion_page_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

UPDATE notion_chat_sessions_sync 
SET notion_page_id = NULL 
WHERE notion_page_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

UPDATE notion_pages_sync 
SET notion_page_id = NULL 
WHERE notion_page_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

