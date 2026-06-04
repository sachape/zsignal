ALTER TABLE public.creator_content_items
  ADD COLUMN IF NOT EXISTS generated_video_storage_bucket text,
  ADD COLUMN IF NOT EXISTS generated_video_storage_path text;