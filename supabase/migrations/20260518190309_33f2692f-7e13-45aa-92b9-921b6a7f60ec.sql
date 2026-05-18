CREATE POLICY "Users can update their own recommendations"
ON public.recommendations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.analysis_jobs
    WHERE analysis_jobs.id = recommendations.analysis_job_id
      AND analysis_jobs.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.analysis_jobs
    WHERE analysis_jobs.id = recommendations.analysis_job_id
      AND analysis_jobs.user_id = auth.uid()
  )
);