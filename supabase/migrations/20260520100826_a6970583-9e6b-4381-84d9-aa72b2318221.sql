
-- =============================================================
-- Market Index Phase A — foundation tables
-- =============================================================

-- 1) Raw periodic snapshots of live streams
CREATE TABLE public.twitch_stream_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  captured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  broadcaster_id TEXT NOT NULL,
  broadcaster_login TEXT NOT NULL,
  broadcaster_name TEXT,
  profile_image_url TEXT,
  game_id TEXT,
  game_name TEXT,
  language TEXT,
  title TEXT,
  viewer_count INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_twitch_stream_snapshots_unique
  ON public.twitch_stream_snapshots (broadcaster_id, captured_at);
CREATE INDEX idx_twitch_stream_snapshots_captured_at
  ON public.twitch_stream_snapshots (captured_at DESC);
CREATE INDEX idx_twitch_stream_snapshots_game_captured
  ON public.twitch_stream_snapshots (game_id, captured_at DESC);
CREATE INDEX idx_twitch_stream_snapshots_lang_captured
  ON public.twitch_stream_snapshots (language, captured_at DESC);
CREATE INDEX idx_twitch_stream_snapshots_broadcaster_captured
  ON public.twitch_stream_snapshots (broadcaster_id, captured_at DESC);

ALTER TABLE public.twitch_stream_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read stream snapshots"
  ON public.twitch_stream_snapshots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Deny client insert on stream snapshots"
  ON public.twitch_stream_snapshots FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "Deny client update on stream snapshots"
  ON public.twitch_stream_snapshots FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Deny client delete on stream snapshots"
  ON public.twitch_stream_snapshots FOR DELETE TO anon, authenticated USING (false);


-- 2) Rolling "last seen" state per channel
CREATE TABLE public.twitch_channel_index (
  broadcaster_id TEXT NOT NULL PRIMARY KEY,
  broadcaster_login TEXT NOT NULL,
  broadcaster_name TEXT,
  profile_image_url TEXT,
  broadcaster_type TEXT,
  first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_game_id TEXT,
  last_game_name TEXT,
  last_language TEXT,
  last_viewer_count INTEGER,
  lifetime_peak_viewers INTEGER NOT NULL DEFAULT 0,
  snapshot_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_twitch_channel_index_last_seen
  ON public.twitch_channel_index (last_seen_at DESC);
CREATE INDEX idx_twitch_channel_index_last_game
  ON public.twitch_channel_index (last_game_id);
CREATE INDEX idx_twitch_channel_index_login
  ON public.twitch_channel_index (broadcaster_login);

ALTER TABLE public.twitch_channel_index ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read channel index"
  ON public.twitch_channel_index FOR SELECT TO authenticated USING (true);
CREATE POLICY "Deny client insert on channel index"
  ON public.twitch_channel_index FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "Deny client update on channel index"
  ON public.twitch_channel_index FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Deny client delete on channel index"
  ON public.twitch_channel_index FOR DELETE TO anon, authenticated USING (false);

CREATE TRIGGER trg_twitch_channel_index_updated_at
  BEFORE UPDATE ON public.twitch_channel_index
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 3) Aggregate per (game, language) at capture time
CREATE TABLE public.twitch_game_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  captured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  game_id TEXT NOT NULL,
  game_name TEXT,
  language TEXT NOT NULL DEFAULT '',
  total_channels INTEGER NOT NULL DEFAULT 0,
  total_viewers INTEGER NOT NULL DEFAULT 0,
  median_viewers NUMERIC NOT NULL DEFAULT 0,
  top_channel_viewers INTEGER NOT NULL DEFAULT 0,
  viewer_channel_ratio NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_twitch_game_snapshots_unique
  ON public.twitch_game_snapshots (game_id, language, captured_at);
CREATE INDEX idx_twitch_game_snapshots_captured_at
  ON public.twitch_game_snapshots (captured_at DESC);
CREATE INDEX idx_twitch_game_snapshots_game
  ON public.twitch_game_snapshots (game_id, captured_at DESC);

ALTER TABLE public.twitch_game_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read game snapshots"
  ON public.twitch_game_snapshots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Deny client insert on game snapshots"
  ON public.twitch_game_snapshots FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "Deny client update on game snapshots"
  ON public.twitch_game_snapshots FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Deny client delete on game snapshots"
  ON public.twitch_game_snapshots FOR DELETE TO anon, authenticated USING (false);


-- 4) Daily aggregate per channel
CREATE TABLE public.twitch_channel_daily_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  broadcaster_id TEXT NOT NULL,
  broadcaster_login TEXT,
  dominant_game_id TEXT,
  dominant_game_name TEXT,
  dominant_language TEXT,
  avg_viewers NUMERIC NOT NULL DEFAULT 0,
  peak_viewers INTEGER NOT NULL DEFAULT 0,
  min_viewers INTEGER NOT NULL DEFAULT 0,
  hours_streamed_estimated NUMERIC NOT NULL DEFAULT 0,
  estimated_hours_watched NUMERIC NOT NULL DEFAULT 0,
  snapshots_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (date, broadcaster_id)
);

CREATE INDEX idx_twitch_channel_daily_stats_date
  ON public.twitch_channel_daily_stats (date DESC);
CREATE INDEX idx_twitch_channel_daily_stats_broadcaster
  ON public.twitch_channel_daily_stats (broadcaster_id, date DESC);
CREATE INDEX idx_twitch_channel_daily_stats_game
  ON public.twitch_channel_daily_stats (dominant_game_id, date DESC);

ALTER TABLE public.twitch_channel_daily_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read channel daily stats"
  ON public.twitch_channel_daily_stats FOR SELECT TO authenticated USING (true);
CREATE POLICY "Deny client insert on channel daily stats"
  ON public.twitch_channel_daily_stats FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "Deny client update on channel daily stats"
  ON public.twitch_channel_daily_stats FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Deny client delete on channel daily stats"
  ON public.twitch_channel_daily_stats FOR DELETE TO anon, authenticated USING (false);

CREATE TRIGGER trg_twitch_channel_daily_stats_updated_at
  BEFORE UPDATE ON public.twitch_channel_daily_stats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
