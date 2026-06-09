
-- =========================================
-- Studio Visuel — schema
-- =========================================

-- BRAND KIT
CREATE TABLE public.creator_brand_kit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  handle text,
  primary_color text,
  accent_color text,
  logo_storage_bucket text,
  logo_storage_path text,
  preferred_style text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.creator_brand_kit TO authenticated;
GRANT ALL ON public.creator_brand_kit TO service_role;
ALTER TABLE public.creator_brand_kit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brand_kit_owner_all" ON public.creator_brand_kit
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_brand_kit_updated_at BEFORE UPDATE ON public.creator_brand_kit
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- TEMPLATES (catalog, read-only for users)
CREATE TABLE public.visual_templates (
  id text PRIMARY KEY,
  category text NOT NULL,
  label text NOT NULL,
  description text NOT NULL,
  width integer NOT NULL,
  height integer NOT NULL,
  icon text,
  base_prompt text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.visual_templates TO authenticated, anon;
GRANT ALL ON public.visual_templates TO service_role;
ALTER TABLE public.visual_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "templates_read_all" ON public.visual_templates
  FOR SELECT TO authenticated, anon USING (is_active = true);

-- UPLOADED ASSETS (user refs)
CREATE TABLE public.visual_uploaded_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'reference',
  storage_bucket text NOT NULL,
  storage_path text NOT NULL,
  original_filename text,
  mime_type text,
  size_bytes integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visual_uploaded_assets TO authenticated;
GRANT ALL ON public.visual_uploaded_assets TO service_role;
ALTER TABLE public.visual_uploaded_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "uploaded_assets_owner_all" ON public.visual_uploaded_assets
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX visual_uploaded_assets_user_idx ON public.visual_uploaded_assets(user_id, created_at DESC);

-- JOBS
CREATE TABLE public.visual_generation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id text NOT NULL REFERENCES public.visual_templates(id),
  status text NOT NULL DEFAULT 'queued',
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_ref jsonb,
  reference_asset_id uuid REFERENCES public.visual_uploaded_assets(id) ON DELETE SET NULL,
  variant_count integer NOT NULL DEFAULT 3,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT visual_jobs_status_check CHECK (status IN ('queued','processing','succeeded','failed'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visual_generation_jobs TO authenticated;
GRANT ALL ON public.visual_generation_jobs TO service_role;
ALTER TABLE public.visual_generation_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "visual_jobs_owner_all" ON public.visual_generation_jobs
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX visual_jobs_user_idx ON public.visual_generation_jobs(user_id, created_at DESC);
CREATE TRIGGER update_visual_jobs_updated_at BEFORE UPDATE ON public.visual_generation_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- GENERATED VISUALS (variants)
CREATE TABLE public.generated_visuals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.visual_generation_jobs(id) ON DELETE CASCADE,
  template_id text NOT NULL REFERENCES public.visual_templates(id),
  storage_bucket text NOT NULL,
  storage_path text NOT NULL,
  width integer,
  height integer,
  variant_index integer NOT NULL DEFAULT 0,
  is_favorite boolean NOT NULL DEFAULT false,
  prompt_used text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.generated_visuals TO authenticated;
GRANT ALL ON public.generated_visuals TO service_role;
ALTER TABLE public.generated_visuals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "generated_visuals_owner_all" ON public.generated_visuals
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX generated_visuals_user_idx ON public.generated_visuals(user_id, created_at DESC);
CREATE INDEX generated_visuals_job_idx ON public.generated_visuals(job_id);

-- SEED TEMPLATES
INSERT INTO public.visual_templates (id, category, label, description, width, height, icon, base_prompt, sort_order) VALUES
  ('twitch_banner','twitch','Bannière Twitch','Bannière de profil affichée en haut de ta chaîne Twitch.',1920,480,'Tv','Premium horizontal Twitch channel banner, bold streamer identity, dramatic lighting, gaming atmosphere, leave breathing space for profile picture on left.',10),
  ('twitch_offline','twitch','Bannière offline','Affichée quand tu n''es pas en live sur Twitch.',1920,1080,'MonitorOff','High-end Twitch offline screen, cinematic mood, clear "back soon" energy, dark gaming aesthetic, balanced composition.',20),
  ('live_announcement','social','Annonce de live','Visuel carré pour annoncer que tu pars en live.',1080,1080,'Radio','Eye-catching social media post announcing a Twitch live stream, vibrant energy, bold typography zone, gaming streamer vibe, scroll-stopping composition.',30),
  ('instagram_post','social','Post Instagram','Format carré 1:1 pour Instagram ou X.',1080,1080,'Instagram','Premium square social post for a streamer, modern editorial design, clear focal subject, room for short headline.',40),
  ('instagram_story','social','Story verticale','Format 9:16 pour Instagram / TikTok / Snap stories.',1080,1920,'Smartphone','Vertical 9:16 story for a streamer, mobile-first composition, bold visual hook at top, clean center safe-zone for text.',50),
  ('new_clip','social','Nouveau clip','Annonce d''un nouveau clip ou highlight.',1080,1080,'Clapperboard','Hype social card announcing a fresh gaming clip, motion blur energy, headline space, modern streamer brand.',60),
  ('highlight','social','Best moment','Format 4:5 pour mettre en avant un moment fort.',1080,1350,'Sparkles','Editorial highlight visual celebrating a top gaming moment, cinematic frame, vivid colors, premium streamer card.',70),
  ('cover_simple','branding','Cover / header','Header simple pour YouTube, Discord ou site perso.',1500,500,'Layout','Clean horizontal channel header, balanced minimal composition, streamer branding zone centered, premium dark aesthetic.',80);
