ALTER TABLE public.creator_content_items
  DROP CONSTRAINT IF EXISTS creator_content_items_status_check;

ALTER TABLE public.creator_content_items
  ADD CONSTRAINT creator_content_items_status_check
  CHECK (status = ANY (ARRAY[
    'idea'::text,
    'to_produce'::text,
    'to_generate'::text,
    'generating'::text,
    'draft_ready'::text,
    'ready'::text,
    'uploaded'::text,
    'published'::text,
    'published_manually'::text,
    'ignored'::text
  ]));

ALTER TABLE public.creator_content_items
  ADD COLUMN IF NOT EXISTS source_platform text,
  ADD COLUMN IF NOT EXISTS source_video_url text,
  ADD COLUMN IF NOT EXISTS source_start_time integer,
  ADD COLUMN IF NOT EXISTS source_end_time integer,
  ADD COLUMN IF NOT EXISTS source_duration integer,
  ADD COLUMN IF NOT EXISTS generated_video_url text,
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS generation_status text,
  ADD COLUMN IF NOT EXISTS generation_error text;

ALTER TABLE public.creator_content_items
  DROP CONSTRAINT IF EXISTS creator_content_items_source_platform_check;

ALTER TABLE public.creator_content_items
  ADD CONSTRAINT creator_content_items_source_platform_check
  CHECK (source_platform IS NULL OR source_platform = ANY (ARRAY['twitch'::text, 'youtube'::text, 'manual'::text]));

ALTER TABLE public.creator_content_items
  DROP CONSTRAINT IF EXISTS creator_content_items_generation_status_check;

ALTER TABLE public.creator_content_items
  ADD CONSTRAINT creator_content_items_generation_status_check
  CHECK (generation_status IS NULL OR generation_status = ANY (ARRAY[
    'pending'::text,
    'queued'::text,
    'processing'::text,
    'succeeded'::text,
    'failed'::text,
    'unavailable'::text
  ]));