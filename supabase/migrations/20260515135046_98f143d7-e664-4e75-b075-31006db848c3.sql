-- Tracks per-snapshot StreamScore movement emails for cooldown and idempotency
CREATE TABLE IF NOT EXISTS public.streamscore_email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_id uuid NOT NULL,
  email_key text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT streamscore_email_events_unique UNIQUE (user_id, snapshot_id, email_key)
);

CREATE INDEX IF NOT EXISTS idx_streamscore_email_events_user_sent_at
  ON public.streamscore_email_events (user_id, sent_at DESC);

ALTER TABLE public.streamscore_email_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own streamscore email events"
  ON public.streamscore_email_events
  FOR SELECT
  USING (auth.uid() = user_id);
-- No INSERT/UPDATE/DELETE policies: writes are server-side only via service role.