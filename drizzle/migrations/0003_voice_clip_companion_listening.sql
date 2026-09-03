ALTER TABLE public.voice_clip_settings
  ADD COLUMN IF NOT EXISTS companion_listening boolean NOT NULL DEFAULT false;