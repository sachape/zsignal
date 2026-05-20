
-- Column-level REVOKE doesn't take effect while the role still holds table-level SELECT.
-- Revoke the table-wide privileges, then grant back the safe columns only.

REVOKE SELECT, INSERT, UPDATE ON public.connected_accounts FROM anon, authenticated;

-- Grant SELECT on safe columns only (tokens excluded).
GRANT SELECT (
  id, user_id, platform, platform_user_id, platform_login, platform_display_name,
  scope, expires_at, next_auto_refresh_at, last_auto_refresh_at, created_at, updated_at
) ON public.connected_accounts TO authenticated;

-- DELETE remains policy-controlled; re-grant table-level DELETE.
GRANT DELETE ON public.connected_accounts TO authenticated;

-- Allow INSERT of safe identity columns only (tokens written by edge functions via service_role).
GRANT INSERT (
  user_id, platform, platform_user_id, platform_login, platform_display_name, scope, expires_at
) ON public.connected_accounts TO authenticated;

-- Allow UPDATE of safe identity fields only.
GRANT UPDATE (
  platform_login, platform_display_name, scope, expires_at,
  next_auto_refresh_at, last_auto_refresh_at, updated_at
) ON public.connected_accounts TO authenticated;
