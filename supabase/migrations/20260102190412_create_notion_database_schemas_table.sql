-- Create table to cache Notion database schemas
-- This stores the exact schema structure for each database to avoid repeated API calls
-- and enable better property mapping

CREATE TABLE IF NOT EXISTS notion_database_schemas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  database_id TEXT NOT NULL,
  database_name TEXT NOT NULL,
  schema_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one schema per user per database
  UNIQUE(user_id, database_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_notion_database_schemas_user_database 
  ON notion_database_schemas(user_id, database_id);

-- Index for database name lookups
CREATE INDEX IF NOT EXISTS idx_notion_database_schemas_user_name 
  ON notion_database_schemas(user_id, database_name);

-- RLS Policies
ALTER TABLE notion_database_schemas ENABLE ROW LEVEL SECURITY;

-- Users can only access their own schemas
CREATE POLICY "Users can view their own database schemas"
  ON notion_database_schemas
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own database schemas"
  ON notion_database_schemas
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own database schemas"
  ON notion_database_schemas
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own database schemas"
  ON notion_database_schemas
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update last_updated timestamp
CREATE OR REPLACE FUNCTION update_notion_schema_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notion_schema_timestamp_trigger
  BEFORE UPDATE ON notion_database_schemas
  FOR EACH ROW
  EXECUTE FUNCTION update_notion_schema_timestamp();

COMMENT ON TABLE notion_database_schemas IS 'Cached Notion database schemas for faster property mapping';
COMMENT ON COLUMN notion_database_schemas.schema_json IS 'JSONB containing the full database schema from Notion API (databases.retrieve().properties)';


