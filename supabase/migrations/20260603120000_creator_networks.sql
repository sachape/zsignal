-- ── creator_connected_accounts ────────────────────────────────────────────────
-- Stores per-user social platform connections for the "Réseaux connectés" feature.
-- Tokens are never exposed to the client; manipulation is server/edge only.

CREATE TABLE IF NOT EXISTS public.creator_connected_accounts (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform                text NOT NULL CHECK (platform IN ('twitch', 'youtube', 'tiktok', 'instagram')),
  platform_user_id        text,
  username                text,
  display_name            text,
  profile_url             text,
  avatar_url              text,
  access_token_encrypted  text,
  refresh_token_encrypted text,
  token_expires_at        timestamptz,
  connection_status       text NOT NULL DEFAULT 'disconnected'
                            CHECK (connection_status IN ('connected', 'disconnected', 'expired', 'error', 'manual')),
  last_synced_at          timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, platform)
);

ALTER TABLE public.creator_connected_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creator_connected_accounts_select"
  ON public.creator_connected_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "creator_connected_accounts_insert"
  ON public.creator_connected_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "creator_connected_accounts_update"
  ON public.creator_connected_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "creator_connected_accounts_delete"
  ON public.creator_connected_accounts FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_creator_connected_accounts_updated_at
  BEFORE UPDATE ON public.creator_connected_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ── creator_platform_metrics ───────────────────────────────────────────────────
-- Daily snapshots of platform-level metrics (followers, posts, etc.).

CREATE TABLE IF NOT EXISTS public.creator_platform_metrics (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connected_account_id  uuid REFERENCES public.creator_connected_accounts(id) ON DELETE CASCADE,
  platform              text NOT NULL CHECK (platform IN ('twitch', 'youtube', 'tiktok', 'instagram')),
  snapshot_date         date NOT NULL,
  followers_count       integer,
  subscribers_count     integer,
  videos_count          integer,
  posts_count           integer,
  views_count           integer,
  likes_count           integer,
  comments_count        integer,
  shares_count          integer,
  recent_posts_count    integer,
  recent_activity_score integer,
  raw_metrics           jsonb,
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, platform, snapshot_date)
);

ALTER TABLE public.creator_platform_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creator_platform_metrics_select"
  ON public.creator_platform_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "creator_platform_metrics_insert"
  ON public.creator_platform_metrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- ── creator_presence_scores ────────────────────────────────────────────────────
-- Daily computed Creator Presence Score per user.

CREATE TABLE IF NOT EXISTS public.creator_presence_scores (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score                   integer NOT NULL,
  twitch_score            integer,
  youtube_score           integer,
  tiktok_score            integer,
  instagram_score         integer,
  presence_score          integer,
  consistency_score       integer,
  content_recycling_score integer,
  diversification_score   integer,
  diagnosis               text,
  recommendations         jsonb,
  snapshot_date           date NOT NULL,
  created_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, snapshot_date)
);

ALTER TABLE public.creator_presence_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creator_presence_scores_select"
  ON public.creator_presence_scores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "creator_presence_scores_insert"
  ON public.creator_presence_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "creator_presence_scores_update"
  ON public.creator_presence_scores FOR UPDATE
  USING (auth.uid() = user_id);
