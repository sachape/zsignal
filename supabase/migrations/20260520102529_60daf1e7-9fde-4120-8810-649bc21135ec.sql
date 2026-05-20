SELECT net.http_post(
  url := 'https://poblhczgdbnfunroshul.supabase.co/functions/v1/twitch-market-aggregate-daily',
  headers := jsonb_build_object(
    'Content-Type','application/json',
    'Authorization','Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='eventsub_cron_secret' LIMIT 1)
  ),
  body := '{"date":"2026-05-20"}'::jsonb
) AS request_id;