-- 1. Defense-in-depth: explicitly revoke column-level access to encrypted tokens
REVOKE SELECT (access_token_encrypted, refresh_token_encrypted),
       INSERT (access_token_encrypted, refresh_token_encrypted),
       UPDATE (access_token_encrypted, refresh_token_encrypted)
  ON public.connected_accounts FROM anon, authenticated;

-- 2. Recommendations: align all DML policies to authenticated role (access derived via parent analysis_jobs.user_id)
DROP POLICY IF EXISTS "Users can view own recommendations" ON public.recommendations;
DROP POLICY IF EXISTS "Users can insert own recommendations" ON public.recommendations;
DROP POLICY IF EXISTS "Users can delete own recommendations" ON public.recommendations;
DROP POLICY IF EXISTS "Users can update their own recommendations" ON public.recommendations;

CREATE POLICY "Users can view own recommendations"
  ON public.recommendations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.analysis_jobs j
    WHERE j.id = recommendations.analysis_job_id AND j.user_id = auth.uid()));

CREATE POLICY "Users can insert own recommendations"
  ON public.recommendations FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.analysis_jobs j
    WHERE j.id = recommendations.analysis_job_id AND j.user_id = auth.uid()));

CREATE POLICY "Users can update their own recommendations"
  ON public.recommendations FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.analysis_jobs j
    WHERE j.id = recommendations.analysis_job_id AND j.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.analysis_jobs j
    WHERE j.id = recommendations.analysis_job_id AND j.user_id = auth.uid()));

CREATE POLICY "Users can delete own recommendations"
  ON public.recommendations FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.analysis_jobs j
    WHERE j.id = recommendations.analysis_job_id AND j.user_id = auth.uid()));

-- 3. Revoke EXECUTE from anon/public on SECURITY DEFINER functions intended for authenticated users only
REVOKE EXECUTE ON FUNCTION public.get_competitor_matches_for_job(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_latest_streamscore_snapshot(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_streamscore_history(integer, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_effective_plan(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_competitor_matches_for_job(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_latest_streamscore_snapshot(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_streamscore_history(integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_effective_plan(uuid) TO authenticated;