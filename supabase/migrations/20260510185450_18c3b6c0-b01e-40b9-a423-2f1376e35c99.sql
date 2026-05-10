-- Replace functional unique index on channel_stream_scores with a plain unique
-- constraint so PostgREST upserts (ON CONFLICT) can target it. Force language
-- to NOT NULL with empty string default to keep the same logical key.

ALTER TABLE public.channel_stream_scores
  ALTER COLUMN language SET DEFAULT '';

UPDATE public.channel_stream_scores SET language = '' WHERE language IS NULL;

ALTER TABLE public.channel_stream_scores
  ALTER COLUMN language SET NOT NULL;

DROP INDEX IF EXISTS public.channel_stream_scores_unique;

ALTER TABLE public.channel_stream_scores
  ADD CONSTRAINT channel_stream_scores_unique
  UNIQUE (platform, platform_user_id, game_name, language);