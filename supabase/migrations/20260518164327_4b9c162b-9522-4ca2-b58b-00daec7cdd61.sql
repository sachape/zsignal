
-- Validation trigger: ensure user_preferences.active_connected_account_id
-- always references a connected_accounts row owned by the same user_id.
CREATE OR REPLACE FUNCTION public.validate_user_preferences_active_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_id uuid;
BEGIN
  IF NEW.active_connected_account_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT user_id INTO owner_id
  FROM public.connected_accounts
  WHERE id = NEW.active_connected_account_id;

  IF owner_id IS NULL THEN
    RAISE EXCEPTION 'active_connected_account_id % does not exist', NEW.active_connected_account_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF owner_id <> NEW.user_id THEN
    RAISE EXCEPTION 'active_connected_account_id % does not belong to user %', NEW.active_connected_account_id, NEW.user_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_uprefs_validate_active_account ON public.user_preferences;

CREATE TRIGGER trg_uprefs_validate_active_account
BEFORE INSERT OR UPDATE OF active_connected_account_id, user_id
ON public.user_preferences
FOR EACH ROW
EXECUTE FUNCTION public.validate_user_preferences_active_account();
