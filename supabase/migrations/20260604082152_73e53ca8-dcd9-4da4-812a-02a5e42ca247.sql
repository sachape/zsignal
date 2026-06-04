
-- Social posts table (V1: Instagram only, but platform is text for future extension)
CREATE TABLE public.creator_social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL DEFAULT 'instagram',
  format text NOT NULL CHECK (format IN ('post', 'reel', 'story')),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'failed')),
  caption text,
  hashtags text[] NOT NULL DEFAULT '{}',
  media_storage_path text,
  media_url text,
  media_mime_type text,
  external_platform_id text,
  published_url text,
  scheduled_at timestamptz,
  published_at timestamptz,
  error_code text,
  error_message text,
  source_content_item_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX creator_social_posts_user_id_idx ON public.creator_social_posts (user_id, created_at DESC);
CREATE INDEX creator_social_posts_status_idx ON public.creator_social_posts (user_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.creator_social_posts TO authenticated;
GRANT ALL ON public.creator_social_posts TO service_role;

ALTER TABLE public.creator_social_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own social posts"
  ON public.creator_social_posts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own social posts"
  ON public.creator_social_posts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own social posts"
  ON public.creator_social_posts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own social posts"
  ON public.creator_social_posts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER update_creator_social_posts_updated_at
  BEFORE UPDATE ON public.creator_social_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
