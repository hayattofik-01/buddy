-- Migration: Add social group links to meetups
-- Adds support for WhatsApp, Telegram, Facebook, and Instagram group links

BEGIN;

-- Add social group link column to meetups table
ALTER TABLE public.meetups
  ADD COLUMN IF NOT EXISTS social_group_link text;

-- Add check constraint to ensure only valid platform URLs
ALTER TABLE public.meetups
  ADD CONSTRAINT social_group_link_valid_platform CHECK (
    social_group_link IS NULL OR
    social_group_link ~ '^https://chat\.whatsapp\.com/[A-Za-z0-9_-]+$' OR
    social_group_link ~ '^https://wa\.me/[0-9]+$' OR
    social_group_link ~ '^https://t\.me/[A-Za-z0-9_]+$' OR
    social_group_link ~ '^https://t\.me/joinchat/[A-Za-z0-9_-]+$' OR
    social_group_link ~ '^https://telegram\.me/[A-Za-z0-9_]+$' OR
    social_group_link ~ '^https://(www\.)?facebook\.com/groups/[A-Za-z0-9.]+/?$' OR
    social_group_link ~ '^https://(www\.)?fb\.com/groups/[A-Za-z0-9.]+/?$' OR
    social_group_link ~ '^https://(www\.)?instagram\.com/[A-Za-z0-9._]+/?$'
  );

-- Add comment for documentation
COMMENT ON COLUMN public.meetups.social_group_link IS 'Optional link to external social group (WhatsApp, Telegram, Facebook, Instagram)';

COMMIT;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration complete! Social group links added to meetups table.';
END $$;
