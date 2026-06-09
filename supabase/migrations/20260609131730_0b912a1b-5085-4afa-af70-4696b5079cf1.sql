ALTER TABLE public.creator_video_generation_jobs
  DROP CONSTRAINT IF EXISTS creator_video_generation_jobs_generation_stage_check;

ALTER TABLE public.creator_video_generation_jobs
  ADD CONSTRAINT creator_video_generation_jobs_generation_stage_check
  CHECK (generation_stage = ANY (ARRAY[
    'queued'::text,
    'worker_started'::text,
    'downloading'::text,
    'analyzing_layout'::text,
    'detecting_facecam'::text,
    'cutting'::text,
    'compositing'::text,
    'transcribing_audio'::text,
    'rendering_subtitles'::text,
    'uploading'::text,
    'completed'::text,
    'failed'::text,
    'cancelled'::text
  ]));