-- Create tables for story, character, and world management

-- Stories table
CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  title TEXT NOT NULL,
  description TEXT,
  genre TEXT,
  setting TEXT,
  status TEXT DEFAULT 'draft',
  notion_page_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Characters table
CREATE TABLE IF NOT EXISTS characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  description TEXT,
  personality TEXT,
  backstory TEXT,
  appearance TEXT,
  notion_page_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Worlds table  
CREATE TABLE IF NOT EXISTS worlds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  geography TEXT,
  history TEXT,
  culture TEXT,
  magic_system TEXT,
  notion_page_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Automation logs table for n8n workflows
CREATE TABLE IF NOT EXISTS automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  workflow_name TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  payload JSONB,
  status TEXT DEFAULT 'pending',
  result JSONB,
  error TEXT
);

-- Enable RLS
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE worlds ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow all for now)
CREATE POLICY stories_select_all ON stories FOR SELECT USING (true);
CREATE POLICY stories_insert_all ON stories FOR INSERT WITH CHECK (true);
CREATE POLICY stories_update_all ON stories FOR UPDATE USING (true);
CREATE POLICY stories_delete_all ON stories FOR DELETE USING (true);

CREATE POLICY characters_select_all ON characters FOR SELECT USING (true);
CREATE POLICY characters_insert_all ON characters FOR INSERT WITH CHECK (true);
CREATE POLICY characters_update_all ON characters FOR UPDATE USING (true);
CREATE POLICY characters_delete_all ON characters FOR DELETE USING (true);

CREATE POLICY worlds_select_all ON worlds FOR SELECT USING (true);
CREATE POLICY worlds_insert_all ON worlds FOR INSERT WITH CHECK (true);
CREATE POLICY worlds_update_all ON worlds FOR UPDATE USING (true);
CREATE POLICY worlds_delete_all ON worlds FOR DELETE USING (true);

CREATE POLICY automation_logs_select_all ON automation_logs FOR SELECT USING (true);
CREATE POLICY automation_logs_insert_all ON automation_logs FOR INSERT WITH CHECK (true);
CREATE POLICY automation_logs_update_all ON automation_logs FOR UPDATE USING (true);
