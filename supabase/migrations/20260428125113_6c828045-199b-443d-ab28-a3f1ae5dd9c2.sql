-- Weekly milestones — one row per user per ISO week.
-- Stable cap for the 7-day window. Only the status is mutable.

CREATE TABLE public.weekly_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  rationale TEXT NOT NULL,
  target_count INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'not_started',
  reached_at TIMESTAMP WITH TIME ZONE,
  source_session_id UUID,
  source_debrief_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);

CREATE INDEX idx_weekly_milestones_user_week
  ON public.weekly_milestones (user_id, week_start DESC);

ALTER TABLE public.weekly_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own weekly milestones"
  ON public.weekly_milestones FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weekly milestones"
  ON public.weekly_milestones FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weekly milestones"
  ON public.weekly_milestones FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own weekly milestones"
  ON public.weekly_milestones FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_weekly_milestones_updated_at
  BEFORE UPDATE ON public.weekly_milestones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
