
-- 1) Explicit deny-write policies on EventSub tables (service role bypasses RLS)
-- twitch_eventsub_events
CREATE POLICY "Deny writes from clients (events insert)"
ON public.twitch_eventsub_events FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "Deny writes from clients (events update)"
ON public.twitch_eventsub_events FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny writes from clients (events delete)"
ON public.twitch_eventsub_events FOR DELETE TO authenticated, anon USING (false);

-- twitch_eventsub_subscriptions
CREATE POLICY "Deny writes from clients (subs insert)"
ON public.twitch_eventsub_subscriptions FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "Deny writes from clients (subs update)"
ON public.twitch_eventsub_subscriptions FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny writes from clients (subs delete)"
ON public.twitch_eventsub_subscriptions FOR DELETE TO authenticated, anon USING (false);

-- twitch_eventsub_processing_logs (no policies at all -> add explicit deny on all ops)
CREATE POLICY "Deny all client access (logs select)"
ON public.twitch_eventsub_processing_logs FOR SELECT TO authenticated, anon USING (false);
CREATE POLICY "Deny all client access (logs insert)"
ON public.twitch_eventsub_processing_logs FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "Deny all client access (logs update)"
ON public.twitch_eventsub_processing_logs FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny all client access (logs delete)"
ON public.twitch_eventsub_processing_logs FOR DELETE TO authenticated, anon USING (false);

-- 2) Revoke EXECUTE on internal SECURITY DEFINER functions from public/anon/authenticated.
--    These are only meant to be called by the backend (service role).
REVOKE ALL ON FUNCTION public.verify_eventsub_cron_secret(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;

-- 3) Set a fixed search_path on the two helper queue functions that were missing it.
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
