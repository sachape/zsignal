CREATE UNIQUE INDEX IF NOT EXISTS connected_accounts_platform_user_unique
  ON public.connected_accounts (platform, platform_user_id)
  WHERE platform_user_id IS NOT NULL;