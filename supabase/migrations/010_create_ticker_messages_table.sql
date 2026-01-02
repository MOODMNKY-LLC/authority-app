CREATE TABLE IF NOT EXISTS ticker_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE ticker_messages ENABLE ROW LEVEL SECURITY;

-- Allow all users to read ticker messages
CREATE POLICY "Allow all to read ticker messages"
  ON ticker_messages
  FOR SELECT
  USING (is_active = true);

-- Insert some default ticker messages
INSERT INTO ticker_messages (message, priority) VALUES
  ('Welcome to Authority - Your Gothic Writing Companion', 1),
  ('New: Forge tools for character and world building', 2),
  ('Tip: Use Projects to organize your creative work', 3);
