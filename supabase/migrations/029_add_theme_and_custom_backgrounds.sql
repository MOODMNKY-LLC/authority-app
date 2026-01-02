-- Add custom_backgrounds column to user_settings for storing uploaded background image URLs
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS custom_backgrounds JSONB DEFAULT '[]'::jsonb;

-- Add comment
COMMENT ON COLUMN user_settings.custom_backgrounds IS 'Array of custom background image URLs uploaded by the user';

-- Create storage bucket for user backgrounds
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-backgrounds',
  'user-backgrounds',
  false, -- Private bucket - users can only access their own backgrounds
  10485760, -- 10MB (10 * 1024 * 1024)
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (to allow re-running migration)
-- Note: These may fail if policies don't exist or if we don't have permissions - that's OK
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can upload their own backgrounds" ON storage.objects;
EXCEPTION WHEN OTHERS THEN
  -- Ignore errors - policy may not exist or we may not have permission
  NULL;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can read their own backgrounds" ON storage.objects;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can delete their own backgrounds" ON storage.objects;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Users can upload backgrounds to their own folder
-- Note: In production, these policies may need to be created via Supabase Dashboard
-- if migration user doesn't have storage.objects permissions
DO $$
BEGIN
  CREATE POLICY "Users can upload their own backgrounds"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'user-backgrounds' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
EXCEPTION WHEN OTHERS THEN
  -- Policy creation failed - may need to be created manually in Supabase Dashboard
  RAISE NOTICE 'Could not create storage policy "Users can upload their own backgrounds". You may need to create it manually in Supabase Dashboard.';
END $$;

-- Users can read their own backgrounds
DO $$
BEGIN
  CREATE POLICY "Users can read their own backgrounds"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'user-backgrounds' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not create storage policy "Users can read their own backgrounds". You may need to create it manually in Supabase Dashboard.';
END $$;

-- Users can delete their own backgrounds
DO $$
BEGIN
  CREATE POLICY "Users can delete their own backgrounds"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'user-backgrounds' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not create storage policy "Users can delete their own backgrounds". You may need to create it manually in Supabase Dashboard.';
END $$;

