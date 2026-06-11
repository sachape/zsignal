
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_generation_jobs()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visual_count int := 0;
  v_clip_count int := 0;
BEGIN
  -- Studio visuel: processing > 15 min sans complétion
  WITH updated AS (
    UPDATE public.visual_generation_jobs
    SET status = 'failed',
        error_code = 'timeout_orphaned_job',
        error_message = 'La génération a pris trop de temps et a été arrêtée automatiquement.',
        completed_at = now(),
        updated_at = now()
    WHERE status = 'processing'
      AND COALESCE(started_at, updated_at, created_at) < now() - interval '15 minutes'
    RETURNING 1
  )
  SELECT count(*) INTO v_visual_count FROM updated;

  -- Clips réseaux: statuts actifs > 30 min sans signal worker récent
  WITH updated AS (
    UPDATE public.creator_video_generation_jobs
    SET status = 'failed',
        generation_stage = 'failed',
        error_code = 'timeout_orphaned_job',
        error_message = 'La génération a pris trop de temps et a été arrêtée automatiquement.',
        completed_at = now(),
        worker_completed_at = COALESCE(worker_completed_at, now()),
        updated_at = now()
    WHERE status IN ('processing', 'rendering', 'uploading', 'transcribing', 'queued')
      AND COALESCE(worker_last_seen_at, worker_started_at, updated_at, created_at) < now() - interval '30 minutes'
    RETURNING 1
  )
  SELECT count(*) INTO v_clip_count FROM updated;

  -- Libère aussi les content items associés pour que l'utilisateur puisse relancer
  UPDATE public.creator_content_items ci
  SET status = 'to_generate',
      generation_status = 'failed',
      generation_error = 'La génération a pris trop de temps. Tu peux réessayer.'
  FROM public.creator_video_generation_jobs j
  WHERE j.content_item_id = ci.id
    AND j.error_code = 'timeout_orphaned_job'
    AND j.completed_at > now() - interval '2 minutes';

  RETURN jsonb_build_object(
    'visual_jobs_failed', v_visual_count,
    'clip_jobs_failed', v_clip_count,
    'ran_at', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_orphaned_generation_jobs() TO service_role;
