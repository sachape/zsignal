-- Voice Clip QA hardening: latency instrumentation, queue dedupe, stuck-event recovery.

ALTER TABLE public.voice_clip_events
  ADD COLUMN IF NOT EXISTS companion_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS received_at timestamptz,
  ADD COLUMN IF NOT EXISTS twitch_request_at timestamptz,
  ADD COLUMN IF NOT EXISTS twitch_response_at timestamptz,
  ADD COLUMN IF NOT EXISTS clip_ready_at timestamptz,
  ADD COLUMN IF NOT EXISTS content_queued_at timestamptz,
  ADD COLUMN IF NOT EXISTS clip_fetch_attempts integer NOT NULL DEFAULT 0;

-- One Twitch clip => at most one Content Queue item for voice-created clips.
CREATE UNIQUE INDEX IF NOT EXISTS creator_content_items_voice_source_unique
  ON public.creator_content_items (user_id, source_video_url)
  WHERE creation_method = 'voice' AND source_video_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_voice_clip_events_status_updated
  ON public.voice_clip_events (status, updated_at DESC);

-- Recovery for events stuck in a non-terminal state (companion crash, function timeout).
CREATE OR REPLACE FUNCTION public.fail_stale_voice_clip_events(p_timeout_minutes integer DEFAULT 10)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  WITH updated AS (
    UPDATE public.voice_clip_events
    SET status = 'failed',
        error_code = COALESCE(error_code, 'UNKNOWN_ERROR'),
        updated_at = now()
    WHERE status IN ('detected', 'creating', 'processing')
      AND updated_at < now() - make_interval(mins => GREATEST(1, p_timeout_minutes))
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM updated;
  RETURN v_count;
END;
$$;