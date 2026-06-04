ALTER TABLE public.creator_video_generation_jobs
  ADD COLUMN IF NOT EXISTS generation_stage text NOT NULL DEFAULT 'queued',
  ADD COLUMN IF NOT EXISTS callback_status text,
  ADD COLUMN IF NOT EXISTS worker_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS worker_last_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS worker_completed_at timestamptz;

ALTER TABLE public.creator_video_generation_jobs
  DROP CONSTRAINT IF EXISTS creator_video_generation_jobs_generation_stage_check;

ALTER TABLE public.creator_video_generation_jobs
  ADD CONSTRAINT creator_video_generation_jobs_generation_stage_check
  CHECK (generation_stage = ANY (ARRAY[
    'queued'::text,
    'worker_started'::text,
    'downloading'::text,
    'cutting'::text,
    'uploading'::text,
    'completed'::text,
    'failed'::text,
    'cancelled'::text
  ]));

ALTER TABLE public.creator_video_generation_jobs
  DROP CONSTRAINT IF EXISTS creator_video_generation_jobs_callback_status_check;

ALTER TABLE public.creator_video_generation_jobs
  ADD CONSTRAINT creator_video_generation_jobs_callback_status_check
  CHECK (callback_status IS NULL OR callback_status = ANY (ARRAY[
    'received'::text,
    'accepted'::text,
    'rejected'::text
  ]));

UPDATE public.creator_video_generation_jobs
SET generation_stage = CASE
  WHEN status = 'queued' THEN 'queued'
  WHEN status = 'completed' THEN 'completed'
  WHEN status = 'failed' THEN 'failed'
  WHEN status = 'cancelled' THEN 'cancelled'
  WHEN status = 'processing' AND progress >= 80 THEN 'uploading'
  WHEN status = 'processing' AND progress >= 45 THEN 'cutting'
  WHEN status = 'processing' AND progress >= 5 THEN 'downloading'
  ELSE generation_stage
END,
callback_status = COALESCE(callback_status, CASE WHEN status IN ('processing','completed','failed') THEN 'accepted' ELSE NULL END),
worker_started_at = COALESCE(worker_started_at, CASE WHEN status IN ('processing','completed','failed') THEN updated_at ELSE NULL END),
worker_last_seen_at = COALESCE(worker_last_seen_at, CASE WHEN status IN ('processing','completed','failed') THEN updated_at ELSE NULL END),
worker_completed_at = COALESCE(worker_completed_at, completed_at)
WHERE generation_stage = 'queued'
   OR callback_status IS NULL
   OR worker_started_at IS NULL
   OR worker_last_seen_at IS NULL
   OR worker_completed_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_creator_video_generation_jobs_one_active_per_user
  ON public.creator_video_generation_jobs (user_id)
  WHERE status IN ('queued', 'processing');

CREATE INDEX IF NOT EXISTS idx_video_jobs_active_user_updated
  ON public.creator_video_generation_jobs (user_id, updated_at DESC)
  WHERE status IN ('queued', 'processing');