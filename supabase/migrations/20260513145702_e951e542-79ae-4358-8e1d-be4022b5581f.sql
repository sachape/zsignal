
-- watchlist_entries
CREATE TABLE public.watchlist_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  platform text NOT NULL DEFAULT 'twitch',
  platform_user_id text NOT NULL DEFAULT '',
  login text NOT NULL,
  display_name text,
  profile_image_url text,
  game_id text,
  game_name text,
  broadcaster_type text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, platform, login)
);
CREATE INDEX idx_watchlist_user_created ON public.watchlist_entries(user_id, created_at DESC);
ALTER TABLE public.watchlist_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wl_select_own" ON public.watchlist_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "wl_insert_own" ON public.watchlist_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "wl_update_own" ON public.watchlist_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "wl_delete_own" ON public.watchlist_entries FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_wl_updated BEFORE UPDATE ON public.watchlist_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- competitor_snapshots
CREATE TABLE public.competitor_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  platform text NOT NULL DEFAULT 'twitch',
  login text NOT NULL,
  platform_user_id text,
  game_id text,
  game_name text,
  viewer_count integer,
  stream_score integer,
  clips_30d integer,
  streams_30d integer,
  is_live boolean NOT NULL DEFAULT false,
  captured_on date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  captured_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, platform, login, captured_on)
);
CREATE INDEX idx_csnap_user_login_at ON public.competitor_snapshots(user_id, login, captured_at DESC);
ALTER TABLE public.competitor_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "csnap_select_own" ON public.competitor_snapshots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "csnap_insert_own" ON public.competitor_snapshots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "csnap_delete_own" ON public.competitor_snapshots FOR DELETE USING (auth.uid() = user_id);

-- user_preferences
CREATE TABLE public.user_preferences (
  user_id uuid PRIMARY KEY,
  preferred_niche text,
  preferred_language text DEFAULT 'fr',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "uprefs_select_own" ON public.user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "uprefs_insert_own" ON public.user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "uprefs_update_own" ON public.user_preferences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "uprefs_delete_own" ON public.user_preferences FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_uprefs_updated BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- user_badge_state
CREATE TABLE public.user_badge_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_key text NOT NULL,
  badge_type text NOT NULL DEFAULT 'badge' CHECK (badge_type IN ('badge','tier')),
  seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_key, badge_type)
);
CREATE INDEX idx_ubs_user ON public.user_badge_state(user_id, seen_at DESC);
ALTER TABLE public.user_badge_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ubs_select_own" ON public.user_badge_state FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ubs_insert_own" ON public.user_badge_state FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ubs_delete_own" ON public.user_badge_state FOR DELETE USING (auth.uid() = user_id);

-- user_checklist_progress
CREATE TABLE public.user_checklist_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  checklist_key text NOT NULL,
  item_key text NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, checklist_key, item_key)
);
CREATE INDEX idx_ucp_user_checklist ON public.user_checklist_progress(user_id, checklist_key);
ALTER TABLE public.user_checklist_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ucp_select_own" ON public.user_checklist_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ucp_insert_own" ON public.user_checklist_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ucp_delete_own" ON public.user_checklist_progress FOR DELETE USING (auth.uid() = user_id);
