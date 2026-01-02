-- Create table for storing admin configuration settings
-- Note: Using gen_random_uuid() which is available in pgcrypto extension (enabled by default)
CREATE TABLE IF NOT EXISTS admin_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(255) NOT NULL,
  key VARCHAR(255) NOT NULL,
  value TEXT,
  description TEXT,
  is_persistent BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category, key)
);

-- RLS policies
ALTER TABLE admin_config ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can read config
CREATE POLICY "Anyone can read admin config"
  ON admin_config FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can modify config (you'll need to add admin role check)
CREATE POLICY "Admins can modify admin config"
  ON admin_config FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_config_category ON admin_config(category);
CREATE INDEX IF NOT EXISTS idx_admin_config_key ON admin_config(key);
