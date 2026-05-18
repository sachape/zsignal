-- channel_update_history: deny client writes (eventsub-populated)
CREATE POLICY "Deny writes from clients (channel_update_history insert)"
  ON public.channel_update_history FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "Deny writes from clients (channel_update_history update)"
  ON public.channel_update_history FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Deny writes from clients (channel_update_history delete)"
  ON public.channel_update_history FOR DELETE TO anon, authenticated USING (false);

-- community_events: deny client writes
CREATE POLICY "Deny writes from clients (community_events insert)"
  ON public.community_events FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "Deny writes from clients (community_events update)"
  ON public.community_events FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Deny writes from clients (community_events delete)"
  ON public.community_events FOR DELETE TO anon, authenticated USING (false);

-- creator_alerts: deny client INSERT/DELETE (writes happen via service role)
CREATE POLICY "Deny writes from clients (creator_alerts insert)"
  ON public.creator_alerts FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "Deny writes from clients (creator_alerts delete)"
  ON public.creator_alerts FOR DELETE TO anon, authenticated USING (false);

-- stream_scores: add UPDATE policy scoped via analysis_jobs
CREATE POLICY "Users can update own scores"
  ON public.stream_scores FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.analysis_jobs
    WHERE analysis_jobs.id = stream_scores.analysis_job_id AND analysis_jobs.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.analysis_jobs
    WHERE analysis_jobs.id = stream_scores.analysis_job_id AND analysis_jobs.user_id = auth.uid()));

-- streamscore_email_events: deny client writes (service-only)
CREATE POLICY "Deny writes from clients (streamscore_email_events insert)"
  ON public.streamscore_email_events FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "Deny writes from clients (streamscore_email_events update)"
  ON public.streamscore_email_events FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Deny writes from clients (streamscore_email_events delete)"
  ON public.streamscore_email_events FOR DELETE TO anon, authenticated USING (false);

-- twitch_clip_snapshots: deny client writes (ingested server-side)
CREATE POLICY "Deny writes from clients (twitch_clip_snapshots insert)"
  ON public.twitch_clip_snapshots FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "Deny writes from clients (twitch_clip_snapshots update)"
  ON public.twitch_clip_snapshots FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Deny writes from clients (twitch_clip_snapshots delete)"
  ON public.twitch_clip_snapshots FOR DELETE TO anon, authenticated USING (false);

-- user_email_events: owner-scoped writes
CREATE POLICY "Users can insert own email events"
  ON public.user_email_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own email events"
  ON public.user_email_events FOR DELETE USING (auth.uid() = user_id);

-- weekly_action_outcomes: owner-scoped writes
CREATE POLICY "Users can insert own weekly action outcomes"
  ON public.weekly_action_outcomes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own weekly action outcomes"
  ON public.weekly_action_outcomes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own weekly action outcomes"
  ON public.weekly_action_outcomes FOR DELETE USING (auth.uid() = user_id);

-- user_badge_state: owner-scoped UPDATE
CREATE POLICY "ubs_update_own"
  ON public.user_badge_state FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- user_checklist_progress: owner-scoped UPDATE
CREATE POLICY "Users can update own checklist progress"
  ON public.user_checklist_progress FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
