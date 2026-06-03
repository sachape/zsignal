CREATE TABLE public.creator_content_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  live_session_id uuid NULL,
  platform text NOT NULL,
  title text NOT NULL DEFAULT '',
  description text NULL,
  hashtags jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'idea',
  priority text NOT NULL DEFAULT 'medium',
  recommended_publish_at timestamp with time zone NULL,
  published_at timestamp with time zone NULL,
  notes text NULL,
  source_idea_id text NULL,
  format text NULL,
  duration text NULL,
  reason text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT creator_content_items_platform_check CHECK (platform IN ('youtube_shorts','tiktok','instagram','community','twitch_clip')),
  CONSTRAINT creator_content_items_status_check CHECK (status IN ('idea','to_produce','ready','published','ignored')),
  CONSTRAINT creator_content_items_priority_check CHECK (priority IN ('low','medium','high'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.creator_content_items TO authenticated;
GRANT ALL ON public.creator_content_items TO service_role;

ALTER TABLE public.creator_content_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own content items"
  ON public.creator_content_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own content items"
  ON public.creator_content_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own content items"
  ON public.creator_content_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own content items"
  ON public.creator_content_items FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_content_items_user_status ON public.creator_content_items (user_id, status);
CREATE INDEX idx_content_items_user_platform ON public.creator_content_items (user_id, platform);
CREATE INDEX idx_content_items_live_session ON public.creator_content_items (live_session_id);

CREATE TRIGGER update_creator_content_items_updated_at
  BEFORE UPDATE ON public.creator_content_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();