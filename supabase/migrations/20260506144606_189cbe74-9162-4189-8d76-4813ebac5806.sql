
-- 1. Extend weekly_milestones
ALTER TABLE public.weekly_milestones
  ADD COLUMN IF NOT EXISTS diagnosis text,
  ADD COLUMN IF NOT EXISTS generated_signals jsonb,
  ADD COLUMN IF NOT EXISTS generated_at timestamptz;

-- Deduplicate any existing duplicate rows (keep oldest) before adding unique
DELETE FROM public.weekly_milestones a
USING public.weekly_milestones b
WHERE a.user_id = b.user_id
  AND a.week_start = b.week_start
  AND a.created_at > b.created_at;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'weekly_milestones_user_week_unique'
  ) THEN
    ALTER TABLE public.weekly_milestones
      ADD CONSTRAINT weekly_milestones_user_week_unique UNIQUE (user_id, week_start);
  END IF;
END $$;

-- 2. Create weekly_action_items
CREATE TABLE IF NOT EXISTS public.weekly_action_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_milestone_id uuid NOT NULL REFERENCES public.weekly_milestones(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  position int NOT NULL,
  title text NOT NULL,
  description text,
  reason text,
  expected_impact text,
  category text NOT NULL CHECK (category IN (
    'consistency','positioning','content','community','monetization','discovery','setup'
  )),
  source text,
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','done','skipped')),
  completed_at timestamptz,
  skipped_at timestamptz,
  skipped_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT weekly_action_items_milestone_position_unique UNIQUE (weekly_milestone_id, position)
);

CREATE INDEX IF NOT EXISTS weekly_action_items_user_idx ON public.weekly_action_items(user_id);
CREATE INDEX IF NOT EXISTS weekly_action_items_milestone_idx ON public.weekly_action_items(weekly_milestone_id);
CREATE INDEX IF NOT EXISTS weekly_action_items_status_idx ON public.weekly_action_items(status);

-- 3. RLS
ALTER TABLE public.weekly_action_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own weekly action items"
  ON public.weekly_action_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weekly action items"
  ON public.weekly_action_items FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.weekly_milestones m
      WHERE m.id = weekly_milestone_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own weekly action items"
  ON public.weekly_action_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own weekly action items"
  ON public.weekly_action_items FOR DELETE
  USING (auth.uid() = user_id);

-- updated_at trigger
CREATE TRIGGER update_weekly_action_items_updated_at
  BEFORE UPDATE ON public.weekly_action_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
