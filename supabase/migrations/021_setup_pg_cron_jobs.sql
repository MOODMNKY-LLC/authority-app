-- Set up pg_cron jobs for automated Notion syncing and maintenance

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Job 1: Sync Notion databases every 15 minutes for all active users
-- This keeps PostgreSQL tables in sync with Notion
-- Note: This calls a helper function that handles the sync logic for all users
SELECT cron.schedule(
  'sync-notion-databases',
  '*/15 * * * *', -- Every 15 minutes
  'SELECT * FROM sync_all_users_notion_databases();'
);

-- Job 2: Cleanup old temporary chats daily at 2 AM
SELECT cron.schedule(
  'cleanup-temporary-chats',
  '0 2 * * *', -- Daily at 2 AM
  $$
  DELETE FROM chats 
  WHERE is_temporary = true 
    AND created_at < NOW() - INTERVAL '30 days';
  $$
);

-- Job 3: Aggregate writing statistics daily at 3 AM
-- Note: This is a simplified version - you may need to adjust based on your actual schema
SELECT cron.schedule(
  'aggregate-writing-stats',
  '0 3 * * *', -- Daily at 3 AM
  'INSERT INTO writing_statistics (date, user_id, chat_count) SELECT DATE(created_at) as date, user_id, COUNT(DISTINCT id) as chat_count FROM chats WHERE created_at >= CURRENT_DATE - INTERVAL ''1 day'' GROUP BY DATE(created_at), user_id ON CONFLICT (date, user_id) DO UPDATE SET chat_count = EXCLUDED.chat_count;'
);

-- Job 4: Refresh Notion sync table indexes weekly (Sunday at 1 AM)
SELECT cron.schedule(
  'refresh-notion-indexes',
  '0 1 * * 0', -- Weekly on Sunday at 1 AM
  'ANALYZE notion_characters_sync; ANALYZE notion_worlds_sync; ANALYZE notion_stories_sync; ANALYZE notion_chat_sessions_sync; ANALYZE notion_pages_sync;'
);

-- Job 5: Cleanup old sync records (keep last 90 days)
SELECT cron.schedule(
  'cleanup-old-sync-records',
  '0 4 * * 0', -- Weekly on Sunday at 4 AM
  'DELETE FROM notion_characters_sync WHERE updated_at < NOW() - INTERVAL ''90 days''; DELETE FROM notion_worlds_sync WHERE updated_at < NOW() - INTERVAL ''90 days''; DELETE FROM notion_stories_sync WHERE updated_at < NOW() - INTERVAL ''90 days''; DELETE FROM notion_chat_sessions_sync WHERE updated_at < NOW() - INTERVAL ''90 days''; DELETE FROM notion_pages_sync WHERE updated_at < NOW() - INTERVAL ''90 days'';'
);

-- Create writing_statistics table for cron job (if it doesn't exist)
CREATE TABLE IF NOT EXISTS writing_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  user_id TEXT NOT NULL,
  chat_count INTEGER DEFAULT 0,
  character_count INTEGER DEFAULT 0,
  world_count INTEGER DEFAULT 0,
  story_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, user_id)
);

CREATE INDEX IF NOT EXISTS idx_writing_stats_user_date ON writing_statistics(user_id, date DESC);

