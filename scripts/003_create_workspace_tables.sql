-- Create workspaces/projects table
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT DEFAULT '#DC2626',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create chats table (chat sessions)
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Chat',
  is_pinned BOOLEAN DEFAULT false,
  is_temporary BOOLEAN DEFAULT false,
  system_prompt TEXT,
  model TEXT DEFAULT 'openai/gpt-4o-mini',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Update messages table to include chat_id
ALTER TABLE messages ADD COLUMN IF NOT EXISTS chat_id UUID REFERENCES chats(id) ON DELETE CASCADE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';

-- Create user settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  system_prompt TEXT DEFAULT 'You are Authority, a virtual writing and world-building companion. You assist Slade Cupp with creative storytelling, character development, and world building in a gothic aesthetic.',
  default_model TEXT DEFAULT 'openai/gpt-4o-mini',
  theme TEXT DEFAULT 'dark',
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allowing all for now)
CREATE POLICY workspaces_select_all ON workspaces FOR SELECT USING (true);
CREATE POLICY workspaces_insert_all ON workspaces FOR INSERT WITH CHECK (true);
CREATE POLICY workspaces_update_all ON workspaces FOR UPDATE USING (true);
CREATE POLICY workspaces_delete_all ON workspaces FOR DELETE USING (true);

CREATE POLICY chats_select_all ON chats FOR SELECT USING (true);
CREATE POLICY chats_insert_all ON chats FOR INSERT WITH CHECK (true);
CREATE POLICY chats_update_all ON chats FOR UPDATE USING (true);
CREATE POLICY chats_delete_all ON chats FOR DELETE USING (true);

CREATE POLICY user_settings_select_all ON user_settings FOR SELECT USING (true);
CREATE POLICY user_settings_insert_all ON user_settings FOR INSERT WITH CHECK (true);
CREATE POLICY user_settings_update_all ON user_settings FOR UPDATE USING (true);
CREATE POLICY user_settings_delete_all ON user_settings FOR DELETE USING (true);

-- Insert default workspace
INSERT INTO workspaces (name, description, icon, color)
VALUES ('Default Workspace', 'Main workspace for Authority', '🏰', '#DC2626')
ON CONFLICT DO NOTHING;

-- Insert default system settings
INSERT INTO user_settings (user_id, system_prompt)
VALUES ('default_user', 'You are Authority, a virtual writing and world-building companion. You assist Slade Cupp with creative storytelling, character development, and world building in a gothic aesthetic.')
ON CONFLICT DO NOTHING;
