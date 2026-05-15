-- Allow multiple Twitch accounts per Streamnco user (Growth plan)
-- Drop legacy single-account constraint
ALTER TABLE public.connected_accounts
  DROP CONSTRAINT IF EXISTS connected_accounts_user_id_platform_key;

-- Prevent duplicating the same Twitch account for the same user
ALTER TABLE public.connected_accounts
  ADD CONSTRAINT connected_accounts_user_platform_pid_key
  UNIQUE (user_id, platform, platform_user_id);

-- Note: connected_accounts_platform_user_unique already exists as
-- UNIQUE INDEX on (platform, platform_user_id) WHERE platform_user_id IS NOT NULL,
-- which prevents the same Twitch account from being linked to two different users.