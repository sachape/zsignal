CREATE TABLE IF NOT EXISTS public.creator_meta_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL DEFAULT 'instagram',
  connection_status text NOT NULL DEFAULT 'pending_review',
  meta_user_id text,
  instagram_account_id text,
  instagram_username text,
  instagram_profile_picture_url text,
  account_type text,
  page_id text,
  page_name text,
  scopes_granted text[],
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  last_sync_at timestamptz,
  error_code text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT creator_meta_connections_status_chk CHECK (
    connection_status IN ('connected','expired','revoked','pending_review','error','disconnected')
  ),
  CONSTRAINT creator_meta_connections_unique_user_platform UNIQUE (user_id, platform)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.creator_meta_connections TO authenticated;
GRANT ALL ON public.creator_meta_connections TO service_role;

ALTER TABLE public.creator_meta_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own meta connections"
  ON public.creator_meta_connections FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own meta connections"
  ON public.creator_meta_connections FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own meta connections"
  ON public.creator_meta_connections FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own meta connections"
  ON public.creator_meta_connections FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_creator_meta_connections_updated_at
  BEFORE UPDATE ON public.creator_meta_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_creator_meta_connections_user ON public.creator_meta_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_creator_meta_connections_status ON public.creator_meta_connections(connection_status);