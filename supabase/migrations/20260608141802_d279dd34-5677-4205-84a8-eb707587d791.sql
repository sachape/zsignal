
-- ============================================================
-- 1. creator_video_layout_presets
-- ============================================================
CREATE TABLE public.creator_video_layout_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  platform text NOT NULL DEFAULT 'twitch',
  platform_user_id text NOT NULL,
  layout_type text NOT NULL DEFAULT 'facecam_top_gameplay_bottom',
  facecam_x integer,
  facecam_y integer,
  facecam_width integer,
  facecam_height integer,
  gameplay_x integer,
  gameplay_y integer,
  gameplay_width integer,
  gameplay_height integer,
  source_reference_width integer,
  source_reference_height integer,
  output_width integer NOT NULL DEFAULT 1080,
  output_height integer NOT NULL DEFAULT 1920,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, platform, platform_user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.creator_video_layout_presets TO authenticated;
GRANT ALL ON public.creator_video_layout_presets TO service_role;

ALTER TABLE public.creator_video_layout_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own layout presets"
  ON public.creator_video_layout_presets
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_layout_presets_updated_at
  BEFORE UPDATE ON public.creator_video_layout_presets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 2. creator_video_sources
-- ============================================================
CREATE TABLE public.creator_video_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('streamnco_detected', 'twitch_vod_url', 'manual_upload')),
  source_url text,
  storage_bucket text,
  storage_path text,
  original_filename text,
  mime_type text,
  duration_seconds numeric,
  width integer,
  height integer,
  platform text,
  platform_video_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_creator_video_sources_user ON public.creator_video_sources(user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.creator_video_sources TO authenticated;
GRANT ALL ON public.creator_video_sources TO service_role;

ALTER TABLE public.creator_video_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own video sources"
  ON public.creator_video_sources
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_video_sources_updated_at
  BEFORE UPDATE ON public.creator_video_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 3. creator_content_items — colonnes supplémentaires
-- ============================================================
ALTER TABLE public.creator_content_items
  ADD COLUMN IF NOT EXISTS video_source_id uuid REFERENCES public.creator_video_sources(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS output_format text DEFAULT 'vertical_9_16',
  ADD COLUMN IF NOT EXISTS layout_type text;

-- ============================================================
-- 4. creator_video_generation_jobs — colonnes supplémentaires
-- ============================================================
ALTER TABLE public.creator_video_generation_jobs
  ADD COLUMN IF NOT EXISTS output_width integer,
  ADD COLUMN IF NOT EXISTS output_height integer,
  ADD COLUMN IF NOT EXISTS layout_type text,
  ADD COLUMN IF NOT EXISTS layout_preset_id uuid REFERENCES public.creator_video_layout_presets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS video_source_id uuid REFERENCES public.creator_video_sources(id) ON DELETE SET NULL;
