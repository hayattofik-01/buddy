-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('message', 'activity', 'join_request', 'request_accepted')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  meetup_id UUID REFERENCES public.meetups(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

-- Allow system to insert notifications
CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Function to notify meetup members about new messages
CREATE OR REPLACE FUNCTION notify_meetup_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  member_record RECORD;
  meetup_title TEXT;
  sender_name TEXT;
BEGIN
  -- Get meetup title
  SELECT title INTO meetup_title FROM public.meetups WHERE id = NEW.meetup_id;
  
  -- Get sender name
  SELECT username INTO sender_name FROM public.profiles WHERE id = NEW.user_id;
  
  -- Notify all members except the sender
  FOR member_record IN 
    SELECT user_id FROM public.meetup_members 
    WHERE meetup_id = NEW.meetup_id AND user_id != NEW.user_id
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, meetup_id)
    VALUES (
      member_record.user_id,
      'message',
      'New message in ' || meetup_title,
      COALESCE(sender_name, 'Someone') || ': ' || LEFT(NEW.content, 100),
      NEW.meetup_id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Trigger for new messages
DROP TRIGGER IF EXISTS on_new_meetup_message ON public.meetup_chat_messages;
CREATE TRIGGER on_new_meetup_message
  AFTER INSERT ON public.meetup_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_meetup_message();

-- Function to notify meetup members about new activities
CREATE OR REPLACE FUNCTION notify_meetup_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  member_record RECORD;
  meetup_title TEXT;
  creator_name TEXT;
BEGIN
  -- Get meetup title
  SELECT title INTO meetup_title FROM public.meetups WHERE id = NEW.meetup_id;
  
  -- Get creator name
  SELECT username INTO creator_name FROM public.profiles WHERE id = NEW.created_by;
  
  -- Notify all members except the creator
  FOR member_record IN 
    SELECT user_id FROM public.meetup_members 
    WHERE meetup_id = NEW.meetup_id AND user_id != NEW.created_by
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, meetup_id)
    VALUES (
      member_record.user_id,
      'activity',
      'New activity in ' || meetup_title,
      COALESCE(creator_name, 'Someone') || ' created: ' || NEW.title,
      NEW.meetup_id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Trigger for new activities
DROP TRIGGER IF EXISTS on_new_meetup_activity ON public.meetup_activities;
CREATE TRIGGER on_new_meetup_activity
  AFTER INSERT ON public.meetup_activities
  FOR EACH ROW
  EXECUTE FUNCTION notify_meetup_activity();
