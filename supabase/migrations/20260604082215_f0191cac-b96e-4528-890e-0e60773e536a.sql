
CREATE POLICY "Users read own social media"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'creator-social-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users insert own social media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'creator-social-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users update own social media"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'creator-social-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete own social media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'creator-social-media' AND (storage.foldername(name))[1] = auth.uid()::text);
