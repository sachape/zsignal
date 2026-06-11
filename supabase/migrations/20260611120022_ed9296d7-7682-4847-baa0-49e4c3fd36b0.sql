
CREATE OR REPLACE FUNCTION public.get_user_quota_usage(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := COALESCE(p_user_id, auth.uid());
  v_month_start timestamptz := date_trunc('month', now() AT TIME ZONE 'UTC');
  v_visuals int := 0;
  v_clips int := 0;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('visuals_used', 0, 'clips_used', 0, 'month_start', v_month_start);
  END IF;

  SELECT COUNT(*) INTO v_visuals
  FROM public.visual_generation_jobs
  WHERE user_id = v_uid
    AND created_at >= v_month_start
    AND status <> 'failed';

  SELECT COUNT(*) INTO v_clips
  FROM public.creator_video_generation_jobs
  WHERE user_id = v_uid
    AND created_at >= v_month_start
    AND status <> 'failed';

  RETURN jsonb_build_object(
    'visuals_used', v_visuals,
    'clips_used', v_clips,
    'month_start', v_month_start
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_quota_usage(uuid) TO authenticated, service_role;
