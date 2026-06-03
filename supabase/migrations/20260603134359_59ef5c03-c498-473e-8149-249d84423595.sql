ALTER TABLE public.creator_content_items
  ADD COLUMN IF NOT EXISTS youtube_video_id text,
  ADD COLUMN IF NOT EXISTS youtube_url text,
  ADD COLUMN IF NOT EXISTS youtube_uploaded_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS youtube_privacy_status text;

ALTER TABLE public.creator_content_items
  DROP CONSTRAINT IF EXISTS creator_content_items_status_check;

ALTER TABLE public.creator_content_items
  ADD CONSTRAINT creator_content_items_status_check
  CHECK (status = ANY (ARRAY['idea'::text, 'to_produce'::text, 'ready'::text, 'uploaded'::text, 'published'::text, 'ignored'::text]));