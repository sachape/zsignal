
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS zernio_profile_id text;

ALTER TABLE public.creator_connected_accounts
  ADD COLUMN IF NOT EXISTS zernio_account_id text;

CREATE INDEX IF NOT EXISTS idx_creator_connected_accounts_zernio_account
  ON public.creator_connected_accounts (zernio_account_id)
  WHERE zernio_account_id IS NOT NULL;

ALTER TABLE public.creator_social_posts
  ADD COLUMN IF NOT EXISTS zernio_post_id text,
  ADD COLUMN IF NOT EXISTS zernio_raw_response jsonb,
  ADD COLUMN IF NOT EXISTS target_account_ids jsonb;

CREATE INDEX IF NOT EXISTS idx_creator_social_posts_zernio_post
  ON public.creator_social_posts (zernio_post_id)
  WHERE zernio_post_id IS NOT NULL;
