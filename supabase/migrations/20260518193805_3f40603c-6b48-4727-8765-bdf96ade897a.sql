
-- =========================================================================
-- 1) PLAN RESOLVER
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_user_effective_plan(uid uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT lower(s.plan_name)
      FROM public.subscriptions s
      WHERE s.user_id = uid
        AND s.status IN ('active', 'trialing')
        AND lower(s.plan_name) IN ('pro', 'growth', 'agency')
      ORDER BY
        CASE lower(s.plan_name)
          WHEN 'agency' THEN 1
          WHEN 'growth' THEN 2
          WHEN 'pro'    THEN 3
          ELSE 4
        END
      LIMIT 1
    ),
    'free'
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_user_effective_plan(uuid) TO authenticated, anon;

-- =========================================================================
-- 2) STREAM SCORE HISTORY — plan-aware SELECT cap + RPCs
-- =========================================================================

-- Replace owner SELECT policy with a plan-capped one.
-- Free users see only the last 30 days; paid users see everything.
DROP POLICY IF EXISTS "Users can view own stream score snapshots" ON public.stream_score_snapshots;

CREATE POLICY "Users can view own stream score snapshots (plan capped)"
ON public.stream_score_snapshots
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  AND (
    public.get_user_effective_plan(auth.uid()) <> 'free'
    OR created_at >= (now() - interval '30 days')
  )
);

-- RPC: plan-aware history range.
CREATE OR REPLACE FUNCTION public.get_streamscore_history(
  p_range_days integer DEFAULT 30,
  p_platform_user_id text DEFAULT NULL
)
RETURNS SETOF public.stream_score_snapshots
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  plan_name text;
  effective_days integer;
BEGIN
  IF uid IS NULL THEN RETURN; END IF;

  plan_name := public.get_user_effective_plan(uid);
  effective_days := CASE
    WHEN plan_name = 'free' THEN LEAST(COALESCE(p_range_days, 30), 30)
    ELSE GREATEST(COALESCE(p_range_days, 90), 1)
  END;

  IF p_platform_user_id IS NULL THEN
    RETURN QUERY
      SELECT s.*
      FROM public.stream_score_snapshots s
      WHERE s.user_id = uid
        AND s.created_at >= (now() - (effective_days || ' days')::interval)
      ORDER BY s.created_at ASC;
  ELSE
    RETURN QUERY
      SELECT s.*
      FROM public.stream_score_snapshots s
      WHERE s.user_id = uid
        AND s.created_at >= (now() - (effective_days || ' days')::interval)
        AND s.analysis_job_id IN (
          SELECT j.id
          FROM public.analysis_jobs j
          WHERE j.user_id = uid
            AND j.platform = 'twitch'
            AND j.platform_user_id = p_platform_user_id
        )
      ORDER BY s.created_at ASC;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_streamscore_history(integer, text) TO authenticated;

-- RPC: latest snapshot — never gated by 30d so dashboard current score keeps working.
CREATE OR REPLACE FUNCTION public.get_latest_streamscore_snapshot(
  p_platform_user_id text DEFAULT NULL
)
RETURNS SETOF public.stream_score_snapshots
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RETURN; END IF;

  IF p_platform_user_id IS NULL THEN
    RETURN QUERY
      SELECT s.*
      FROM public.stream_score_snapshots s
      WHERE s.user_id = uid
      ORDER BY s.created_at DESC
      LIMIT 1;
  ELSE
    RETURN QUERY
      SELECT s.*
      FROM public.stream_score_snapshots s
      WHERE s.user_id = uid
        AND s.analysis_job_id IN (
          SELECT j.id
          FROM public.analysis_jobs j
          WHERE j.user_id = uid
            AND j.platform = 'twitch'
            AND j.platform_user_id = p_platform_user_id
        )
      ORDER BY s.created_at DESC
      LIMIT 1;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_latest_streamscore_snapshot(text) TO authenticated;

-- =========================================================================
-- 3) LEADERBOARD — revoke public read on channel_stream_scores
-- =========================================================================
-- Frontend never reads this table directly; only the twitch-public-lookup
-- edge function (now switched to service_role) reads it.
DROP POLICY IF EXISTS "Anyone can read channel stream scores" ON public.channel_stream_scores;

CREATE POLICY "Service role can read channel stream scores"
ON public.channel_stream_scores
FOR SELECT
TO public
USING (auth.role() = 'service_role');

-- =========================================================================
-- 4) COMPETITORS — remove direct client SELECT + plan-aware RPC
-- =========================================================================
DROP POLICY IF EXISTS "Users can view own competitors" ON public.competitor_matches;

CREATE POLICY "Deny direct client select on competitor_matches"
ON public.competitor_matches
FOR SELECT
TO anon, authenticated
USING (false);

CREATE OR REPLACE FUNCTION public.get_competitor_matches_for_job(
  p_analysis_job_id uuid
)
RETURNS SETOF public.competitor_matches
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  plan_name text;
  row_limit integer;
BEGIN
  IF uid IS NULL THEN RETURN; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.analysis_jobs j
    WHERE j.id = p_analysis_job_id AND j.user_id = uid
  ) THEN
    RETURN;
  END IF;

  plan_name := public.get_user_effective_plan(uid);
  row_limit := CASE WHEN plan_name = 'free' THEN 3 ELSE 100 END;

  RETURN QUERY
    SELECT c.*
    FROM public.competitor_matches c
    WHERE c.analysis_job_id = p_analysis_job_id
    ORDER BY
      c.similarity_score DESC NULLS LAST,
      c.follower_count   DESC NULLS LAST,
      c.created_at       DESC
    LIMIT row_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_competitor_matches_for_job(uuid) TO authenticated;
