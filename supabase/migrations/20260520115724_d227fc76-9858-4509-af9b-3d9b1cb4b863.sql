
-- 1. Revoke direct SELECT on encrypted token columns from anon/authenticated.
-- Service role bypasses column grants, so edge functions retain access.
REVOKE SELECT (access_token_encrypted, refresh_token_encrypted)
  ON public.connected_accounts FROM anon, authenticated;
REVOKE UPDATE (access_token_encrypted, refresh_token_encrypted)
  ON public.connected_accounts FROM anon, authenticated;
REVOKE INSERT (access_token_encrypted, refresh_token_encrypted)
  ON public.connected_accounts FROM anon, authenticated;

-- 2. Restrict profiles write policies to authenticated only (defence-in-depth).
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- 3. Lock down market intelligence raw tables: service_role only.
-- Frontend already uses edge functions / sanitized leaderboard endpoints;
-- no client code reads these tables directly.
DROP POLICY IF EXISTS "Authenticated can read channel index" ON public.twitch_channel_index;
DROP POLICY IF EXISTS "Authenticated can read channel daily stats" ON public.twitch_channel_daily_stats;

-- twitch_stream_snapshots: authenticated SELECT policy (if exists)
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='twitch_stream_snapshots' AND cmd='SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.twitch_stream_snapshots', p.policyname);
  END LOOP;
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='twitch_market_runs' AND cmd='SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.twitch_market_runs', p.policyname);
  END LOOP;
END$$;

-- No SELECT policies = no authenticated/anon SELECT possible.
-- Service role bypasses RLS, so cron/edge functions are unaffected.
-- Re-assert deny-all defence (explicit, future-proof).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='twitch_stream_snapshots' AND policyname='Deny client select on stream snapshots') THEN
    CREATE POLICY "Deny client select on stream snapshots"
      ON public.twitch_stream_snapshots FOR SELECT TO anon, authenticated USING (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='twitch_market_runs' AND policyname='Deny client select on market runs') THEN
    CREATE POLICY "Deny client select on market runs"
      ON public.twitch_market_runs FOR SELECT TO anon, authenticated USING (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='twitch_channel_index' AND policyname='Deny client select on channel index') THEN
    CREATE POLICY "Deny client select on channel index"
      ON public.twitch_channel_index FOR SELECT TO anon, authenticated USING (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='twitch_channel_daily_stats' AND policyname='Deny client select on channel daily stats') THEN
    CREATE POLICY "Deny client select on channel daily stats"
      ON public.twitch_channel_daily_stats FOR SELECT TO anon, authenticated USING (false);
  END IF;
END$$;
