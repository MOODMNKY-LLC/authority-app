-- Reset all data in production database
-- This truncates all tables and resets sequences
-- WARNING: This will delete all data!

-- Disable foreign key checks temporarily
SET session_replication_role = 'replica';

-- Truncate all data tables (preserving schema)
-- Using DO block to safely truncate tables that exist
DO $$
BEGIN
  -- Notion sync tables
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notion_characters_sync') THEN
    TRUNCATE TABLE notion_characters_sync CASCADE;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notion_worlds_sync') THEN
    TRUNCATE TABLE notion_worlds_sync CASCADE;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notion_stories_sync') THEN
    TRUNCATE TABLE notion_stories_sync CASCADE;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notion_chat_sessions_sync') THEN
    TRUNCATE TABLE notion_chat_sessions_sync CASCADE;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notion_pages_sync') THEN
    TRUNCATE TABLE notion_pages_sync CASCADE;
  END IF;
  
  -- World building tables
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'characters') THEN
    TRUNCATE TABLE characters CASCADE;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'worlds') THEN
    TRUNCATE TABLE worlds CASCADE;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stories') THEN
    TRUNCATE TABLE stories CASCADE;
  END IF;
  
  -- Chat and project tables
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'projects') THEN
    TRUNCATE TABLE projects CASCADE;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chats') THEN
    TRUNCATE TABLE chats CASCADE;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') THEN
    TRUNCATE TABLE messages CASCADE;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'generated_images') THEN
    TRUNCATE TABLE generated_images CASCADE;
  END IF;
  
  -- User and settings tables
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
    TRUNCATE TABLE user_profiles CASCADE;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_settings') THEN
    TRUNCATE TABLE user_settings CASCADE;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ticker_messages') THEN
    TRUNCATE TABLE ticker_messages CASCADE;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_config') THEN
    TRUNCATE TABLE admin_config CASCADE;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'automation_logs') THEN
    TRUNCATE TABLE automation_logs CASCADE;
  END IF;
END $$;

-- Reset sequences
ALTER SEQUENCE IF EXISTS projects_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS chats_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS messages_id_seq RESTART WITH 1;

-- Re-enable foreign key checks
SET session_replication_role = 'origin';

-- Note: auth.users table is managed by Supabase Auth and should not be truncated
-- Note: Storage buckets and files are preserved (only database records are cleared)

