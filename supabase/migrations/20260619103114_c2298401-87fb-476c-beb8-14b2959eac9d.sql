-- Beta hardening: schedule orphan cleanup + fix twitch-refresh cron auth.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 1) Orphan generation jobs cleanup every 10 minutes (calls SECURITY DEFINER SQL fn).
DO $outer$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-orphaned-generation-jobs-10min') THEN
    PERFORM cron.unschedule('cleanup-orphaned-generation-jobs-10min');
  END IF;
  PERFORM cron.schedule(
    'cleanup-orphaned-generation-jobs-10min',
    '*/10 * * * *',
    $cron$ SELECT public.cleanup_orphaned_generation_jobs(); $cron$
  );
END
$outer$;

-- 2) Rebuild twitch-refresh-enqueue cron with Authorization header carrying
--    the eventsub_cron_secret (read from vault at execution time). The previous
--    schedule sent no Authorization header so the edge function returned 401.
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
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          SELECT decrypted_secret FROM vault.decrypted_secrets
          WHERE name = 'eventsub_cron_secret' LIMIT 1
        )
      ),
      body := jsonb_build_object('mode', 'all')
    ) AS request_id;
    $cron$
  );
END
$outer$;