-- Setup Notion Foreign Data Wrapper (FDW) for direct Notion queries
-- This enables querying Notion data directly from PostgreSQL
-- Useful for: Block extraction (RAG), on-demand fresh queries, complex joins

-- Enable wrappers extension
-- Note: In Supabase production, this may need to be enabled via dashboard
CREATE EXTENSION IF NOT EXISTS wrappers WITH SCHEMA extensions;

-- Enable Wasm wrapper (if not already enabled and handlers exist)
-- This will fail gracefully if wrappers extension handlers are not available
-- In that case, FDW features won't work but the rest of the migration will continue
DO $$
DECLARE
  handlers_exist BOOLEAN;
BEGIN
  -- Check if wrappers extension handlers exist
  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'wasm_fdw_handler'
  ) INTO handlers_exist;
  
  -- Only create wrapper if handlers exist and wrapper doesn't exist
  IF handlers_exist AND NOT EXISTS (
    SELECT 1 FROM pg_foreign_data_wrapper WHERE fdwname = 'wasm_wrapper'
  ) THEN
    BEGIN
      -- Try to create wrapper
      CREATE FOREIGN DATA WRAPPER wasm_wrapper
        HANDLER wasm_fdw_handler
        VALIDATOR wasm_fdw_validator;
    EXCEPTION WHEN OTHERS THEN
      -- If creation fails, log and continue
      RAISE NOTICE 'Could not create wasm_wrapper FDW: %. FDW features will not be available.', SQLERRM;
    END;
  ELSIF NOT handlers_exist THEN
    RAISE NOTICE 'Wrappers extension handlers not found. Enable wrappers extension in Supabase dashboard to use FDW features.';
  END IF;
END $$;

-- Note: FDW server creation requires a Notion API key
-- We'll create servers per-user when they connect Notion
-- For now, this migration sets up the infrastructure

-- Function to create FDW server for a user
CREATE OR REPLACE FUNCTION create_user_notion_fdw_server(p_user_id TEXT)
RETURNS TEXT AS $$
DECLARE
  server_name TEXT;
  notion_token TEXT;
  server_exists BOOLEAN;
BEGIN
  -- Get user's Notion token (prefer integration token over OAuth)
  SELECT COALESCE(notion_token, notion_access_token) INTO notion_token
  FROM user_settings
  WHERE user_id = p_user_id;
  
  IF notion_token IS NULL THEN
    RAISE EXCEPTION 'User has no Notion token. Please connect Notion first.';
  END IF;
  
  -- Create unique server name based on user ID hash
  server_name := 'notion_fdw_' || encode(digest(p_user_id, 'sha256'), 'hex');
  
  -- Check if server already exists
  SELECT EXISTS (
    SELECT 1 FROM pg_foreign_server WHERE srvname = server_name
  ) INTO server_exists;
  
  IF server_exists THEN
    -- Server exists, just return name
    RETURN server_name;
  END IF;
  
  -- Create foreign server with user's Notion token
  -- Using latest version 0.2.0
  EXECUTE format('
    CREATE SERVER %I
    FOREIGN DATA WRAPPER wasm_wrapper
    OPTIONS (
      fdw_package_url ''https://github.com/supabase/wrappers/releases/download/wasm_notion_fdw_v0.2.0/notion_fdw.wasm'',
      fdw_package_name ''supabase:notion-fdw'',
      fdw_package_version ''0.2.0'',
      fdw_package_checksum ''719910b65a049f1d9b82dc4f5f1466457582bec855e1e487d5c3cc1e6f986dc6'',
      api_url ''https://api.notion.com/v1'',
      api_key %L
    )',
    server_name,
    notion_token
  );
  
  -- Store server name in user_settings
  UPDATE user_settings
  SET notion_fdw_server = server_name
  WHERE user_id = p_user_id;
  
  RETURN server_name;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to create FDW server for user %: %', p_user_id, SQLERRM;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create foreign tables for a user's FDW server
CREATE OR REPLACE FUNCTION create_user_notion_fdw_tables(p_user_id TEXT)
RETURNS VOID AS $$
DECLARE
  server_name TEXT;
  schema_name TEXT;
