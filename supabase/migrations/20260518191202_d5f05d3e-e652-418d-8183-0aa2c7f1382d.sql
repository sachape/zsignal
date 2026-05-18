
-- Revoke client read access to encrypted token columns; only service_role keeps it
REVOKE SELECT (access_token_encrypted, refresh_token_encrypted)
  ON public.connected_accounts FROM authenticated, anon;

-- Owner-scoped UPDATE on analysis_reports
DROP POLICY IF EXISTS "Users can update their own analysis reports" ON public.analysis_reports;
CREATE POLICY "Users can update their own analysis reports"
  ON public.analysis_reports
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Owner-scoped UPDATE on stream_score_snapshots
DROP POLICY IF EXISTS "Users can update their own stream score snapshots" ON public.stream_score_snapshots;
CREATE POLICY "Users can update their own stream score snapshots"
  ON public.stream_score_snapshots
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
