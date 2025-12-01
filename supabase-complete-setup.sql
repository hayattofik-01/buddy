-- TravelMate Complete Database Setup
-- Run this entire script in your Supabase SQL Editor

-- Create app_role enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username text UNIQUE,
  avatar_url text,
  bio text,
  name text,
  date_of_birth date,
  location text,
  instagram text,
  languages text[],
  countries_traveled text[],
  interests text[],
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add missing columns to profiles if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'name') THEN
    ALTER TABLE public.profiles ADD COLUMN name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'date_of_birth') THEN
    ALTER TABLE public.profiles ADD COLUMN date_of_birth date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'location') THEN
    ALTER TABLE public.profiles ADD COLUMN location text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'instagram') THEN
    ALTER TABLE public.profiles ADD COLUMN instagram text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'languages') THEN
    ALTER TABLE public.profiles ADD COLUMN languages text[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'countries_traveled') THEN
    ALTER TABLE public.profiles ADD COLUMN countries_traveled text[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'interests') THEN
    ALTER TABLE public.profiles ADD COLUMN interests text[];
  END IF;
END $$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create meetups table
CREATE TABLE IF NOT EXISTS public.meetups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  destination text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  meeting_point text,
  type text CHECK (type IN ('open', 'locked')) NOT NULL,
  max_members integer NOT NULL,
  image_url text NOT NULL,
  description text,
  is_paid boolean DEFAULT false NOT NULL,
  creator_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.meetups ENABLE ROW LEVEL SECURITY;

-- Create meetup_members table
CREATE TABLE IF NOT EXISTS public.meetup_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  meetup_id uuid REFERENCES public.meetups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(meetup_id, user_id)
);

ALTER TABLE public.meetup_members ENABLE ROW LEVEL SECURITY;

-- Drop and recreate chat_messages table for clean state
DROP TABLE IF EXISTS public.chat_messages CASCADE;

CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meetup_id uuid REFERENCES public.meetups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message_type text NOT NULL CHECK (message_type IN ('text', 'image', 'file', 'location')),
  content text NOT NULL,
  file_url text,
  file_name text,
  file_size bigint,
  pinned boolean DEFAULT false,
  pinned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  pinned_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Create indexes for chat performance
CREATE INDEX IF NOT EXISTS chat_messages_meetup_id_idx ON public.chat_messages(meetup_id);
CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx ON public.chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS chat_messages_pinned_idx ON public.chat_messages(meetup_id, pinned) WHERE pinned = true;

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

DROP POLICY IF EXISTS "Meetups are viewable by everyone" ON public.meetups;
DROP POLICY IF EXISTS "Authenticated users can create meetups" ON public.meetups;
DROP POLICY IF EXISTS "Meetup creators can update their meetups" ON public.meetups;
DROP POLICY IF EXISTS "Meetup creators can delete their meetups" ON public.meetups;

DROP POLICY IF EXISTS "Meetup members are viewable by everyone" ON public.meetup_members;
DROP POLICY IF EXISTS "Authenticated users can join meetups" ON public.meetup_members;
DROP POLICY IF EXISTS "Users can leave meetups they joined" ON public.meetup_members;

DROP POLICY IF EXISTS "Meetup members can view messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Meetup members can insert messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Meetup creators can update pinned status" ON public.chat_messages;

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

-- RLS Policies for profiles
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for meetups
CREATE POLICY "Meetups are viewable by everyone"
  ON public.meetups FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create meetups"
  ON public.meetups FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Meetup creators can update their meetups"
  ON public.meetups FOR UPDATE
  USING (auth.uid() = creator_id);

CREATE POLICY "Meetup creators can delete their meetups"
  ON public.meetups FOR DELETE
  USING (auth.uid() = creator_id);

-- RLS Policies for meetup_members
CREATE POLICY "Meetup members are viewable by everyone"
  ON public.meetup_members FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can join meetups"
  ON public.meetup_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave meetups they joined"
  ON public.meetup_members FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for chat_messages
CREATE POLICY "Meetup members can view messages"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.meetup_members
      WHERE meetup_members.meetup_id = chat_messages.meetup_id
      AND meetup_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Meetup members can insert messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meetup_members
      WHERE meetup_members.meetup_id = chat_messages.meetup_id
      AND meetup_members.user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can delete their own messages"
  ON public.chat_messages FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policy: Only meetup creators can pin/unpin messages
CREATE POLICY "Meetup creators can update pinned status"
  ON public.chat_messages FOR UPDATE
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

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Function to check if a user has a role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
    AND role = _role
  )
$$;

-- Function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, name, date_of_birth)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'name',
    (new.raw_user_meta_data->>'date_of_birth')::date
  );
  RETURN new;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to count meetup members
CREATE OR REPLACE FUNCTION public.get_meetup_member_count(meetup_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
AS $$
  SELECT count(*) FROM public.meetup_members WHERE meetup_members.meetup_id = get_meetup_member_count.meetup_id;
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS chat_messages_updated_at ON public.chat_messages;

CREATE TRIGGER chat_messages_updated_at
  BEFORE UPDATE ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Storage bucket for meetup files
INSERT INTO storage.buckets (id, name, public)
VALUES ('meetup-uploads', 'meetup-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Storage bucket for user avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies to avoid conflicts
DROP POLICY IF EXISTS "Meetup members can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view meetup files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;

-- Storage policies for meetup uploads
CREATE POLICY "Meetup members can upload files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'meetup-uploads' AND
    auth.uid()::text = (storage.foldername(name))[2]
  );

CREATE POLICY "Anyone can view meetup files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'meetup-uploads');

-- Storage policies for avatars
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Enable realtime for chat
DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.chat_messages;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

-- Drop rules first (they depend on the views/tables)
DROP RULE IF EXISTS meetups_insert ON public.meetups CASCADE;
DROP RULE IF EXISTS meetups_update ON public.meetups CASCADE;
DROP RULE IF EXISTS meetups_delete ON public.meetups CASCADE;
DROP RULE IF EXISTS meetup_members_insert ON public.meetup_members CASCADE;
DROP RULE IF EXISTS meetup_members_delete ON public.meetup_members CASCADE;

-- Drop any old trips tables if they exist (migration from old schema)
DROP TABLE IF EXISTS public.trips CASCADE;
DROP TABLE IF EXISTS public.trip_members CASCADE;

-- Note: Meetups and meetup_members are now real tables, not views

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'TravelMate database setup complete! Meetups, members, chat, and storage are ready.';
END $$;
