-- Create tables to sync Notion database content into PostgreSQL
-- This enables fast queries without hitting Notion API rate limits

-- Notion Characters sync table
CREATE TABLE IF NOT EXISTS notion_characters_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notion_page_id TEXT UNIQUE NOT NULL,
  notion_database_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT,
  description TEXT,
  properties JSONB DEFAULT '{}',
  content_hash TEXT, -- For change detection
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notion Worlds sync table
CREATE TABLE IF NOT EXISTS notion_worlds_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notion_page_id TEXT UNIQUE NOT NULL,
  notion_database_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT,
  description TEXT,
  properties JSONB DEFAULT '{}',
  content_hash TEXT,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notion Stories sync table
CREATE TABLE IF NOT EXISTS notion_stories_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notion_page_id TEXT UNIQUE NOT NULL,
  notion_database_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT,
  description TEXT,
  properties JSONB DEFAULT '{}',
  content_hash TEXT,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notion Chat Sessions sync table
CREATE TABLE IF NOT EXISTS notion_chat_sessions_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notion_page_id TEXT UNIQUE NOT NULL,
  notion_database_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT,
  transcript TEXT,
  message_count INTEGER DEFAULT 0,
  properties JSONB DEFAULT '{}',
  content_hash TEXT,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generic Notion pages sync table (for other databases)
CREATE TABLE IF NOT EXISTS notion_pages_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notion_page_id TEXT UNIQUE NOT NULL,
  notion_database_id TEXT NOT NULL,
  database_name TEXT NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT,
  content TEXT,
  properties JSONB DEFAULT '{}',
  content_hash TEXT,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_notion_characters_user_id ON notion_characters_sync(user_id);
CREATE INDEX IF NOT EXISTS idx_notion_characters_name ON notion_characters_sync(name);
CREATE INDEX IF NOT EXISTS idx_notion_worlds_user_id ON notion_worlds_sync(user_id);
CREATE INDEX IF NOT EXISTS idx_notion_worlds_name ON notion_worlds_sync(name);
CREATE INDEX IF NOT EXISTS idx_notion_stories_user_id ON notion_stories_sync(user_id);
CREATE INDEX IF NOT EXISTS idx_notion_stories_title ON notion_stories_sync(title);
CREATE INDEX IF NOT EXISTS idx_notion_chat_sessions_user_id ON notion_chat_sessions_sync(user_id);
CREATE INDEX IF NOT EXISTS idx_notion_pages_user_db ON notion_pages_sync(user_id, database_name);

-- GIN indexes for JSONB property searches
CREATE INDEX IF NOT EXISTS idx_notion_characters_properties ON notion_characters_sync USING GIN(properties);
CREATE INDEX IF NOT EXISTS idx_notion_worlds_properties ON notion_worlds_sync USING GIN(properties);
CREATE INDEX IF NOT EXISTS idx_notion_stories_properties ON notion_stories_sync USING GIN(properties);

-- Enable RLS
ALTER TABLE notion_characters_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE notion_worlds_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE notion_stories_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE notion_chat_sessions_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE notion_pages_sync ENABLE ROW LEVEL SECURITY;

-- RLS Policies - users can only see their own synced data
CREATE POLICY "Users can view own notion characters" ON notion_characters_sync FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can view own notion worlds" ON notion_worlds_sync FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can view own notion stories" ON notion_stories_sync FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can view own notion chat sessions" ON notion_chat_sessions_sync FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can view own notion pages" ON notion_pages_sync FOR SELECT USING (auth.uid()::text = user_id);

