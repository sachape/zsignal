
CREATE TABLE public.twitch_categories (
  game_id text PRIMARY KEY,
  game_name text NOT NULL,
  box_art_url text,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.twitch_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read twitch categories"
  ON public.twitch_categories
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Deny client insert on twitch_categories"
  ON public.twitch_categories
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY "Deny client update on twitch_categories"
  ON public.twitch_categories
  FOR UPDATE
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Deny client delete on twitch_categories"
  ON public.twitch_categories
  FOR DELETE
  TO anon, authenticated
  USING (false);

CREATE TRIGGER trg_twitch_categories_updated_at
  BEFORE UPDATE ON public.twitch_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_twitch_categories_last_synced ON public.twitch_categories (last_synced_at);
