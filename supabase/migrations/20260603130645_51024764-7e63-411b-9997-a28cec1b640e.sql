CREATE TABLE public.creator_live_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title_raw text NOT NULL DEFAULT '',
  game_category text,
  objective text,
  tone text,
  language text DEFAULT 'fr',
  target_audience text,
  platforms jsonb NOT NULL DEFAULT '[]'::jsonb,
  generated_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  scheduled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT creator_live_sessions_status_check CHECK (status IN ('draft','ready','pushed','completed'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.creator_live_sessions TO authenticated;
GRANT ALL ON public.creator_live_sessions TO service_role;

ALTER TABLE public.creator_live_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own live sessions"
  ON public.creator_live_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own live sessions"
  ON public.creator_live_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own live sessions"
  ON public.creator_live_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own live sessions"
  ON public.creator_live_sessions FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_creator_live_sessions_user_updated ON public.creator_live_sessions(user_id, updated_at DESC);

CREATE TRIGGER trg_creator_live_sessions_updated_at
  BEFORE UPDATE ON public.creator_live_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();