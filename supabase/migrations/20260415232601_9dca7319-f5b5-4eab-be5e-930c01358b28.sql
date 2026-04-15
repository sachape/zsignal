
-- analysis_jobs
CREATE TABLE public.analysis_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  channel_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.analysis_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own jobs" ON public.analysis_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own jobs" ON public.analysis_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own jobs" ON public.analysis_jobs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own jobs" ON public.analysis_jobs FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_analysis_jobs_updated_at BEFORE UPDATE ON public.analysis_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- twitch_profiles
CREATE TABLE public.twitch_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  twitch_user_id TEXT,
  login TEXT,
  display_name TEXT,
  description TEXT,
  profile_image_url TEXT,
  view_count BIGINT DEFAULT 0,
  follower_count BIGINT DEFAULT 0,
  broadcaster_type TEXT,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.twitch_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own twitch profiles" ON public.twitch_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own twitch profiles" ON public.twitch_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own twitch profiles" ON public.twitch_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own twitch profiles" ON public.twitch_profiles FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_twitch_profiles_updated_at BEFORE UPDATE ON public.twitch_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- twitch_videos
CREATE TABLE public.twitch_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_job_id UUID NOT NULL REFERENCES public.analysis_jobs(id) ON DELETE CASCADE,
  twitch_video_id TEXT,
  title TEXT,
  view_count BIGINT DEFAULT 0,
  duration TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.twitch_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own videos" ON public.twitch_videos FOR SELECT USING (EXISTS (SELECT 1 FROM public.analysis_jobs WHERE id = analysis_job_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert own videos" ON public.twitch_videos FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.analysis_jobs WHERE id = analysis_job_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete own videos" ON public.twitch_videos FOR DELETE USING (EXISTS (SELECT 1 FROM public.analysis_jobs WHERE id = analysis_job_id AND user_id = auth.uid()));

-- twitch_clips
CREATE TABLE public.twitch_clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_job_id UUID NOT NULL REFERENCES public.analysis_jobs(id) ON DELETE CASCADE,
  twitch_clip_id TEXT,
  title TEXT,
  view_count BIGINT DEFAULT 0,
  creator_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.twitch_clips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own clips" ON public.twitch_clips FOR SELECT USING (EXISTS (SELECT 1 FROM public.analysis_jobs WHERE id = analysis_job_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert own clips" ON public.twitch_clips FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.analysis_jobs WHERE id = analysis_job_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete own clips" ON public.twitch_clips FOR DELETE USING (EXISTS (SELECT 1 FROM public.analysis_jobs WHERE id = analysis_job_id AND user_id = auth.uid()));

-- channel_facts
CREATE TABLE public.channel_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_job_id UUID NOT NULL REFERENCES public.analysis_jobs(id) ON DELETE CASCADE,
  fact_key TEXT NOT NULL,
  fact_value TEXT,
  confidence NUMERIC(3,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.channel_facts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own facts" ON public.channel_facts FOR SELECT USING (EXISTS (SELECT 1 FROM public.analysis_jobs WHERE id = analysis_job_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert own facts" ON public.channel_facts FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.analysis_jobs WHERE id = analysis_job_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete own facts" ON public.channel_facts FOR DELETE USING (EXISTS (SELECT 1 FROM public.analysis_jobs WHERE id = analysis_job_id AND user_id = auth.uid()));

-- stream_scores
CREATE TABLE public.stream_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_job_id UUID NOT NULL REFERENCES public.analysis_jobs(id) ON DELETE CASCADE,
  overall_score INTEGER DEFAULT 0,
  regularity INTEGER DEFAULT 0,
  engagement INTEGER DEFAULT 0,
  growth INTEGER DEFAULT 0,
  discoverability INTEGER DEFAULT 0,
  content_quality INTEGER DEFAULT 0,
  community INTEGER DEFAULT 0,
  monetization_readiness INTEGER DEFAULT 0,
  affiliate_progress INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.stream_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own scores" ON public.stream_scores FOR SELECT USING (EXISTS (SELECT 1 FROM public.analysis_jobs WHERE id = analysis_job_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert own scores" ON public.stream_scores FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.analysis_jobs WHERE id = analysis_job_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete own scores" ON public.stream_scores FOR DELETE USING (EXISTS (SELECT 1 FROM public.analysis_jobs WHERE id = analysis_job_id AND user_id = auth.uid()));

-- competitor_matches
CREATE TABLE public.competitor_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_job_id UUID NOT NULL REFERENCES public.analysis_jobs(id) ON DELETE CASCADE,
  competitor_login TEXT NOT NULL,
  display_name TEXT,
  similarity_score INTEGER DEFAULT 0,
  follower_count BIGINT DEFAULT 0,
  avg_viewers BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.competitor_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own competitors" ON public.competitor_matches FOR SELECT USING (EXISTS (SELECT 1 FROM public.analysis_jobs WHERE id = analysis_job_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert own competitors" ON public.competitor_matches FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.analysis_jobs WHERE id = analysis_job_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete own competitors" ON public.competitor_matches FOR DELETE USING (EXISTS (SELECT 1 FROM public.analysis_jobs WHERE id = analysis_job_id AND user_id = auth.uid()));

-- recommendations
CREATE TABLE public.recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_job_id UUID NOT NULL REFERENCES public.analysis_jobs(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 0,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  is_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own recommendations" ON public.recommendations FOR SELECT USING (EXISTS (SELECT 1 FROM public.analysis_jobs WHERE id = analysis_job_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert own recommendations" ON public.recommendations FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.analysis_jobs WHERE id = analysis_job_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete own recommendations" ON public.recommendations FOR DELETE USING (EXISTS (SELECT 1 FROM public.analysis_jobs WHERE id = analysis_job_id AND user_id = auth.uid()));

-- analysis_reports
CREATE TABLE public.analysis_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_job_id UUID NOT NULL REFERENCES public.analysis_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  channel_summary TEXT,
  report_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.analysis_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own reports" ON public.analysis_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reports" ON public.analysis_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own reports" ON public.analysis_reports FOR DELETE USING (auth.uid() = user_id);
