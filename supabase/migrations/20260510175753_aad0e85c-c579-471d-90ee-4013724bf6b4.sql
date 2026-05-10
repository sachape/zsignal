-- Persist weekly quest checks in the database
CREATE TABLE public.user_quest_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_key text NOT NULL,
  quest_id text NOT NULL,
  checked_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_quest_checks_unique UNIQUE (user_id, week_key, quest_id)
);

CREATE INDEX idx_user_quest_checks_user_week
  ON public.user_quest_checks (user_id, week_key);

ALTER TABLE public.user_quest_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quest checks"
  ON public.user_quest_checks
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quest checks"
  ON public.user_quest_checks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own quest checks"
  ON public.user_quest_checks
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own quest checks"
  ON public.user_quest_checks
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);