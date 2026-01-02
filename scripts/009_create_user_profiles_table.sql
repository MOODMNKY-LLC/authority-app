-- Create user profiles table for authentication and profile management
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "user_profiles_select_all" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "user_profiles_insert_own" ON user_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "user_profiles_update_own" ON user_profiles FOR UPDATE USING (true);
CREATE POLICY "user_profiles_delete_own" ON user_profiles FOR DELETE USING (true);

-- Create index
CREATE INDEX IF NOT EXISTS user_profiles_user_id_idx ON user_profiles(user_id);
