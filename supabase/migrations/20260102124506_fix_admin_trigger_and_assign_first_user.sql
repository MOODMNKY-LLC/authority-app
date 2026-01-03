-- Fix admin trigger logic and ensure first user has admin role
-- The trigger was checking user_count = 1, but should check user_count = 0
-- (because COUNT happens BEFORE INSERT, so 0 existing = this is first user)

-- Drop and recreate the trigger function with correct logic
DROP TRIGGER IF EXISTS assign_first_user_admin ON user_profiles;
DROP FUNCTION IF EXISTS assign_admin_to_first_user();

-- Create corrected function
CREATE OR REPLACE FUNCTION assign_admin_to_first_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
BEGIN
  -- Count existing users (BEFORE this insert)
  SELECT COUNT(*) INTO user_count FROM user_profiles;
  
  -- If there are 0 existing users, this is the first user - assign admin
  IF user_count = 0 THEN
    NEW.role := 'admin'::user_role;
    RAISE NOTICE 'First user automatically assigned admin role';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER assign_first_user_admin
BEFORE INSERT ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION assign_admin_to_first_user();

-- Ensure any existing first user gets admin role if they don't have it
-- This handles cases where the user was created before the trigger was fixed
DO $$
DECLARE
  first_user_id TEXT;
  first_user_role user_role;
BEGIN
  -- Get the first user by creation date
  SELECT user_id, role INTO first_user_id, first_user_role
  FROM user_profiles
  ORDER BY created_at ASC
  LIMIT 1;
  
  -- If first user exists and doesn't have admin role, assign it
  IF first_user_id IS NOT NULL AND first_user_role != 'admin' THEN
    UPDATE user_profiles
    SET role = 'admin'::user_role
    WHERE user_id = first_user_id;
    
    RAISE NOTICE 'Assigned admin role to first user: %', first_user_id;
  END IF;
END $$;



