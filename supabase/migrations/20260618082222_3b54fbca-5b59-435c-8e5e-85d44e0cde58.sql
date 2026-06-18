CREATE TABLE public.user_facecam_presets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  twitch_channel_login TEXT NOT NULL,
  twitch_channel_id TEXT,
  crop_x NUMERIC NOT NULL,
  crop_y NUMERIC NOT NULL,
  crop_width NUMERIC NOT NULL,
  crop_height NUMERIC NOT NULL,
  source_width INTEGER,
  source_height INTEGER,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  CONSTRAINT user_facecam_presets_user_channel_unique UNIQUE (user_id, twitch_channel_login),
  CONSTRAINT user_facecam_presets_crop_bounds CHECK (
    crop_x >= 0 AND crop_y >= 0
    AND crop_width > 0 AND crop_height > 0
    AND crop_x + crop_width <= 1
    AND crop_y + crop_height <= 1
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_facecam_presets TO authenticated;
GRANT ALL ON public.user_facecam_presets TO service_role;

ALTER TABLE public.user_facecam_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own facecam presets"
  ON public.user_facecam_presets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own facecam presets"
  ON public.user_facecam_presets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own facecam presets"
  ON public.user_facecam_presets FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own facecam presets"
  ON public.user_facecam_presets FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_user_facecam_presets_updated_at
  BEFORE UPDATE ON public.user_facecam_presets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX user_facecam_presets_user_id_idx ON public.user_facecam_presets(user_id);