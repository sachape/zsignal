-- Public indexed leaderboard table for cross-user StreamScore ranking by category.
-- Writes are server-side only (service role / SECURITY DEFINER trigger).
-- Reads are public so the Classements / StreamScore tab works for visitors.

CREATE TABLE public.channel_stream_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL DEFAULT 'twitch',
  platform_user_id text NOT NULL,
  login text NOT NULL,
  display_name text NOT NULL,
  profile_image_url text,
  broadcaster_type text,
  game_id text,
  game_name text NOT NULL,
  language text,
  stream_score integer NOT NULL CHECK (stream_score >= 0 AND stream_score <= 100),
  confidence text CHECK (confidence IN ('low','medium','high')),
  signal_quality text CHECK (signal_quality IN ('low','medium','high')),
  is_live boolean NOT NULL DEFAULT false,
  live_viewer_count integer,
  score_updated_at timestamptz NOT NULL DEFAULT now(),
  live_updated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique per (platform, platform_user_id, game_name, language). NULL language
-- treated as '' so duplicate inserts are still blocked.
CREATE UNIQUE INDEX channel_stream_scores_unique
  ON public.channel_stream_scores (platform, platform_user_id, game_name, COALESCE(language, ''));

CREATE INDEX channel_stream_scores_rank_idx
  ON public.channel_stream_scores (game_name, language, stream_score DESC);
CREATE INDEX channel_stream_scores_channel_idx
  ON public.channel_stream_scores (platform, platform_user_id);
CREATE INDEX channel_stream_scores_live_idx
  ON public.channel_stream_scores (is_live);
CREATE INDEX channel_stream_scores_score_updated_idx
  ON public.channel_stream_scores (score_updated_at DESC);
CREATE INDEX channel_stream_scores_updated_idx
  ON public.channel_stream_scores (updated_at DESC);

ALTER TABLE public.channel_stream_scores ENABLE ROW LEVEL SECURITY;

-- Public read for cross-user leaderboards. No INSERT/UPDATE/DELETE policies =>
-- anon/authenticated cannot mutate. Only service_role / SECURITY DEFINER trigger
-- can write.
CREATE POLICY "Anyone can read channel stream scores"
  ON public.channel_stream_scores
  FOR SELECT
  USING (true);

CREATE TRIGGER channel_stream_scores_set_updated_at
  BEFORE UPDATE ON public.channel_stream_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Extend the existing analysis_reports trigger so each new real StreamScore
-- also lands in the public leaderboard (non-fatal if mapping is incomplete).
-- We DO NOT store user_id, analysis_job_id, raw report payload, or tokens.
CREATE OR REPLACE FUNCTION public.upsert_channel_stream_score_from_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s jsonb;
  ident jsonb;
  summary jsonb;
  v_platform text;
  v_pid text;
  v_login text;
  v_display text;
  v_avatar text;
  v_broadcaster text;
  v_game text;
  v_language text;
  v_overall int;
  v_conf numeric;
  v_fresh numeric;
BEGIN
  s := NEW.report_data -> 'score';
  ident := NEW.report_data -> 'identity';
  summary := NEW.report_data -> 'channel_summary';

  IF s IS NULL OR ident IS NULL OR summary IS NULL THEN
    RETURN NEW;
  END IF;

  v_platform := COALESCE(ident->>'platform', 'twitch');
  v_pid := ident->>'platform_user_id';
  v_login := COALESCE(ident->>'platform_login', summary->>'channel_name');
  v_display := COALESCE(ident->>'display_name', summary->>'display_name', v_login);
  v_avatar := ident->>'avatar_url';
  v_broadcaster := NULLIF(summary->>'broadcaster_type', '');
  v_game := NULLIF(summary->>'category', '');
  v_language := NULLIF(summary->>'language', '');
  v_overall := COALESCE((s->>'overall')::int, 0);

  -- Skip demo / incomplete / unscored channels.
  IF v_pid IS NULL OR v_login IS NULL OR v_game IS NULL THEN
    RETURN NEW;
  END IF;
  IF COALESCE((ident->>'is_demo')::boolean, false) THEN
    RETURN NEW;
  END IF;
  IF v_overall <= 0 THEN
    RETURN NEW;
  END IF;

  v_conf := COALESCE((s->>'confidence')::numeric, 0);
  v_fresh := COALESCE((s->>'freshness')::numeric, 0);
  IF v_conf <= 1 THEN v_conf := v_conf * 100; END IF;
  IF v_fresh <= 1 THEN v_fresh := v_fresh * 100; END IF;

  INSERT INTO public.channel_stream_scores (
    platform, platform_user_id, login, display_name, profile_image_url,
    broadcaster_type, game_name, language, stream_score,
    confidence, signal_quality, score_updated_at, updated_at
  ) VALUES (
    v_platform, v_pid, v_login, v_display, v_avatar,
    v_broadcaster, v_game, v_language,
    LEAST(100, GREATEST(0, v_overall)),
    public.score_level_from_pct(v_conf),
    public.score_level_from_pct(ROUND(v_conf * 0.6 + v_fresh * 0.4)),
    now(), now()
  )
  ON CONFLICT (platform, platform_user_id, game_name, COALESCE(language, ''))
  DO UPDATE SET
    login = EXCLUDED.login,
    display_name = EXCLUDED.display_name,
    profile_image_url = EXCLUDED.profile_image_url,
    broadcaster_type = EXCLUDED.broadcaster_type,
    stream_score = EXCLUDED.stream_score,
    confidence = EXCLUDED.confidence,
    signal_quality = EXCLUDED.signal_quality,
    score_updated_at = now(),
    updated_at = now();

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never break analysis persistence because of leaderboard side-effect.
  RETURN NEW;
END;
$$;

CREATE TRIGGER analysis_reports_upsert_channel_stream_score
  AFTER INSERT ON public.analysis_reports
  FOR EACH ROW EXECUTE FUNCTION public.upsert_channel_stream_score_from_report();