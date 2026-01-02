-- Helper function for pg_cron to sync all users' Notion databases
-- This function is called by the cron job

CREATE OR REPLACE FUNCTION sync_all_users_notion_databases()
RETURNS TABLE(user_id TEXT, databases_synced INTEGER, status TEXT) AS $$
DECLARE
  user_record RECORD;
  sync_result RECORD;
  total_synced INTEGER;
BEGIN
  -- Sync for all users who have Notion connected
  FOR user_record IN 
    SELECT DISTINCT user_id 
    FROM user_settings 
    WHERE notion_access_token IS NOT NULL OR notion_token IS NOT NULL
  LOOP
    BEGIN
      -- Call sync function for this user
      FOR sync_result IN 
        SELECT * FROM sync_all_notion_databases(user_record.user_id)
      LOOP
        total_synced := COALESCE(total_synced, 0) + sync_result.synced_count;
      END LOOP;
      
      RETURN QUERY SELECT 
        user_record.user_id,
        COALESCE(total_synced, 0),
        'success'::TEXT;
      
      total_synced := 0; -- Reset for next user
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT 
        user_record.user_id,
        0,
        'error: ' || SQLERRM::TEXT;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: For cron jobs to work with API calls, you need to:
-- 1. Set the API URL: SELECT set_sync_api_url('http://your-api-url');
-- 2. Ensure the API route is accessible from the database
-- 3. For local dev, use 'http://host.docker.internal:3000'
-- 4. For production, use your actual API URL

