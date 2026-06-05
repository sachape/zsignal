
ALTER TABLE public.analysis_jobs
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_retries integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS processing_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS failed_at timestamptz,
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS processed_by text;

-- Atomic claim: returns a single job to process, marking it processing+locked.
-- Picks queued jobs OR processing jobs whose lock has expired (>10 min).
-- FOR UPDATE SKIP LOCKED prevents two workers from claiming the same row.
CREATE OR REPLACE FUNCTION public.claim_next_analysis_job(
  p_processor text DEFAULT 'cron',
  p_lock_timeout_minutes integer DEFAULT 10
)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  status text,
  platform text,
  platform_user_id text,
  platform_login text,
  retry_count integer,
  max_retries integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  WITH cte AS (
    SELECT j.id
    FROM public.analysis_jobs j
    WHERE j.platform = 'twitch'
      AND j.platform_user_id IS NOT NULL
      AND (
        j.status = 'queued'
        OR (
          j.status = 'processing'
          AND j.locked_at IS NOT NULL
          AND j.locked_at < (now() - make_interval(mins => p_lock_timeout_minutes))
        )
      )
    ORDER BY j.created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  UPDATE public.analysis_jobs j
  SET status = 'processing',
      locked_at = now(),
      processing_started_at = COALESCE(j.processing_started_at, now()),
      started_at = COALESCE(j.started_at, now()),
      processed_by = p_processor,
      updated_at = now()
  FROM cte
  WHERE j.id = cte.id
  RETURNING j.id INTO v_id;

  IF v_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT j.id, j.user_id, j.status, j.platform, j.platform_user_id, j.platform_login,
         j.retry_count, j.max_retries
  FROM public.analysis_jobs j
  WHERE j.id = v_id;
END;
$$;

-- Mark a job as failed OR retry it depending on retry_count.
CREATE OR REPLACE FUNCTION public.fail_analysis_job(
  p_job_id uuid,
  p_error text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_retry integer;
  v_max integer;
  v_new_status text;
BEGIN
  SELECT retry_count, max_retries INTO v_retry, v_max
  FROM public.analysis_jobs WHERE id = p_job_id FOR UPDATE;

  IF v_retry IS NULL THEN RETURN 'not_found'; END IF;

  IF v_retry + 1 < COALESCE(v_max, 3) THEN
    v_new_status := 'queued';
    UPDATE public.analysis_jobs
    SET status = 'queued',
        retry_count = v_retry + 1,
        locked_at = NULL,
        error_message = LEFT(COALESCE(p_error, 'unknown'), 500),
        last_error = LEFT(COALESCE(p_error, 'unknown'), 500),
        updated_at = now()
    WHERE id = p_job_id;
  ELSE
    v_new_status := 'failed';
    UPDATE public.analysis_jobs
    SET status = 'failed',
        retry_count = v_retry + 1,
        failed_at = now(),
        locked_at = NULL,
        error_message = LEFT(COALESCE(p_error, 'unknown'), 500),
        last_error = LEFT(COALESCE(p_error, 'unknown'), 500),
        updated_at = now()
    WHERE id = p_job_id;
  END IF;

  RETURN v_new_status;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_next_analysis_job(text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_analysis_job(uuid, text) TO service_role;
