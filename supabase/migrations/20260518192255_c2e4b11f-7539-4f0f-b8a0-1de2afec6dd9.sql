-- 1) Defense-in-depth: re-revoke column SELECT on encrypted Twitch tokens.
REVOKE SELECT (access_token_encrypted, refresh_token_encrypted)
  ON public.connected_accounts FROM anon, authenticated, PUBLIC;

-- 2) email-assets bucket: deny client writes, allow service_role only.
DROP POLICY IF EXISTS "email-assets service_role insert" ON storage.objects;
DROP POLICY IF EXISTS "email-assets service_role update" ON storage.objects;
DROP POLICY IF EXISTS "email-assets service_role delete" ON storage.objects;
DROP POLICY IF EXISTS "email-assets deny client insert" ON storage.objects;
DROP POLICY IF EXISTS "email-assets deny client update" ON storage.objects;
DROP POLICY IF EXISTS "email-assets deny client delete" ON storage.objects;

CREATE POLICY "email-assets service_role insert"
ON storage.objects FOR INSERT TO public
WITH CHECK (bucket_id = 'email-assets' AND auth.role() = 'service_role');

CREATE POLICY "email-assets service_role update"
ON storage.objects FOR UPDATE TO public
USING (bucket_id = 'email-assets' AND auth.role() = 'service_role')
WITH CHECK (bucket_id = 'email-assets' AND auth.role() = 'service_role');

CREATE POLICY "email-assets service_role delete"
ON storage.objects FOR DELETE TO public
USING (bucket_id = 'email-assets' AND auth.role() = 'service_role');

CREATE POLICY "email-assets deny client insert"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id <> 'email-assets');

CREATE POLICY "email-assets deny client update"
ON storage.objects FOR UPDATE TO anon, authenticated
USING (bucket_id <> 'email-assets')
WITH CHECK (bucket_id <> 'email-assets');

CREATE POLICY "email-assets deny client delete"
ON storage.objects FOR DELETE TO anon, authenticated
USING (bucket_id <> 'email-assets');

-- 3) email_send_log: allow service_role to purge old rows.
CREATE POLICY "Service role can delete send log"
ON public.email_send_log FOR DELETE TO public
USING (auth.role() = 'service_role');
