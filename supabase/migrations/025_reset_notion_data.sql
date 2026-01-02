-- Reset Notion-related data in user_settings for clean sync testing
-- This clears template page IDs and database mappings without affecting other settings

UPDATE user_settings
SET
  notion_template_page_id = NULL,
  notion_databases = NULL,
  updated_at = NOW()
WHERE
  notion_template_page_id IS NOT NULL
  OR notion_databases IS NOT NULL;

-- Reset FDW columns if they exist (may not exist in all environments)
DO $$
BEGIN
  -- Check and reset notion_fdw_server if column exists
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' 
             AND table_name = 'user_settings' 
             AND column_name = 'notion_fdw_server') THEN
    UPDATE user_settings SET notion_fdw_server = NULL WHERE notion_fdw_server IS NOT NULL;
  END IF;
  
  -- Check and reset notion_fdw_schema if column exists
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' 
             AND table_name = 'user_settings' 
             AND column_name = 'notion_fdw_schema') THEN
    UPDATE user_settings SET notion_fdw_schema = NULL WHERE notion_fdw_schema IS NOT NULL;
  END IF;
  
  -- Check and reset notion_fdw_vault_key_id if column exists
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' 
             AND table_name = 'user_settings' 
             AND column_name = 'notion_fdw_vault_key_id') THEN
    UPDATE user_settings SET notion_fdw_vault_key_id = NULL WHERE notion_fdw_vault_key_id IS NOT NULL;
  END IF;
END $$;

-- Clear any existing sync data (optional - comment out if you want to keep existing sync data)
-- TRUNCATE TABLE notion_characters_sync CASCADE;
-- TRUNCATE TABLE notion_worlds_sync CASCADE;
-- TRUNCATE TABLE notion_stories_sync CASCADE;
-- TRUNCATE TABLE notion_chat_sessions_sync CASCADE;
-- TRUNCATE TABLE notion_pages_sync CASCADE;

-- Log the reset
DO $$
BEGIN
  RAISE NOTICE 'Notion data reset complete. Template page IDs and database mappings cleared.';
END $$;