BEGIN
  -- Get user's FDW server name
  SELECT notion_fdw_server INTO server_name
  FROM user_settings
  WHERE user_id = p_user_id;
  
  IF server_name IS NULL THEN
    -- Create server first
    BEGIN
      server_name := create_user_notion_fdw_server(p_user_id);
      IF server_name IS NULL THEN
        -- FDW server creation failed - this is OK, FDW is optional
        -- Log warning but don't fail - sync tables work without FDW
        RAISE WARNING 'FDW server creation failed for user %. FDW features will not be available, but sync tables will work.', p_user_id;
        -- Return early - can't create tables without server
        RETURN;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- FDW setup failed - non-critical, sync tables work without FDW
      RAISE WARNING 'FDW setup failed for user %: %. FDW features will not be available, but sync tables will work.', p_user_id, SQLERRM;
      RETURN;
    END;
  END IF;
  
  -- Verify server exists before creating tables
  IF NOT EXISTS (SELECT 1 FROM pg_foreign_server WHERE srvname = server_name) THEN
    RAISE WARNING 'FDW server % does not exist. FDW features will not be available.', server_name;
    RETURN;
  END IF;
  
  -- Create user-specific schema for foreign tables
  schema_name := 'notion_user_' || encode(digest(p_user_id, 'sha256'), 'hex');
  
  -- Create schema if not exists
  EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', schema_name);
  
  -- Create foreign tables
  EXECUTE format('
    CREATE FOREIGN TABLE IF NOT EXISTS %I.pages (
      id text,
      url text,
      created_time timestamp,
      last_edited_time timestamp,
      archived boolean,
      attrs jsonb
    ) SERVER %I
    OPTIONS (object ''page'')',
    schema_name, server_name
  );
  
  EXECUTE format('
    CREATE FOREIGN TABLE IF NOT EXISTS %I.databases (
      id text,
      url text,
      created_time timestamp,
      last_edited_time timestamp,
      archived boolean,
      attrs jsonb
    ) SERVER %I
    OPTIONS (object ''database'')',
    schema_name, server_name
  );
  
  EXECUTE format('
    CREATE FOREIGN TABLE IF NOT EXISTS %I.blocks (
      id text,
      page_id text,
      type text,
      created_time timestamp,
      last_edited_time timestamp,
      archived boolean,
      attrs jsonb
    ) SERVER %I
    OPTIONS (object ''block'')',
    schema_name, server_name
  );
  
  EXECUTE format('
    CREATE FOREIGN TABLE IF NOT EXISTS %I.users (
      id text,
      name text,
      type text,
      avatar_url text,
      attrs jsonb
    ) SERVER %I
    OPTIONS (object ''user'')',
    schema_name, server_name
  );
  
  -- Store schema name in user_settings
  UPDATE user_settings
  SET notion_fdw_schema = schema_name
  WHERE user_id = p_user_id;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to query user's Notion pages via FDW
CREATE OR REPLACE FUNCTION query_notion_page_fdw(
  p_user_id TEXT,
  p_page_id TEXT
)
RETURNS JSONB AS $$
DECLARE
  schema_name TEXT;
  result JSONB;
BEGIN
  -- Get user's FDW schema
  SELECT notion_fdw_schema INTO schema_name
  FROM user_settings
  WHERE user_id = p_user_id;
  
  IF schema_name IS NULL THEN
    -- Create tables if they don't exist
    PERFORM create_user_notion_fdw_tables(p_user_id);
    SELECT notion_fdw_schema INTO schema_name
    FROM user_settings
    WHERE user_id = p_user_id;
  END IF;
  
  -- Query page via FDW
  EXECUTE format('
    SELECT attrs INTO result
    FROM %I.pages
    WHERE id = $1',
    schema_name
  ) USING p_page_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get all blocks from a page (for RAG)
CREATE OR REPLACE FUNCTION get_notion_page_blocks_fdw(
  p_user_id TEXT,
  p_page_id TEXT
)
RETURNS TABLE(
  id text,
  type text,
  content text,
  attrs jsonb
) AS $$
DECLARE
  schema_name TEXT;
BEGIN
  -- Get user's FDW schema
  SELECT notion_fdw_schema INTO schema_name
  FROM user_settings
  WHERE user_id = p_user_id;
  
  IF schema_name IS NULL THEN
    -- Create tables if they don't exist
    PERFORM create_user_notion_fdw_tables(p_user_id);
    SELECT notion_fdw_schema INTO schema_name
    FROM user_settings
    WHERE user_id = p_user_id;
  END IF;
  
  -- Query blocks recursively via FDW
  RETURN QUERY EXECUTE format('
    SELECT 
      b.id,
      b.type,
      b.attrs->>''plain_text'' as content,
      b.attrs
    FROM %I.blocks b
    WHERE b.page_id = $1
    ORDER BY b.created_time',
    schema_name
  ) USING p_page_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add columns to user_settings for FDW server/schema names
-- These store the FDW server and schema names created for each user
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS notion_fdw_server TEXT,
ADD COLUMN IF NOT EXISTS notion_fdw_schema TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_fdw_server 
ON user_settings(notion_fdw_server) 
WHERE notion_fdw_server IS NOT NULL;

-- Comment on new columns
COMMENT ON COLUMN user_settings.notion_fdw_server IS 'Name of the FDW server created for this user''s Notion integration';
COMMENT ON COLUMN user_settings.notion_fdw_schema IS 'Schema name containing this user''s Notion foreign tables';

