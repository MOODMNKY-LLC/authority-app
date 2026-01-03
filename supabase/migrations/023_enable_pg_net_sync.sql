-- Enable pg_net extension for HTTP calls from PostgreSQL
-- This allows cron jobs to trigger API routes

CREATE EXTENSION IF NOT EXISTS pg_net;

-- Update sync function to call API route via HTTP
-- Note: This requires the API route to be accessible from the database
-- For local development, use http://host.docker.internal:3000
-- For production, use your actual API URL

CREATE OR REPLACE FUNCTION sync_notion_database_via_api(
  p_user_id TEXT,
  p_database_id TEXT,
  p_database_name TEXT
) RETURNS INTEGER AS $$
DECLARE
  api_url TEXT;
  request_id BIGINT;
  response_status INT;
  response_body JSONB;
  synced_count INTEGER := 0;
BEGIN
  -- Determine API URL based on environment
  -- In production, this should be your actual API URL
  -- In local development, use host.docker.internal to reach host machine
  api_url := COALESCE(
    current_setting('app.api_url', true),
    'http://host.docker.internal:3000'
  ) || '/api/notion/sync-to-postgres';

  -- Make HTTP POST request to sync API
  SELECT net.http_post(
    url := api_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'database_id', p_database_id,
      'database_name', p_database_name,
      'user_id', p_user_id
    )::text
  ) INTO request_id;

  -- Wait for response (with timeout)
  -- Note: This is a simplified version - in production you might want async handling
  SELECT status, content::jsonb INTO response_status, response_body
  FROM net.http_collect_response(request_id, timeout := 30000);

  -- Extract synced_count from response
  IF response_status = 200 AND response_body IS NOT NULL THEN
    synced_count := COALESCE((response_body->>'synced_count')::INTEGER, 0);
  ELSE
    RAISE WARNING 'Sync API call failed: status %, body %', response_status, response_body;
  END IF;

  RETURN synced_count;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error calling sync API: %', SQLERRM;
  RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the main sync function to use API call
CREATE OR REPLACE FUNCTION sync_notion_database(
  p_user_id TEXT,
  p_database_id TEXT,
  p_database_name TEXT
) RETURNS INTEGER AS $$
DECLARE
  synced_count INTEGER := 0;
BEGIN
  -- Try API-based sync first
  synced_count := sync_notion_database_via_api(p_user_id, p_database_id, p_database_name);
  
  -- If API sync fails (returns 0), log but don't fail
  -- Future: Could fall back to direct Notion wrapper queries here
  RETURN synced_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to set API URL configuration
CREATE OR REPLACE FUNCTION set_sync_api_url(p_url TEXT)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.api_url', p_url, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;




