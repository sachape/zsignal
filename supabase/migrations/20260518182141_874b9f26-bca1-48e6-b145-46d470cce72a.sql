ALTER TABLE public.analysis_jobs
  ADD COLUMN IF NOT EXISTS score_status text NULL,
  ADD COLUMN IF NOT EXISTS score_computed_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS score_error_message text NULL,
  ADD COLUMN IF NOT EXISTS score_processed_by text NULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'analysis_jobs_score_status_check'
  ) THEN
    ALTER TABLE public.analysis_jobs
      ADD CONSTRAINT analysis_jobs_score_status_check
      CHECK (score_status IS NULL OR score_status IN ('pending','computed','failed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS analysis_jobs_score_status_queued_idx
  ON public.analysis_jobs (platform, status, score_status, created_at)
  WHERE status = 'queued';