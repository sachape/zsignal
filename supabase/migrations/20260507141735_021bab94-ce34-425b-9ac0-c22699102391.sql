
DELETE FROM public.stream_score_snapshots;

CREATE OR REPLACE FUNCTION public.score_level_from_pct(pct numeric)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN pct IS NULL THEN 'low'
    WHEN pct >= 70 THEN 'high'
    WHEN pct >= 35 THEN 'medium'
    ELSE 'low'
  END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_stream_score_snapshot_from_report()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s jsonb; conf numeric; fresh numeric; top_sup text; top_drg text;
BEGIN
  s := NEW.report_data -> 'score';
  IF s IS NULL OR jsonb_typeof(s) <> 'object' OR NEW.analysis_job_id IS NULL THEN
    RETURN NEW;
  END IF;

  conf := COALESCE((s->>'confidence')::numeric, 0);
  fresh := COALESCE((s->>'freshness')::numeric, 0);
  IF conf <= 1 THEN conf := conf * 100; END IF;
  IF fresh <= 1 THEN fresh := fresh * 100; END IF;

  SELECT (b->>'dimension')::text INTO top_sup
  FROM jsonb_array_elements(COALESCE(s->'breakdown','[]'::jsonb)) b
  ORDER BY COALESCE((b->>'score')::numeric, 0) DESC, b->>'dimension' ASC LIMIT 1;

  SELECT (b->>'dimension')::text INTO top_drg
  FROM jsonb_array_elements(COALESCE(s->'breakdown','[]'::jsonb)) b
  ORDER BY COALESCE((b->>'score')::numeric, 0) ASC, b->>'dimension' ASC LIMIT 1;

  INSERT INTO public.stream_score_snapshots (
    user_id, analysis_job_id,
    overall, regularity, structure, content, positioning, momentum, monetization,
    confidence, signal_quality, priority_dimension, top_drag, top_support, evidence
  ) VALUES (
    NEW.user_id, NEW.analysis_job_id,
    COALESCE((s->>'overall')::int, 0),
    COALESCE((s->>'regularity')::int, 0),
    COALESCE((s->>'structure')::int, 0),
    COALESCE((s->>'content')::int, 0),
    COALESCE((s->>'positioning')::int, 0),
    COALESCE((s->>'momentum')::int, 0),
    COALESCE((s->>'monetization')::int, 0),
    public.score_level_from_pct(conf),
    public.score_level_from_pct(ROUND(conf * 0.6 + fresh * 0.4)),
    top_drg, top_drg, top_sup,
    jsonb_build_object(
      'source','trigger:analysis_reports',
      'analysis_report_id', NEW.id,
      'dimension_count', jsonb_array_length(COALESCE(s->'breakdown','[]'::jsonb)),
      'score_freshness', fresh, 'score_confidence', conf
    )
  )
  ON CONFLICT (analysis_job_id) WHERE analysis_job_id IS NOT NULL DO UPDATE SET
    overall = EXCLUDED.overall, regularity = EXCLUDED.regularity,
    structure = EXCLUDED.structure, content = EXCLUDED.content,
    positioning = EXCLUDED.positioning, momentum = EXCLUDED.momentum,
    monetization = EXCLUDED.monetization, confidence = EXCLUDED.confidence,
    signal_quality = EXCLUDED.signal_quality, priority_dimension = EXCLUDED.priority_dimension,
    top_drag = EXCLUDED.top_drag, top_support = EXCLUDED.top_support, evidence = EXCLUDED.evidence;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_upsert_stream_score_snapshot ON public.analysis_reports;
CREATE TRIGGER trg_upsert_stream_score_snapshot
AFTER INSERT ON public.analysis_reports
FOR EACH ROW EXECUTE FUNCTION public.upsert_stream_score_snapshot_from_report();

-- Backfill: latest report per analysis_job_id
WITH latest AS (
  SELECT DISTINCT ON (analysis_job_id) *
  FROM public.analysis_reports
  WHERE analysis_job_id IS NOT NULL AND report_data ? 'score'
  ORDER BY analysis_job_id, created_at DESC
)
INSERT INTO public.stream_score_snapshots (
  user_id, analysis_job_id,
  overall, regularity, structure, content, positioning, momentum, monetization,
  confidence, signal_quality, priority_dimension, top_drag, top_support, evidence
)
SELECT
  ar.user_id, ar.analysis_job_id,
  COALESCE((ar.report_data->'score'->>'overall')::int, 0),
  COALESCE((ar.report_data->'score'->>'regularity')::int, 0),
  COALESCE((ar.report_data->'score'->>'structure')::int, 0),
  COALESCE((ar.report_data->'score'->>'content')::int, 0),
  COALESCE((ar.report_data->'score'->>'positioning')::int, 0),
  COALESCE((ar.report_data->'score'->>'momentum')::int, 0),
  COALESCE((ar.report_data->'score'->>'monetization')::int, 0),
  public.score_level_from_pct(
    CASE WHEN COALESCE((ar.report_data->'score'->>'confidence')::numeric,0) <= 1
      THEN COALESCE((ar.report_data->'score'->>'confidence')::numeric,0) * 100
      ELSE COALESCE((ar.report_data->'score'->>'confidence')::numeric,0) END
  ),
  public.score_level_from_pct(ROUND(
    (CASE WHEN COALESCE((ar.report_data->'score'->>'confidence')::numeric,0) <= 1
      THEN COALESCE((ar.report_data->'score'->>'confidence')::numeric,0) * 100
      ELSE COALESCE((ar.report_data->'score'->>'confidence')::numeric,0) END) * 0.6 +
    (CASE WHEN COALESCE((ar.report_data->'score'->>'freshness')::numeric,0) <= 1
      THEN COALESCE((ar.report_data->'score'->>'freshness')::numeric,0) * 100
      ELSE COALESCE((ar.report_data->'score'->>'freshness')::numeric,0) END) * 0.4
  )),
  (SELECT (b->>'dimension')::text FROM jsonb_array_elements(COALESCE(ar.report_data->'score'->'breakdown','[]'::jsonb)) b
    ORDER BY COALESCE((b->>'score')::numeric,0) ASC, b->>'dimension' ASC LIMIT 1),
  (SELECT (b->>'dimension')::text FROM jsonb_array_elements(COALESCE(ar.report_data->'score'->'breakdown','[]'::jsonb)) b
    ORDER BY COALESCE((b->>'score')::numeric,0) ASC, b->>'dimension' ASC LIMIT 1),
  (SELECT (b->>'dimension')::text FROM jsonb_array_elements(COALESCE(ar.report_data->'score'->'breakdown','[]'::jsonb)) b
    ORDER BY COALESCE((b->>'score')::numeric,0) DESC, b->>'dimension' ASC LIMIT 1),
  jsonb_build_object('source','backfill:analysis_reports','analysis_report_id', ar.id)
FROM latest ar
ON CONFLICT (analysis_job_id) WHERE analysis_job_id IS NOT NULL DO NOTHING;
