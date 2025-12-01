-- Create global community chat table
BEGIN;

-- Community chat messages table
CREATE TABLE IF NOT EXISTS public.community_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  message_type text NOT NULL CHECK (message_type IN ('text', 'image', 'file', 'location')),
  content text NOT NULL,
  file_url text,
  file_name text,
  file_size integer,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS community_messages_user_id_idx ON public.community_messages(user_id);
CREATE INDEX IF NOT EXISTS community_messages_created_at_idx ON public.community_messages(created_at);

-- RLS Policies - Anyone authenticated can read
CREATE POLICY "Anyone can view community messages"
  ON public.community_messages FOR SELECT
  TO authenticated
  USING (true);

-- Only authenticated users can send messages
CREATE POLICY "Authenticated users can create messages"
  ON public.community_messages FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own messages
CREATE POLICY "Users can update their own messages"
  ON public.community_messages FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own messages
CREATE POLICY "Users can delete their own messages"
  ON public.community_messages FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_messages;
ALTER TABLE public.community_messages REPLICA IDENTITY FULL;

-- Trigger for updated_at
CREATE TRIGGER community_messages_updated_at
  BEFORE UPDATE ON public.community_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

COMMIT;
