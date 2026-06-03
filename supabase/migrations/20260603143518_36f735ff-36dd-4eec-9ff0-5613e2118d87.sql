
ALTER TABLE public.creator_content_items
  ADD COLUMN IF NOT EXISTS title_variants jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS selected_title_variant text,
  ADD COLUMN IF NOT EXISTS description_variants jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS selected_description_variant text,
  ADD COLUMN IF NOT EXISTS hashtag_variants jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS selected_hashtags jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS opportunity_score integer,
  ADD COLUMN IF NOT EXISTS opportunity_label text,
  ADD COLUMN IF NOT EXISTS opportunity_reason text,
  ADD COLUMN IF NOT EXISTS published_url text,
  ADD COLUMN IF NOT EXISTS published_platform text,
  ADD COLUMN IF NOT EXISTS external_platform_id text,
  ADD COLUMN IF NOT EXISTS last_metrics_sync_at timestamptz,
  ADD COLUMN IF NOT EXISTS post_publish_metrics jsonb;
