
-- SECURITY DEFINER function that validates a token against the vault-stored
-- cron secret. The secret value is never returned. Called by the monitor
-- edge function (service role) to authenticate scheduled invocations.
CREATE OR REPLACE FUNCTION public.verify_eventsub_cron_secret(token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  expected text;
BEGIN
  SELECT decrypted_secret INTO expected
  FROM vault.decrypted_secrets
  WHERE name = 'eventsub_cron_secret'
  LIMIT 1;

  IF expected IS NULL OR token IS NULL THEN
    RETURN false;
  END IF;

  RETURN expected = token;
END;
$$;

-- Lock down: only service_role should call this. Revoke from public/authenticated.
REVOKE ALL ON FUNCTION public.verify_eventsub_cron_secret(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_eventsub_cron_secret(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_eventsub_cron_secret(text) TO service_role;
