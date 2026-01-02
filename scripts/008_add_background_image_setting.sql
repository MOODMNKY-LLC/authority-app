-- Add background_image column to user_settings table
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS background_image TEXT;
