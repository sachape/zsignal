ALTER TABLE public.creator_live_sessions DROP CONSTRAINT IF EXISTS creator_live_sessions_status_check;
ALTER TABLE public.creator_live_sessions ADD CONSTRAINT creator_live_sessions_status_check
  CHECK (status IN ('draft','ready','pushed','ready_to_go','completed'));