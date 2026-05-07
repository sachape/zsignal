
CREATE TABLE public.twitch_clip_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  broadcaster_id text NOT NULL,
  twitch_clip_id text NOT NULL,
  creator_id text,
  video_id text,
  game_id text,
  title text,
  view_count integer DEFAULT 0,
  clip_created_at timestamptz NOT NULL,
  duration numeric,
  vod_offset integer,
  is_featured boolean,
  thumbnail_url text,
  url text,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT twitch_clip_snapshots_clip_unique UNIQUE (twitch_clip_id)
);

CREATE INDEX idx_clip_snapshots_user_broadcaster
  ON public.twitch_clip_snapshots (user_id, broadcaster_id, clip_created_at DESC);

CREATE INDEX idx_clip_snapshots_broadcaster_created
  ON public.twitch_clip_snapshots (broadcaster_id, clip_created_at DESC);

ALTER TABLE public.twitch_clip_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own clip snapshots"
  ON public.twitch_clip_snapshots
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_twitch_clip_snapshots_updated_at
  BEFORE UPDATE ON public.twitch_clip_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
