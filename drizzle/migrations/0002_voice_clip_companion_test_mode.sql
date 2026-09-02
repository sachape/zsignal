-- Companion-driven microphone test: the web page arms a short test window,
-- the Companion reports a local detection, no Twitch call is ever made.
ALTER TABLE public.voice_clip_settings
  ADD COLUMN IF NOT EXISTS test_mode_until timestamptz,
  ADD COLUMN IF NOT EXISTS last_test_detected_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_test_keyword text,
  ADD COLUMN IF NOT EXISTS companion_platform text,
  ADD COLUMN IF NOT EXISTS companion_microphone_available boolean NOT NULL DEFAULT true;