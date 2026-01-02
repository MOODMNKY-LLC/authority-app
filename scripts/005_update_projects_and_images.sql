-- Rename workspaces to projects and add image gallery
ALTER TABLE workspaces RENAME TO projects;
ALTER TABLE chats RENAME COLUMN workspace_id TO project_id;

-- Create generated_images table for image gallery
CREATE TABLE IF NOT EXISTS generated_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  url TEXT NOT NULL,
  model TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add custom instructions to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS custom_instructions TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS system_prompt TEXT;

-- Enable RLS for images
ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY images_select_all ON generated_images FOR SELECT USING (true);
CREATE POLICY images_insert_all ON generated_images FOR INSERT WITH CHECK (true);
CREATE POLICY images_delete_all ON generated_images FOR DELETE USING (true);

-- Update default project
UPDATE projects 
SET custom_instructions = 'This project is for general writing and world building tasks.',
    system_prompt = 'You are Authority, a virtual writing and world-building companion.'
WHERE name = 'Default Workspace';

UPDATE projects SET name = 'Default Project' WHERE name = 'Default Workspace';
