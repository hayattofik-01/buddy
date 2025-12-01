-- Create meetup activities table
BEGIN;

-- Activities table for planned meetup activities
CREATE TABLE IF NOT EXISTS public.meetup_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meetup_id uuid REFERENCES public.meetups(id) ON DELETE CASCADE NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  activity_time timestamptz NOT NULL,
  location text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Activity responses table (going/not going/maybe)
CREATE TABLE IF NOT EXISTS public.activity_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid REFERENCES public.meetup_activities(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  response text NOT NULL CHECK (response IN ('going', 'not_going', 'maybe')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(activity_id, user_id)
);

-- Enable RLS
ALTER TABLE public.meetup_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_responses ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS meetup_activities_meetup_id_idx ON public.meetup_activities(meetup_id);
CREATE INDEX IF NOT EXISTS meetup_activities_time_idx ON public.meetup_activities(activity_time);
CREATE INDEX IF NOT EXISTS activity_responses_activity_id_idx ON public.activity_responses(activity_id);
CREATE INDEX IF NOT EXISTS activity_responses_user_id_idx ON public.activity_responses(user_id);

-- RLS Policies for activities
CREATE POLICY "Meetup members can view activities"
  ON public.meetup_activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.meetup_members
      WHERE meetup_members.meetup_id = meetup_activities.meetup_id
      AND meetup_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Meetup members can create activities"
  ON public.meetup_activities FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meetup_members
      WHERE meetup_members.meetup_id = meetup_activities.meetup_id
      AND meetup_members.user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Activity creators can update their activities"
  ON public.meetup_activities FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Activity creators can delete their activities"
  ON public.meetup_activities FOR DELETE
  USING (created_by = auth.uid());

-- RLS Policies for activity responses
CREATE POLICY "Meetup members can view activity responses"
  ON public.activity_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.meetup_activities
      JOIN public.meetup_members ON meetup_members.meetup_id = meetup_activities.meetup_id
      WHERE meetup_activities.id = activity_responses.activity_id
      AND meetup_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Meetup members can create their responses"
  ON public.activity_responses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meetup_activities
      JOIN public.meetup_members ON meetup_members.meetup_id = meetup_activities.meetup_id
      WHERE meetup_activities.id = activity_responses.activity_id
      AND meetup_members.user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can update their own responses"
  ON public.activity_responses FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own responses"
  ON public.activity_responses FOR DELETE
  USING (user_id = auth.uid());

-- Enable realtime for activities
ALTER PUBLICATION supabase_realtime ADD TABLE public.meetup_activities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_responses;
ALTER TABLE public.meetup_activities REPLICA IDENTITY FULL;
ALTER TABLE public.activity_responses REPLICA IDENTITY FULL;

-- Trigger for updated_at
CREATE TRIGGER meetup_activities_updated_at
  BEFORE UPDATE ON public.meetup_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER activity_responses_updated_at
  BEFORE UPDATE ON public.activity_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

COMMIT;
