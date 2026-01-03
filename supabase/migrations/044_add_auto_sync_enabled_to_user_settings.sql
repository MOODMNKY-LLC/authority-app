-- Add auto_sync_enabled column to user_settings
-- This allows users to enable/disable automatic syncing via cron jobs
-- Default is false (manual sync only)

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS auto_sync_enabled BOOLEAN DEFAULT false NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN user_settings.auto_sync_enabled IS 'When true, enables automatic syncing via cron jobs every 15 minutes. When false, syncing is manual-only.';

-- Update sync helper function to check this flag before syncing
CREATE OR REPLACE FUNCTION sync_all_users_notion_databases()
RETURNS TABLE(user_id TEXT, databases_synced INTEGER, status TEXT) AS $$
DECLARE
  user_record RECORD;
  sync_result RECORD;
  total_synced INTEGER;
BEGIN
  -- Sync for all users who have Notion connected AND auto_sync_enabled = true
  FOR user_record IN 
    SELECT DISTINCT user_id 
    FROM user_settings 
    WHERE (notion_access_token IS NOT NULL OR notion_token IS NOT NULL)
      AND auto_sync_enabled = true
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


