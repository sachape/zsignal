ALTER TABLE public.user_facecam_presets
  ADD COLUMN IF NOT EXISTS geometry_version INTEGER NOT NULL DEFAULT 1;

UPDATE public.user_facecam_presets
SET geometry_version = 1
WHERE geometry_version IS NULL OR geometry_version < 3;