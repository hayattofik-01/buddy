-- Add pinned message support to chat_messages
BEGIN;

-- Add pinned column and pinned_by to track who pinned the message
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS pinned boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS pinned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pinned_at timestamptz;

-- Create index for pinned messages
CREATE INDEX IF NOT EXISTS chat_messages_pinned_idx ON public.chat_messages(meetup_id, pinned) WHERE pinned = true;

-- RLS Policy: Only meetup creators can pin/unpin messages
CREATE POLICY "Meetup creators can update pinned status"
  ON public.chat_messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.meetups
      WHERE meetups.id = chat_messages.meetup_id
      AND meetups.creator_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meetups
      WHERE meetups.id = chat_messages.meetup_id
      AND meetups.creator_id = auth.uid()
    )
  );

COMMIT;
