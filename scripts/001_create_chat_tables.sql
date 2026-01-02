-- Create messages table for storing chat history
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read messages (adjust based on your needs)
CREATE POLICY "messages_select_all"
  ON public.messages FOR SELECT
  USING (true);

-- Allow anyone to insert messages (adjust based on your needs)
CREATE POLICY "messages_insert_all"
  ON public.messages FOR INSERT
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON public.messages(created_at DESC);
