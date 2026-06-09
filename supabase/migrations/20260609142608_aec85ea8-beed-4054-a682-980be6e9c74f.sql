ALTER TABLE public.visual_generation_jobs
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS prompt_used text,
  ADD COLUMN IF NOT EXISTS error_code text,
  ADD COLUMN IF NOT EXISTS provider_response_has_image boolean;

ALTER TABLE public.generated_visuals
  ADD COLUMN IF NOT EXISTS mime_type text NOT NULL DEFAULT 'image/png';

DROP POLICY IF EXISTS "Users can read own visual assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own visual assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own visual uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own visual uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own visual uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own visual uploads" ON storage.objects;

CREATE POLICY "Users can read own visual assets"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'creator-visual-assets'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own visual assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'creator-visual-assets'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can read own visual uploads"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'creator-visual-uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can upload own visual uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'creator-visual-uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own visual uploads"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'creator-visual-uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'creator-visual-uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own visual uploads"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'creator-visual-uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
);