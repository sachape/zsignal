
ALTER TABLE public.live_debriefs
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS main_strength text,
  ADD COLUMN IF NOT EXISTS main_weakness text,
  ADD COLUMN IF NOT EXISTS next_live_focus text,
  ADD COLUMN IF NOT EXISTS confidence text,
  ADD COLUMN IF NOT EXISTS signal_quality text,
  ADD COLUMN IF NOT EXISTS evidence jsonb,
  ADD COLUMN IF NOT EXISTS generated_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'live_debriefs_confidence_check'
  ) THEN
    ALTER TABLE public.live_debriefs
      ADD CONSTRAINT live_debriefs_confidence_check
      CHECK (confidence IS NULL OR confidence IN ('low','medium','high'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'live_debriefs_signal_quality_check'
  ) THEN
    ALTER TABLE public.live_debriefs
      ADD CONSTRAINT live_debriefs_signal_quality_check
      CHECK (signal_quality IS NULL OR signal_quality IN ('low','medium','high'));
  END IF;
END $$;
