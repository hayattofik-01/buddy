-- Add additional fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS instagram text,
ADD COLUMN IF NOT EXISTS interests text[],
ADD COLUMN IF NOT EXISTS date_of_birth date;

-- Add comment to explain the fields
COMMENT ON COLUMN public.profiles.instagram IS 'Instagram username (without @)';
COMMENT ON COLUMN public.profiles.interests IS 'Array of user interests/hobbies';
COMMENT ON COLUMN public.profiles.date_of_birth IS 'User date of birth for age calculation';
