-- Add is_admin column to user_profiles table
-- This allows distinguishing between admin users and regular users

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Create index for faster admin lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_admin ON user_profiles(is_admin) WHERE is_admin = true;

-- Add comment
COMMENT ON COLUMN user_profiles.is_admin IS 'Whether this user has admin privileges. Admin users can access the Admin Panel for system-wide configuration.';


