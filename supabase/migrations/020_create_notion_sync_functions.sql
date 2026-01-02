-- Database functions for syncing Notion data
-- These functions can be called from pg_cron jobs or API routes

-- Function to sync a single Notion database
-- This function calls the API route to perform the actual sync
-- The API route handles Notion API calls and database updates
CREATE OR REPLACE FUNCTION sync_notion_database(
  p_user_id TEXT,
  p_database_id TEXT,
  p_database_name TEXT
) RETURNS INTEGER AS $$
DECLARE
  synced_count INTEGER := 0;
  api_url TEXT;
  response_data JSONB;
BEGIN
  -- Note: pg_cron runs SQL, not HTTP requests
  -- For now, this function is a placeholder
  -- The actual sync is handled by the API route /api/notion/sync-to-postgres
  -- Cron jobs can be configured to call this API route via pg_net extension
  -- or the sync can be triggered manually
  
  -- Future: With pg_net extension, we could make HTTP calls:
  -- SELECT net.http_post(
  --   url := 'http://localhost:3000/api/notion/sync-to-postgres',
  --   headers := '{"Content-Type": "application/json"}'::jsonb,
  --   body := json_build_object('database_id', p_database_id, 'database_name', p_database_name, 'user_id', p_user_id)::text
  -- );
  
  -- For now, return 0 - sync must be triggered via API route
  RETURN synced_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to sync all user's Notion databases
CREATE OR REPLACE FUNCTION sync_all_notion_databases(p_user_id TEXT)
RETURNS TABLE(database_name TEXT, synced_count INTEGER, status TEXT) AS $$
DECLARE
  db_record RECORD;
  sync_count INTEGER;
BEGIN
  -- Get user's synced databases from user_settings
  FOR db_record IN 
    SELECT 
      key as db_name,
      value::TEXT as db_id
    FROM user_settings,
    jsonb_each_text(notion_databases)
    WHERE user_id = p_user_id
  LOOP
    BEGIN
      -- Sync each database
      sync_count := sync_notion_database(p_user_id, db_record.db_id, db_record.db_name);
      
      RETURN QUERY SELECT 
        db_record.db_name::TEXT,
        sync_count,
        'success'::TEXT;
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT 
        db_record.db_name::TEXT,
        0,
        'error: ' || SQLERRM::TEXT;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get character by name (searches synced Notion data)
CREATE OR REPLACE FUNCTION get_notion_character(
  p_user_id TEXT,
  p_character_name TEXT
)
RETURNS TABLE(
  notion_page_id TEXT,
  name TEXT,
  description TEXT,
  properties JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    nc.notion_page_id,
    nc.name,
    nc.description,
    nc.properties
  FROM notion_characters_sync nc
  WHERE nc.user_id = p_user_id
    AND (nc.name ILIKE '%' || p_character_name || '%' OR p_character_name IS NULL)
  ORDER BY nc.updated_at DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search across all synced Notion content
CREATE OR REPLACE FUNCTION search_notion_content(
  p_user_id TEXT,
  p_search_query TEXT
)
RETURNS TABLE(
  source_table TEXT,
  notion_page_id TEXT,
  title TEXT,
  content TEXT,
  relevance_score REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'characters'::TEXT,
    nc.notion_page_id,
    nc.name,
    nc.description,
    ts_rank(to_tsvector('english', COALESCE(nc.name, '') || ' ' || COALESCE(nc.description, '')), plainto_tsquery('english', p_search_query))::REAL
  FROM notion_characters_sync nc
  WHERE nc.user_id = p_user_id
    AND to_tsvector('english', COALESCE(nc.name, '') || ' ' || COALESCE(nc.description, '')) @@ plainto_tsquery('english', p_search_query)
  
  UNION ALL
  
  SELECT 
    'worlds'::TEXT,
    nw.notion_page_id,
    nw.name,
    nw.description,
    ts_rank(to_tsvector('english', COALESCE(nw.name, '') || ' ' || COALESCE(nw.description, '')), plainto_tsquery('english', p_search_query))::REAL
  FROM notion_worlds_sync nw
  WHERE nw.user_id = p_user_id
    AND to_tsvector('english', COALESCE(nw.name, '') || ' ' || COALESCE(nw.description, '')) @@ plainto_tsquery('english', p_search_query)
  
  UNION ALL
  
  SELECT 
    'stories'::TEXT,
    ns.notion_page_id,
    ns.title,
    ns.description,
    ts_rank(to_tsvector('english', COALESCE(ns.title, '') || ' ' || COALESCE(ns.description, '')), plainto_tsquery('english', p_search_query))::REAL
  FROM notion_stories_sync ns
  WHERE ns.user_id = p_user_id
    AND to_tsvector('english', COALESCE(ns.title, '') || ' ' || COALESCE(ns.description, '')) @@ plainto_tsquery('english', p_search_query)
  
  ORDER BY relevance_score DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

