-- Weekly action outcomes (MVP) — one row per (action item, signal_kind).
CREATE TABLE public.weekly_action_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_action_item_id uuid NOT NULL REFERENCES public.weekly_action_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action_key text NOT NULL,
  evaluated_at timestamptz NOT NULL DEFAULT now(),
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  outcome_status text NOT NULL CHECK (outcome_status IN ('improved','flat','worse','inconclusive','too_early')),
  signal_kind text NOT NULL CHECK (signal_kind IN ('live_sessions','twitch_clips','channel_update_stability')),
  dimension text CHECK (dimension IS NULL OR dimension IN ('regularity','content','positioning')),
  before_value numeric,
  after_value numeric,
  delta numeric,
  confidence text NOT NULL CHECK (confidence IN ('low','medium','high')),
  note text,
  evidence jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (weekly_action_item_id, signal_kind)
);

CREATE INDEX idx_weekly_action_outcomes_user_evaluated
  ON public.weekly_action_outcomes (user_id, evaluated_at DESC);
CREATE INDEX idx_weekly_action_outcomes_item
  ON public.weekly_action_outcomes (weekly_action_item_id);

ALTER TABLE public.weekly_action_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own weekly action outcomes"
  ON public.weekly_action_outcomes
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_weekly_action_outcomes_updated_at
  BEFORE UPDATE ON public.weekly_action_outcomes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();