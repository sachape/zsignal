-- Tighten analysis_reports & stream_score_snapshots: system-generated, immutable from clients.

-- analysis_reports: keep SELECT (owner), keep INSERT (owner + must own the job),
-- drop DELETE, no UPDATE policy (already absent).
DROP POLICY IF EXISTS "Users can delete own reports" ON public.analysis_reports;
DROP POLICY IF EXISTS "Users can insert own reports" ON public.analysis_reports;

CREATE POLICY "Users can insert own reports"
ON public.analysis_reports
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.analysis_jobs j
    WHERE j.id = analysis_job_id AND j.user_id = auth.uid()
  )
);

-- Explicit client deny for UPDATE/DELETE on analysis_reports.
CREATE POLICY "Deny client update on analysis_reports"
ON public.analysis_reports FOR UPDATE TO anon, authenticated
USING (false) WITH CHECK (false);

CREATE POLICY "Deny client delete on analysis_reports"
ON public.analysis_reports FOR DELETE TO anon, authenticated
USING (false);

-- stream_score_snapshots: SELECT owner only. Clients cannot INSERT/UPDATE/DELETE.
-- Writes happen via SECURITY DEFINER trigger (from analysis_reports) and
-- process-analysis-job edge function (service role bypasses RLS).
DROP POLICY IF EXISTS "Users can insert own stream score snapshots" ON public.stream_score_snapshots;
DROP POLICY IF EXISTS "Users can delete own stream score snapshots" ON public.stream_score_snapshots;

CREATE POLICY "Deny client insert on stream_score_snapshots"
ON public.stream_score_snapshots FOR INSERT TO anon, authenticated
WITH CHECK (false);

CREATE POLICY "Deny client update on stream_score_snapshots"
ON public.stream_score_snapshots FOR UPDATE TO anon, authenticated
USING (false) WITH CHECK (false);

CREATE POLICY "Deny client delete on stream_score_snapshots"
ON public.stream_score_snapshots FOR DELETE TO anon, authenticated
USING (false);
