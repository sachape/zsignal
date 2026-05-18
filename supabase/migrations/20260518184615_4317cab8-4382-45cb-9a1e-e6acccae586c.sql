
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_user_preferences_active_account() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_user() FROM PUBLIC, anon;
