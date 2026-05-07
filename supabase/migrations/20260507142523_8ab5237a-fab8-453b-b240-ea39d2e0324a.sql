
-- Normalize dimension labels to stable English keys in stream_score_snapshots
CREATE OR REPLACE FUNCTION public.normalize_dimension_key(label text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE lower(coalesce(label, ''))
    WHEN 'régularité' THEN 'regularity'
    WHEN 'regularite' THEN 'regularity'
    WHEN 'regularity' THEN 'regularity'
    WHEN 'structure' THEN 'structure'
    WHEN 'contenu' THEN 'content'
    WHEN 'content' THEN 'content'
    WHEN 'positionnement' THEN 'positioning'
    WHEN 'positioning' THEN 'positioning'
    WHEN 'momentum' THEN 'momentum'
    WHEN 'monétisation' THEN 'monetization'
    WHEN 'monetisation' THEN 'monetization'
    WHEN 'monetization' THEN 'monetization'
    ELSE lower(coalesce(label, ''))
  END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_stream_score_snapshot_from_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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

  SELECT public.normalize_dimension_key((b->>'dimension')::text) INTO top_sup
  FROM jsonb_array_elements(COALESCE(s->'breakdown','[]'::jsonb)) b
  ORDER BY COALESCE((b->>'score')::numeric, 0) DESC, b->>'dimension' ASC LIMIT 1;

  SELECT public.normalize_dimension_key((b->>'dimension')::text) INTO top_drg
  FROM jsonb_array_elements(COALESCE(s->'breakdown','[]'::jsonb)) b
  ORDER BY COALESCE((b->>'score')::numeric, 0) ASC, b->>'dimension' ASC LIMIT 1;

  INSERT INTO public.stream_score_snapshots (
    user_id, analysis_job_id,
    overall, regularity, structure, content, positioning, momentum, monetization,
    confidence, signal_quality, priority_dimension, top_drag, top_support, evidence
  ) VALUES (
    NEW.user_id, NEW.analysis_job_id,
    LEAST(100, GREATEST(0, COALESCE((s->>'overall')::int, 0))),
    LEAST(100, GREATEST(0, COALESCE((s->>'regularity')::int, 0))),
    LEAST(100, GREATEST(0, COALESCE((s->>'structure')::int, 0))),
    LEAST(100, GREATEST(0, COALESCE((s->>'content')::int, 0))),
    LEAST(100, GREATEST(0, COALESCE((s->>'positioning')::int, 0))),
    LEAST(100, GREATEST(0, COALESCE((s->>'momentum')::int, 0))),
    LEAST(100, GREATEST(0, COALESCE((s->>'monetization')::int, 0))),
    public.score_level_from_pct(conf),
    public.score_level_from_pct(ROUND(conf * 0.6 + fresh * 0.4)),
    top_drg, top_drg, top_sup,
    jsonb_build_object(
      'source','trigger:analysis_reports',
      'analysis_report_id', NEW.id,
      'dimension_count', jsonb_array_length(COALESCE(s->'breakdown','[]'::jsonb)),
      'score_freshness', fresh,
      'score_confidence', conf
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
$function$;

REVOKE EXECUTE ON FUNCTION public.normalize_dimension_key(text) FROM anon, authenticated;

-- Also fire on UPDATE (defensive — analysis_reports has no update policy today, but keeps snapshot in sync if ever updated)
DROP TRIGGER IF EXISTS trg_upsert_stream_score_snapshot_upd ON public.analysis_reports;
CREATE TRIGGER trg_upsert_stream_score_snapshot_upd
AFTER UPDATE ON public.analysis_reports
FOR EACH ROW EXECUTE FUNCTION public.upsert_stream_score_snapshot_from_report();

-- Backfill existing snapshots: re-derive priority_dimension/top_drag/top_support
-- using stable English keys, and re-clamp dimension scores from source.
UPDATE public.stream_score_snapshots s
SET
  overall = LEAST(100, GREATEST(0, COALESCE((r.report_data->'score'->>'overall')::int, s.overall))),
  regularity = LEAST(100, GREATEST(0, COALESCE((r.report_data->'score'->>'regularity')::int, s.regularity))),
  structure = LEAST(100, GREATEST(0, COALESCE((r.report_data->'score'->>'structure')::int, s.structure))),
  content = LEAST(100, GREATEST(0, COALESCE((r.report_data->'score'->>'content')::int, s.content))),
  positioning = LEAST(100, GREATEST(0, COALESCE((r.report_data->'score'->>'positioning')::int, s.positioning))),
  momentum = LEAST(100, GREATEST(0, COALESCE((r.report_data->'score'->>'momentum')::int, s.momentum))),
  monetization = LEAST(100, GREATEST(0, COALESCE((r.report_data->'score'->>'monetization')::int, s.monetization))),
  priority_dimension = sub.drag,
  top_drag = sub.drag,
  top_support = sub.support
FROM public.analysis_reports r,
LATERAL (
  SELECT
    (SELECT public.normalize_dimension_key((b->>'dimension')::text)
       FROM jsonb_array_elements(COALESCE(r.report_data->'score'->'breakdown','[]'::jsonb)) b
      ORDER BY COALESCE((b->>'score')::numeric,0) ASC, b->>'dimension' ASC LIMIT 1) AS drag,
    (SELECT public.normalize_dimension_key((b->>'dimension')::text)
       FROM jsonb_array_elements(COALESCE(r.report_data->'score'->'breakdown','[]'::jsonb)) b
      ORDER BY COALESCE((b->>'score')::numeric,0) DESC, b->>'dimension' ASC LIMIT 1) AS support
) sub
WHERE r.analysis_job_id = s.analysis_job_id;
