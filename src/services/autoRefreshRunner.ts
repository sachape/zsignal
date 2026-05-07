import { supabase } from "@/integrations/supabase/client";
import { assembleReport } from "./reportAssembler";
import { resolveAnalysisDataset } from "./liveReportSource";
import { fetchLiveTwitchProfile } from "./twitchLiveProfile";
import { buildCompetitorGroups, type CandidateChannel, type TargetSignal } from "./competitorEngine";
import { persistStreamScoreSnapshot } from "./streamScoreSnapshot";

/**
 * Hybrid auto-refresh: the backend (or callsite) creates a `queued`
 * analysis_jobs row tagged auto_first / auto_scheduled / manual. When the
 * dashboard mounts and detects such a row for the connected account, it
 * runs the existing client-side analysis pipeline against that job and
 * persists the resulting report. This keeps engines (facts, score,
 * competitors) as the single source of truth without duplicating them in
 * Deno yet.
 */
export interface ProcessQueuedJobOptions {
  jobId: string;
  userId: string;
  platformUserId: string;
  platformLogin: string;
  platformDisplayName: string | null;
}

export interface ProcessQueuedJobResult {
  ok: boolean;
  reportId?: string;
  error?: string;
}

export async function processQueuedJob(
  opts: ProcessQueuedJobOptions,
): Promise<ProcessQueuedJobResult> {
  const { jobId, userId, platformUserId, platformLogin, platformDisplayName } = opts;

  // Atomic claim: only proceed if this row is still queued (avoids two
  // tabs racing). We move it to processing first.
  const { data: claimed, error: claimErr } = await supabase
    .from("analysis_jobs")
    .update({ status: "processing", started_at: new Date().toISOString() })
    .eq("id", jobId)
    .eq("status", "queued")
    .select("id")
    .maybeSingle();

  if (claimErr || !claimed) {
    return { ok: false, error: claimErr?.message ?? "Job already claimed." };
  }

  try {
    const liveProfile = await fetchLiveTwitchProfile();

    const data = resolveAnalysisDataset({
      login: platformLogin,
      displayName: platformDisplayName ?? platformLogin,
      platformUserId,
      liveOnly: true,
      liveProfile: liveProfile
        ? {
            id: liveProfile.profile?.id ?? null,
            login: liveProfile.profile?.login ?? null,
            display_name: liveProfile.profile?.display_name ?? null,
            description: liveProfile.profile?.description ?? null,
            profile_image_url: liveProfile.profile?.profile_image_url ?? null,
            broadcaster_type: liveProfile.profile?.broadcaster_type ?? null,
            view_count: liveProfile.profile?.view_count ?? null,
            follower_count: liveProfile.follower_count ?? null,
            followers_available: liveProfile.followers_available,
            followers_missing_scope: liveProfile.missing_scope,
            videos: liveProfile.videos,
            clips: liveProfile.clips,
          }
        : null,
    });

    const competitorGroups = buildCompetitorGroups({
      target: {
        login: platformLogin,
        language: "fr",
        dominant_category: liveProfile?.dominant_category ?? null,
        recent_titles: (liveProfile?.videos ?? []).slice(0, 10).map((v) => v.title),
        channel_type: "solo",
        content_format: "unknown",
        size_proxy: liveProfile?.profile?.view_count ?? 0,
      } satisfies TargetSignal,
      candidates: (liveProfile?.competitors ?? []).map<CandidateChannel>((c) => ({
        id: c.id,
        login: c.login,
        display_name: c.display_name,
        broadcaster_type: c.broadcaster_type,
        description: c.description,
        is_live: c.is_live,
        live_title: c.title,
        live_viewer_count: c.live_viewer_count ?? null,
        game_name: c.game_name,
        language: c.language,
        recent_titles: c.title ? [c.title] : [],
        view_count: c.view_count,
      })),
      teaser: false,
    });

    const report = assembleReport(data, jobId, {
      platform: "twitch",
      platform_user_id: platformUserId,
      platform_login: platformLogin,
      display_name: platformDisplayName ?? platformLogin,
      avatar_url: liveProfile?.profile?.profile_image_url ?? null,
      is_demo: false,
    }, {
      live: liveProfile?.live
        ? {
            title: liveProfile.live.title,
            game_name: liveProfile.live.game_name,
            viewer_count: liveProfile.live.viewer_count,
            started_at: liveProfile.live.started_at,
          }
        : null,
      competitor_groups: competitorGroups,
      dominant_category_override: liveProfile?.dominant_category ?? null,
    });

    const { data: saved, error: repErr } = await supabase
      .from("analysis_reports")
      .insert({
        analysis_job_id: jobId,
        user_id: userId,
        channel_summary: `${report.channel_summary.display_name} · ${report.channel_summary.category} · Score ${report.score.overall}`,
        report_data: report as never,
      })
      .select("id")
      .single();

    if (repErr || !saved) throw new Error(repErr?.message ?? "Report save failed");

    await supabase
      .from("analysis_jobs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        last_error: null,
      })
      .eq("id", jobId);

    await supabase
      .from("connected_accounts")
      .update({ last_auto_refresh_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("platform", "twitch");

    // StreamScore history snapshot (idempotent on analysis_job_id).
    await persistStreamScoreSnapshot({
      userId,
      analysisJobId: jobId,
      report,
    });

    return { ok: true, reportId: saved.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supabase
      .from("analysis_jobs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        last_error: message,
      })
      .eq("id", jobId);
    return { ok: false, error: message };
  }
}

/**
 * Find a pending queued job for this connected account, claim it, and run
 * the pipeline. Returns null if there is nothing to do.
 */
export async function processPendingForAccount(
  userId: string,
  platformUserId: string,
  platformLogin: string,
  platformDisplayName: string | null,
): Promise<ProcessQueuedJobResult | null> {
  const { data: job } = await supabase
    .from("analysis_jobs")
    .select("id, status")
    .eq("user_id", userId)
    .eq("platform", "twitch")
    .eq("platform_user_id", platformUserId)
    .eq("status", "queued")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!job) return null;

  return processQueuedJob({
    jobId: job.id,
    userId,
    platformUserId,
    platformLogin,
    platformDisplayName,
  });
}

/**
 * Ask the backend to enqueue a refresh job for the current user's
 * connected Twitch account (manual fallback OR first-run automatic).
 */
export async function enqueueRefreshForSelf(
  triggerSource: "manual" | "auto_first" = "manual",
): Promise<{ ok: boolean; jobId?: string; error?: string }> {
  const { data, error } = await supabase.functions.invoke("twitch-refresh-enqueue", {
    body: { mode: "self", trigger_source: triggerSource },
  });
  if (error) return { ok: false, error: error.message };
  const result = data as { success?: boolean; job_id?: string; error?: string };
  if (!result?.success) return { ok: false, error: result?.error };
  return { ok: true, jobId: result.job_id };
}
