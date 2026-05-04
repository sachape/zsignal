
-- 1. Extend raw inbox with processing status
ALTER TABLE public.twitch_eventsub_events
  ADD COLUMN IF NOT EXISTS processing_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS processing_error text,
  ADD COLUMN IF NOT EXISTS processing_attempts integer NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS twitch_eventsub_events_message_id_uidx
  ON public.twitch_eventsub_events (message_id);

CREATE INDEX IF NOT EXISTS twitch_eventsub_events_pending_idx
  ON public.twitch_eventsub_events (processing_status, received_at)
  WHERE processing_status = 'pending';

-- 2. creator_alerts
CREATE TABLE IF NOT EXISTS public.creator_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcaster_user_id text NOT NULL,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  severity text NOT NULL DEFAULT 'info',
  source_message_id text,
  source_event_type text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS creator_alerts_dedup_uidx
  ON public.creator_alerts (source_message_id, kind)
  WHERE source_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS creator_alerts_broadcaster_idx
  ON public.creator_alerts (broadcaster_user_id, created_at DESC);

ALTER TABLE public.creator_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view alerts for their connected Twitch account"
  ON public.creator_alerts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.connected_accounts ca
    WHERE ca.user_id = auth.uid()
      AND ca.platform = 'twitch'
      AND ca.platform_user_id = creator_alerts.broadcaster_user_id
  ));

CREATE POLICY "Users can update read state for their alerts"
  ON public.creator_alerts FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.connected_accounts ca
    WHERE ca.user_id = auth.uid()
      AND ca.platform = 'twitch'
      AND ca.platform_user_id = creator_alerts.broadcaster_user_id
  ));

-- 3. channel_update_history
CREATE TABLE IF NOT EXISTS public.channel_update_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcaster_user_id text NOT NULL,
  source_message_id text UNIQUE,
  title text,
  category_id text,
  category_name text,
  language text,
  content_classification_labels jsonb,
  changed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS channel_update_history_broadcaster_idx
  ON public.channel_update_history (broadcaster_user_id, changed_at DESC);

ALTER TABLE public.channel_update_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view channel update history for their account"
  ON public.channel_update_history FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.connected_accounts ca
    WHERE ca.user_id = auth.uid()
      AND ca.platform = 'twitch'
      AND ca.platform_user_id = channel_update_history.broadcaster_user_id
  ));

-- 4. community_events (follows, subs, etc.)
CREATE TABLE IF NOT EXISTS public.community_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcaster_user_id text NOT NULL,
  source_message_id text UNIQUE,
  kind text NOT NULL, -- 'follow' | 'subscribe' | ...
  occurred_at timestamptz NOT NULL DEFAULT now(),
  -- Aggregate-friendly, no PII unless necessary
  actor_hash text,
  is_gift boolean,
  tier text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS community_events_broadcaster_idx
  ON public.community_events (broadcaster_user_id, kind, occurred_at DESC);

ALTER TABLE public.community_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view community events for their account"
  ON public.community_events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.connected_accounts ca
    WHERE ca.user_id = auth.uid()
      AND ca.platform = 'twitch'
      AND ca.platform_user_id = community_events.broadcaster_user_id
  ));

-- 5. Helpful index on live_sessions for finding the active session quickly
CREATE INDEX IF NOT EXISTS live_sessions_active_idx
  ON public.live_sessions (platform_user_id, status)
  WHERE status = 'live';
