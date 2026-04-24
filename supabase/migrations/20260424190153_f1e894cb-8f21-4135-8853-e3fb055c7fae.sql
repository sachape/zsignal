
-- live_sessions: one row per detected stream session
CREATE TABLE public.live_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  connected_account_id UUID NOT NULL REFERENCES public.connected_accounts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL DEFAULT 'twitch',
  platform_user_id TEXT NOT NULL,
  platform_login TEXT,
  platform_display_name TEXT,
  twitch_stream_id TEXT,
  category_name TEXT,
  start_title TEXT,
  language TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  status TEXT NOT NULL DEFAULT 'live',
  peak_viewers INTEGER,
  avg_viewers INTEGER,
  snapshots_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_live_sessions_user_started ON public.live_sessions(user_id, started_at DESC);
CREATE INDEX idx_live_sessions_account_status ON public.live_sessions(connected_account_id, status);
CREATE UNIQUE INDEX uniq_live_sessions_stream
  ON public.live_sessions(connected_account_id, twitch_stream_id)
  WHERE twitch_stream_id IS NOT NULL;

CREATE POLICY "Users can view own live sessions"
  ON public.live_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own live sessions"
  ON public.live_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own live sessions"
  ON public.live_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own live sessions"
  ON public.live_sessions FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_live_sessions_updated_at
  BEFORE UPDATE ON public.live_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- live_snapshots: viewer_count samples during a session
CREATE TABLE public.live_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  live_session_id UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  viewer_count INTEGER NOT NULL DEFAULT 0,
  category_name TEXT,
  title TEXT,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.live_snapshots ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_live_snapshots_session_time ON public.live_snapshots(live_session_id, captured_at);

CREATE POLICY "Users can view own live snapshots"
  ON public.live_snapshots FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.live_sessions s
    WHERE s.id = live_snapshots.live_session_id AND s.user_id = auth.uid()
  ));
CREATE POLICY "Users can insert own live snapshots"
  ON public.live_snapshots FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.live_sessions s
    WHERE s.id = live_snapshots.live_session_id AND s.user_id = auth.uid()
  ));
CREATE POLICY "Users can delete own live snapshots"
  ON public.live_snapshots FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.live_sessions s
    WHERE s.id = live_snapshots.live_session_id AND s.user_id = auth.uid()
  ));

-- live_debriefs: post-live analysis (one per session)
CREATE TABLE public.live_debriefs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  live_session_id UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE UNIQUE,
  user_id UUID NOT NULL,
  overall_score INTEGER,
  score_start INTEGER,
  score_hold INTEGER,
  score_structure INTEGER,
  verdict TEXT,
  strength TEXT,
  weakness TEXT,
  priority_action TEXT,
  comparison_data JSONB DEFAULT '{}'::jsonb,
  has_enough_signal BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.live_debriefs ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_live_debriefs_user_created ON public.live_debriefs(user_id, created_at DESC);

CREATE POLICY "Users can view own live debriefs"
  ON public.live_debriefs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own live debriefs"
  ON public.live_debriefs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own live debriefs"
  ON public.live_debriefs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own live debriefs"
  ON public.live_debriefs FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_live_debriefs_updated_at
  BEFORE UPDATE ON public.live_debriefs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
