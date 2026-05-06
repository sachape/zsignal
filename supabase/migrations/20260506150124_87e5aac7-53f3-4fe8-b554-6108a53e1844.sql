
ALTER TABLE public.weekly_action_items
  ADD COLUMN IF NOT EXISTS action_key text,
  ADD COLUMN IF NOT EXISTS priority_score integer,
  ADD COLUMN IF NOT EXISTS confidence text,
  ADD COLUMN IF NOT EXISTS difficulty text,
  ADD COLUMN IF NOT EXISTS verification_signal text,
  ADD COLUMN IF NOT EXISTS auto_verifiable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS source_ref_id text,
  ADD COLUMN IF NOT EXISTS evidence jsonb;

ALTER TABLE public.weekly_action_items
  DROP CONSTRAINT IF EXISTS weekly_action_items_confidence_check;
ALTER TABLE public.weekly_action_items
  ADD CONSTRAINT weekly_action_items_confidence_check
  CHECK (confidence IS NULL OR confidence IN ('low','medium','high'));

ALTER TABLE public.weekly_action_items
  DROP CONSTRAINT IF EXISTS weekly_action_items_difficulty_check;
ALTER TABLE public.weekly_action_items
  ADD CONSTRAINT weekly_action_items_difficulty_check
  CHECK (difficulty IS NULL OR difficulty IN ('easy','medium','hard'));

CREATE INDEX IF NOT EXISTS weekly_action_items_user_action_key_created_idx
  ON public.weekly_action_items (user_id, action_key, created_at DESC);
