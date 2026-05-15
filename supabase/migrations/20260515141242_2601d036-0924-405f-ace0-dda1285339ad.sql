DELETE FROM public.connected_accounts
WHERE platform = 'twitch'
  AND platform_user_id IN ('qa_twitch_2_pid', 'qa_twitch_3_pid');