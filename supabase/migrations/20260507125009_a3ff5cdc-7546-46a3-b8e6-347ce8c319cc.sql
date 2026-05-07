
CREATE TABLE public.stream_score_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  analysis_job_id uuid NULL REFERENCES public.analysis_jobs(id) ON DELETE SET NULL,
  overall integer NOT NULL,
  regularity integer NULL,
  structure integer NULL,
  content integer NULL,
  positioning integer NULL,
  momentum integer NULL,
  monetization integer NULL,
  confidence text NOT NULL,
  signal_quality text NOT NULL,
  priority_dimension text NULL,
  top_drag text NULL,
  top_support text NULL,
  evidence jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stream_score_snapshots_overall_range CHECK (overall BETWEEN 0 AND 100),
  CONSTRAINT stream_score_snapshots_regularity_range CHECK (regularity IS NULL OR regularity BETWEEN 0 AND 100),
  CONSTRAINT stream_score_snapshots_structure_range CHECK (structure IS NULL OR structure BETWEEN 0 AND 100),
  CONSTRAINT stream_score_snapshots_content_range CHECK (content IS NULL OR content BETWEEN 0 AND 100),
  CONSTRAINT stream_score_snapshots_positioning_range CHECK (positioning IS NULL OR positioning BETWEEN 0 AND 100),
  CONSTRAINT stream_score_snapshots_momentum_range CHECK (momentum IS NULL OR momentum BETWEEN 0 AND 100),
  CONSTRAINT stream_score_snapshots_monetization_range CHECK (monetization IS NULL OR monetization BETWEEN 0 AND 100),
  CONSTRAINT stream_score_snapshots_confidence_check CHECK (confidence IN ('low','medium','high')),
  CONSTRAINT stream_score_snapshots_signal_quality_check CHECK (signal_quality IN ('low','medium','high'))
);

CREATE INDEX idx_stream_score_snapshots_user_created
  ON public.stream_score_snapshots (user_id, created_at DESC);
CREATE INDEX idx_stream_score_snapshots_job
  ON public.stream_score_snapshots (analysis_job_id);
CREATE INDEX idx_stream_score_snapshots_confidence
  ON public.stream_score_snapshots (confidence);
CREATE INDEX idx_stream_score_snapshots_signal_quality
  ON public.stream_score_snapshots (signal_quality);
CREATE UNIQUE INDEX idx_stream_score_snapshots_unique_job
  ON public.stream_score_snapshots (analysis_job_id)
  WHERE analysis_job_id IS NOT NULL;

ALTER TABLE public.stream_score_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stream score snapshots"
  ON public.stream_score_snapshots
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stream score snapshots"
  ON public.stream_score_snapshots
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own stream score snapshots"
  ON public.stream_score_snapshots
  FOR DELETE
  USING (auth.uid() = user_id);
