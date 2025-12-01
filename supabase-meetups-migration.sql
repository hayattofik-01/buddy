-- Migration: Convert from trips to meetups as primary tables
-- This script makes meetups/meetup_members the actual tables instead of views

BEGIN;

--------------------------------------------------
-- 1) Drop the views and rules (they'll be replaced with real tables)
--------------------------------------------------

DROP RULE IF EXISTS meetups_insert ON public.meetups CASCADE;
DROP RULE IF EXISTS meetups_update ON public.meetups CASCADE;
DROP RULE IF EXISTS meetups_delete ON public.meetups CASCADE;
DROP RULE IF EXISTS meetup_members_insert ON public.meetup_members CASCADE;
DROP RULE IF EXISTS meetup_members_delete ON public.meetup_members CASCADE;

DROP VIEW IF EXISTS public.meetups CASCADE;
DROP VIEW IF EXISTS public.meetup_members CASCADE;

--------------------------------------------------
-- 2) Rename trips tables to meetups (preserve all data)
--------------------------------------------------

-- Rename trips to meetups
ALTER TABLE IF EXISTS public.trips RENAME TO meetups;

-- Rename trip_members to meetup_members
ALTER TABLE IF EXISTS public.trip_members RENAME TO meetup_members;

-- Update foreign key constraint names for clarity
ALTER TABLE public.meetup_members 
  DROP CONSTRAINT IF EXISTS trip_members_trip_id_fkey;
  
ALTER TABLE public.meetup_members 
  ADD CONSTRAINT meetup_members_meetup_id_fkey 
  FOREIGN KEY (trip_id) 
  REFERENCES public.meetups(id) 
  ON DELETE CASCADE;

-- Rename trip_id column to meetup_id in meetup_members
ALTER TABLE public.meetup_members 
  RENAME COLUMN trip_id TO meetup_id;

--------------------------------------------------
-- 3) Update chat_messages to use meetup_id
--------------------------------------------------

-- Add meetup_id column if it doesn't exist
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS meetup_id uuid;

-- Copy trip_id values to meetup_id if trip_id exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'chat_messages'
      AND column_name  = 'trip_id'
  ) THEN
    UPDATE public.chat_messages
    SET meetup_id = trip_id
    WHERE meetup_id IS NULL;
  END IF;
END$$;

-- Drop old foreign key constraint if it exists
ALTER TABLE public.chat_messages
  DROP CONSTRAINT IF EXISTS chat_messages_trip_id_fkey;

-- Add new foreign key constraint to meetups
ALTER TABLE public.chat_messages
  DROP CONSTRAINT IF EXISTS chat_messages_meetup_id_fkey;
  
ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_meetup_id_fkey
  FOREIGN KEY (meetup_id)
  REFERENCES public.meetups (id)
  ON DELETE CASCADE;

-- Make meetup_id NOT NULL
ALTER TABLE public.chat_messages
  ALTER COLUMN meetup_id SET NOT NULL;

-- Drop old trip_id column
ALTER TABLE public.chat_messages
  DROP COLUMN IF EXISTS trip_id;

--------------------------------------------------
-- 4) Update function names for consistency
--------------------------------------------------

-- Update the member count function
DROP FUNCTION IF EXISTS public.get_trip_member_count(uuid);

CREATE OR REPLACE FUNCTION public.get_meetup_member_count(meetup_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
AS $$
  SELECT count(*) FROM public.meetup_members WHERE meetup_members.meetup_id = get_meetup_member_count.meetup_id;
$$;

--------------------------------------------------
-- 5) Update indexes
--------------------------------------------------

-- Recreate chat_messages indexes with new column name
DROP INDEX IF EXISTS chat_messages_trip_id_idx;
CREATE INDEX IF NOT EXISTS chat_messages_meetup_id_idx ON public.chat_messages(meetup_id);

COMMIT;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration complete! All references changed from trips to meetups.';
END $$;
