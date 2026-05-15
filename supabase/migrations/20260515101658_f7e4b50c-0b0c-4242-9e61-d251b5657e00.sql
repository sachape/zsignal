CREATE TABLE IF NOT EXISTS public.user_email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_key text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, email_key)
);

CREATE INDEX IF NOT EXISTS idx_user_email_events_user_key
  ON public.user_email_events (user_id, email_key);

ALTER TABLE public.user_email_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own email events"
  ON public.user_email_events FOR SELECT
  USING (auth.uid() = user_id);
