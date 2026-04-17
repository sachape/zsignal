-- competitor_feedback table
CREATE TABLE public.competitor_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  report_id UUID NOT NULL REFERENCES public.analysis_reports(id) ON DELETE CASCADE,
  competitor_key TEXT NOT NULL,
  feedback_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT competitor_feedback_type_check CHECK (
    feedback_type IN ('relevant', 'not_relevant', 'too_big', 'wrong_niche', 'good_example', 'hidden')
  ),
  CONSTRAINT competitor_feedback_unique UNIQUE (user_id, report_id, competitor_key, feedback_type)
);

CREATE INDEX idx_competitor_feedback_report ON public.competitor_feedback(report_id);
CREATE INDEX idx_competitor_feedback_user ON public.competitor_feedback(user_id);

ALTER TABLE public.competitor_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own competitor feedback"
ON public.competitor_feedback FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own competitor feedback"
ON public.competitor_feedback FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own competitor feedback"
ON public.competitor_feedback FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own competitor feedback"
ON public.competitor_feedback FOR DELETE
USING (auth.uid() = user_id);