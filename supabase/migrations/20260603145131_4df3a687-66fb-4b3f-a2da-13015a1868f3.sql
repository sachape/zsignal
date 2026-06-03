-- V3D: Video generation jobs table
CREATE TABLE public.creator_video_generation_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  content_item_id uuid NOT NULL REFERENCES public.creator_content_items(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('upload','storage_url','direct_url')),
  source_url text,
  source_storage_path text,
  start_time_seconds integer NOT NULL,
  end_time_seconds integer NOT NULL,
  duration_seconds integer NOT NULL,
  output_format text NOT NULL DEFAULT 'mp4_16_9',
  output_storage_path text,
  output_url text,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','completed','failed','cancelled')),
  error_code text,
  error_message text,
  progress integer,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT duration_range CHECK (duration_seconds BETWEEN 5 AND 180),
  CONSTRAINT end_after_start CHECK (end_time_seconds > start_time_seconds),
  CONSTRAINT progress_range CHECK (progress IS NULL OR (progress BETWEEN 0 AND 100))
);

GRANT SELECT, INSERT, UPDATE ON public.creator_video_generation_jobs TO authenticated;
GRANT ALL ON public.creator_video_generation_jobs TO service_role;

ALTER TABLE public.creator_video_generation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own video jobs"
  ON public.creator_video_generation_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own video jobs"
  ON public.creator_video_generation_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own video jobs"
  ON public.creator_video_generation_jobs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX idx_video_jobs_status_created ON public.creator_video_generation_jobs (status, created_at);
CREATE INDEX idx_video_jobs_content_item ON public.creator_video_generation_jobs (content_item_id);
CREATE INDEX idx_video_jobs_user ON public.creator_video_generation_jobs (user_id);

CREATE TRIGGER trg_video_jobs_updated_at
  BEFORE UPDATE ON public.creator_video_generation_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage RLS for buckets (buckets created via storage tool)
-- creator-source-videos: users can read/write only their own folder
CREATE POLICY "Users can read own source videos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'creator-source-videos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can upload own source videos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'creator-source-videos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own source videos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'creator-source-videos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read own generated clips"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'creator-generated-clips' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own generated clips"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'creator-generated-clips' AND (storage.foldername(name))[1] = auth.uid()::text);