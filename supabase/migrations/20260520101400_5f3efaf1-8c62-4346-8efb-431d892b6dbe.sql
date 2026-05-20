
CREATE TABLE public.twitch_market_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_type TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  finished_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'running',
  helix_calls INTEGER NOT NULL DEFAULT 0,
  snapshots_written INTEGER NOT NULL DEFAULT 0,
  channels_upserted INTEGER NOT NULL DEFAULT 0,
  game_snapshots_written INTEGER NOT NULL DEFAULT 0,
  daily_stats_upserted INTEGER NOT NULL DEFAULT 0,
  rate_limited_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_twitch_market_runs_started_at
  ON public.twitch_market_runs (started_at DESC);
CREATE INDEX idx_twitch_market_runs_type_started
  ON public.twitch_market_runs (run_type, started_at DESC);

ALTER TABLE public.twitch_market_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read market runs"
  ON public.twitch_market_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Deny client insert on market runs"
  ON public.twitch_market_runs FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "Deny client update on market runs"
  ON public.twitch_market_runs FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Deny client delete on market runs"
  ON public.twitch_market_runs FOR DELETE TO anon, authenticated USING (false);
