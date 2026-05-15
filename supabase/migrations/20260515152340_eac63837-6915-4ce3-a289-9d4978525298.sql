-- Align cron schedules with product spec.
-- Schedule-only updates; safe on remix because we no-op when jobs are missing.
DO $$
DECLARE
  v_jobid bigint;
BEGIN
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'eventsub-monitor-hourly';
  IF v_jobid IS NOT NULL THEN
    PERFORM cron.alter_job(v_jobid, schedule := '*/15 * * * *');
  END IF;

  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'live-detect-every-3-min';
  IF v_jobid IS NOT NULL THEN
    PERFORM cron.alter_job(v_jobid, schedule := '*/2 * * * *');
  END IF;
END$$;