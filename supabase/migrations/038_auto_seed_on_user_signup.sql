-- Auto-seed user data on signup
-- This trigger automatically creates seed data for new users when they sign up
-- Seed data is inserted directly into user-specific sync tables

-- Create function to seed user data on profile creation
CREATE OR REPLACE FUNCTION auto_seed_user_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Automatically seed data for the new user
  -- Use the seed_forge_data function with the new user's ID
  PERFORM seed_forge_data(NEW.user_id::TEXT);
  
  RAISE NOTICE 'Automatically seeded data for new user: %', NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-seed on user_profiles insert
DROP TRIGGER IF EXISTS auto_seed_on_user_signup ON user_profiles;
CREATE TRIGGER auto_seed_on_user_signup
AFTER INSERT ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION auto_seed_user_data();

-- Add comment
COMMENT ON FUNCTION auto_seed_user_data() IS 'Automatically seeds world-building data for new users when their profile is created';
COMMENT ON TRIGGER auto_seed_on_user_signup ON user_profiles IS 'Triggers automatic seed data creation for new users on signup';



