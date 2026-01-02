-- Make project_id nullable in chats table to allow normal chats
ALTER TABLE chats ALTER COLUMN project_id DROP NOT NULL;

-- Update chats table to support both normal and project-based chats
ALTER TABLE chats ADD COLUMN IF NOT EXISTS is_project_chat BOOLEAN DEFAULT false;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_chats_project_id ON chats(project_id);
CREATE INDEX IF NOT EXISTS idx_chats_is_project_chat ON chats(is_project_chat);
