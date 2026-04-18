ALTER TABLE public.analysis_jobs
  ADD COLUMN IF NOT EXISTS trigger_source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS last_error text;

ALTER TABLE public.connected_accounts
  ADD COLUMN IF NOT EXISTS last_auto_refresh_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_auto_refresh_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_analysis_jobs_user_platform
  ON public.analysis_jobs (user_id, platform_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analysis_jobs_queued
  ON public.analysis_jobs (status, created_at)
  WHERE status IN ('queued', 'processing');

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $outer$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'twitch-auto-refresh-hourly') THEN
    PERFORM cron.unschedule('twitch-auto-refresh-hourly');
  END IF;

  PERFORM cron.schedule(
    'twitch-auto-refresh-hourly',
    '0 * * * *',
    $cron$
    SELECT net.http_post(
      url := 'https://poblhczgdbnfunroshul.supabase.co/functions/v1/twitch-refresh-enqueue',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('mode', 'all')
    ) AS request_id;
    $cron$
  );
END
$outer$;