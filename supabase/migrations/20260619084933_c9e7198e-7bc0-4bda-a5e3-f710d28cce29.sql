ALTER TABLE public.creator_content_items
ADD COLUMN IF NOT EXISTS source_channel_login text;

CREATE INDEX IF NOT EXISTS idx_creator_content_items_source_channel_login
ON public.creator_content_items(user_id, source_channel_login)
WHERE source_channel_login IS NOT NULL;