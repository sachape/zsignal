
CREATE UNIQUE INDEX IF NOT EXISTS uniq_creator_content_items_vod_dedup
ON public.creator_content_items (user_id, source_video_url, source_start_time, source_end_time, platform, format)
WHERE source_video_url IS NOT NULL
  AND status NOT IN ('ignored', 'published');
