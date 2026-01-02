-- Remove the default project that was auto-created
-- Projects should only exist when user creates them
DELETE FROM projects WHERE name = 'Default Project';
