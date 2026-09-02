-- Voice Clip: settings, commands, events + content queue provenance.

CREATE TABLE public.voice_clip_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT false,
  keyword text NOT NULL DEFAULT 'clip',
  confidence_threshold numeric NOT NULL DEFAULT 0.75,
  notifications_enabled boolean NOT NULL DEFAULT true,
  sound_feedback_enabled boolean NOT NULL DEFAULT false,
  cooldown_seconds integer NOT NULL DEFAULT 5,
  target_duration_seconds integer NOT NULL DEFAULT 60,
  microphone_label text,
  companion_token uuid NOT NULL DEFAULT gen_random_uuid(),
  companion_last_seen_at timestamptz,
  companion_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.voice_clip_settings TO authenticated;
GRANT ALL ON public.voice_clip_settings TO service_role;
ALTER TABLE public.voice_clip_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "voice_clip_settings_select_own" ON public.voice_clip_settings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "voice_clip_settings_insert_own" ON public.voice_clip_settings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "voice_clip_settings_update_own" ON public.voice_clip_settings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "voice_clip_settings_delete_own" ON public.voice_clip_settings
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_voice_clip_settings_updated_at
  BEFORE UPDATE ON public.voice_clip_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Multi-command ready (MVP exposes a single 'create_clip' command).
CREATE TABLE public.voice_clip_commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  keyword text NOT NULL,
  action_type text NOT NULL DEFAULT 'create_clip',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, keyword)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.voice_clip_commands TO authenticated;
GRANT ALL ON public.voice_clip_commands TO service_role;
ALTER TABLE public.voice_clip_commands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "voice_clip_commands_select_own" ON public.voice_clip_commands
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "voice_clip_commands_insert_own" ON public.voice_clip_commands
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "voice_clip_commands_update_own" ON public.voice_clip_commands
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "voice_clip_commands_delete_own" ON public.voice_clip_commands
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_voice_clip_commands_updated_at
  BEFORE UPDATE ON public.voice_clip_commands
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.voice_clip_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  voice_event_id uuid NOT NULL UNIQUE,
  live_session_id uuid,
  stream_id text,
  keyword text NOT NULL,
  action_type text NOT NULL DEFAULT 'create_clip',
  confidence numeric,
  detected_at timestamptz NOT NULL DEFAULT now(),
  twitch_clip_id text,
  clip_url text,
  content_item_id uuid,
  status text NOT NULL DEFAULT 'detected',
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_voice_clip_events_user_detected ON public.voice_clip_events (user_id, detected_at DESC);

GRANT SELECT, DELETE ON public.voice_clip_events TO authenticated;
GRANT ALL ON public.voice_clip_events TO service_role;
ALTER TABLE public.voice_clip_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "voice_clip_events_select_own" ON public.voice_clip_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "voice_clip_events_delete_own" ON public.voice_clip_events
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_voice_clip_events_updated_at
  BEFORE UPDATE ON public.voice_clip_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Provenance of a content queue item (manual, voice, auto…).
ALTER TABLE public.creator_content_items
  ADD COLUMN IF NOT EXISTS creation_method text NOT NULL DEFAULT 'manual';
