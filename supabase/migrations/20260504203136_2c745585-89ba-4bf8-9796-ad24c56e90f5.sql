
CREATE TABLE public.twitch_eventsub_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id TEXT NOT NULL UNIQUE,
  message_type TEXT NOT NULL,
  subscription_type TEXT,
  subscription_version TEXT,
  broadcaster_user_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_eventsub_events_broadcaster ON public.twitch_eventsub_events(broadcaster_user_id);
CREATE INDEX idx_eventsub_events_type ON public.twitch_eventsub_events(subscription_type);
CREATE INDEX idx_eventsub_events_received_at ON public.twitch_eventsub_events(received_at DESC);

ALTER TABLE public.twitch_eventsub_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view events for their connected Twitch account"
ON public.twitch_eventsub_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.connected_accounts ca
    WHERE ca.user_id = auth.uid()
      AND ca.platform = 'twitch'
      AND ca.platform_user_id = twitch_eventsub_events.broadcaster_user_id
  )
);

CREATE TABLE public.twitch_eventsub_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  twitch_subscription_id TEXT UNIQUE,
  type TEXT NOT NULL,
  version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  condition JSONB NOT NULL DEFAULT '{}'::jsonb,
  transport JSONB NOT NULL DEFAULT '{}'::jsonb,
  callback_url TEXT,
  broadcaster_user_id TEXT NOT NULL,
  cost INTEGER DEFAULT 0,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_eventsub_subs_broadcaster ON public.twitch_eventsub_subscriptions(broadcaster_user_id);
CREATE INDEX idx_eventsub_subs_status ON public.twitch_eventsub_subscriptions(status);
CREATE UNIQUE INDEX idx_eventsub_subs_unique ON public.twitch_eventsub_subscriptions(broadcaster_user_id, type, version);

ALTER TABLE public.twitch_eventsub_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view subscriptions for their connected Twitch account"
ON public.twitch_eventsub_subscriptions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.connected_accounts ca
    WHERE ca.user_id = auth.uid()
      AND ca.platform = 'twitch'
      AND ca.platform_user_id = twitch_eventsub_subscriptions.broadcaster_user_id
  )
);

CREATE TRIGGER trg_eventsub_subs_updated
BEFORE UPDATE ON public.twitch_eventsub_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.twitch_eventsub_processing_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  level TEXT NOT NULL DEFAULT 'info',
  event TEXT NOT NULL,
  message TEXT,
  context JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_eventsub_logs_created_at ON public.twitch_eventsub_processing_logs(created_at DESC);
CREATE INDEX idx_eventsub_logs_event ON public.twitch_eventsub_processing_logs(event);

ALTER TABLE public.twitch_eventsub_processing_logs ENABLE ROW LEVEL SECURITY;
-- No public read policy: logs are service-role only.
