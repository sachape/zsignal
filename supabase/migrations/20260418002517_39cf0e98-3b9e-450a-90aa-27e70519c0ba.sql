
ALTER TABLE public.analysis_jobs
  ADD COLUMN IF NOT EXISTS platform text,
  ADD COLUMN IF NOT EXISTS platform_user_id text,
  ADD COLUMN IF NOT EXISTS platform_login text;

CREATE INDEX IF NOT EXISTS idx_analysis_jobs_user_platform
  ON public.analysis_jobs (user_id, platform_user_id);
