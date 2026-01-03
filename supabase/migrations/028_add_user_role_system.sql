-- Add user role system (pending/user/admin) similar to OpenWebUI
-- Migrates existing is_admin boolean to role enum
-- Auto-assigns admin to first user

-- Create role enum type
CREATE TYPE user_role AS ENUM ('pending', 'user', 'admin');

-- Add role column (default to 'pending' for new users)
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'pending';

-- Migrate existing is_admin to role
UPDATE user_profiles
SET role = CASE
  WHEN is_admin = true THEN 'admin'::user_role
  ELSE 'user'::user_role
END
WHERE role IS NULL OR role = 'pending';

-- Set NOT NULL constraint after migration
ALTER TABLE user_profiles
ALTER COLUMN role SET NOT NULL;

-- Create index for faster role lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- Create function to auto-assign admin to first user
CREATE OR REPLACE FUNCTION assign_admin_to_first_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
BEGIN
  -- Count existing users
  SELECT COUNT(*) INTO user_count FROM user_profiles;
  
  -- If this is the first user, assign admin role
  IF user_count = 1 THEN
    NEW.role := 'admin'::user_role;
    RAISE NOTICE 'First user automatically assigned admin role';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-assign admin on insert
CREATE TRIGGER assign_first_user_admin
BEFORE INSERT ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION assign_admin_to_first_user();

-- Add comment
COMMENT ON COLUMN user_profiles.role IS 'User role: pending (awaiting activation), user (regular access), admin (full access)';
COMMENT ON FUNCTION assign_admin_to_first_user() IS 'Automatically assigns admin role to the first user created in the system';




