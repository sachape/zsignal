
ALTER TABLE public.channel_stream_scores
  ADD COLUMN IF NOT EXISTS last_seen_live_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS last_seen_in_category_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS discovery_source text NULL;

CREATE INDEX IF NOT EXISTS idx_channel_stream_scores_game_lang_score
  ON public.channel_stream_scores (game_id, language, stream_score DESC);
