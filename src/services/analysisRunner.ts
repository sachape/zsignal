import { supabase } from "@/integrations/supabase/client";
import { assembleReport } from "./reportAssembler";
import { resolveAnalysisDataset } from "./liveReportSource";
import { fetchLiveTwitchProfile } from "./twitchLiveProfile";
import { buildCompetitorGroups, type CandidateChannel, type TargetSignal } from "./competitorEngine";
import { persistStreamScoreSnapshot } from "./streamScoreSnapshot";
import type { AnalysisReport } from "@/types/analysis";

export type JobStage =
  | "pending"
  | "loading_data"
  | "computing_facts"
  | "scoring"
  | "matching_competitors"
  | "generating_recommendations"
  | "saving"
  | "completed"
  | "failed";

export interface RunAnalysisOptions {
  channelName: string;
  userId: string;
  platform?: string | null;
  platformUserId?: string | null;
  platformLogin?: string | null;
  platformDisplayName?: string | null;
  onStage?: (stage: JobStage) => void;
}

export interface RunAnalysisResult {
  jobId: string;
  reportId: string;
  report: AnalysisReport;
}

export async function runAnalysis({
  channelName,
  userId,
  platform,
  platformUserId,
  platformLogin,
  platformDisplayName,
  onStage,
}: RunAnalysisOptions): Promise<RunAnalysisResult> {
  onStage?.("pending");

  const canonicalLogin = (platformLogin ?? channelName).trim().toLowerCase();
  const canonicalDisplayName =
    platformDisplayName?.trim() || platformLogin?.trim() || channelName.trim();

  const isLive = platform === "twitch" && !!platformUserId;

  const { data: job, error: jobErr } = await supabase
    .from("analysis_jobs")
    .insert({
      user_id: userId,
      channel_name: canonicalLogin,
      status: "processing",
      started_at: new Date().toISOString(),
      platform: platform ?? null,
      platform_user_id: platformUserId ?? null,
      platform_login: platformLogin ?? null,
    })
    .select()
    .single();

  if (jobErr || !job) {
    throw new Error(`Impossible de créer la tâche d'analyse: ${jobErr?.message}`);
  }

  try {
    onStage?.("loading_data");

    let liveProfile: Awaited<ReturnType<typeof fetchLiveTwitchProfile>> | null = null;
    if (isLive) {
      liveProfile = await fetchLiveTwitchProfile();
    }

    const data = resolveAnalysisDataset({
      login: canonicalLogin,
      displayName: canonicalDisplayName,
      platformUserId,
      liveOnly: isLive,
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
    await sleep(150);

    // Source of truth for "lives 30j" is live_sessions, not Twitch VOD
    // archive (which may be empty if VOD is disabled or not yet published).
    const since30 = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data: liveSessionsRows } = isLive && platformUserId
      ? await supabase
          .from("live_sessions")
          .select("started_at, ended_at, duration_minutes, avg_viewers, peak_viewers, snapshots_count")
          .eq("user_id", userId)
          .eq("platform", "twitch")
          .eq("platform_user_id", platformUserId)
          .gte("started_at", since30)
      : { data: [] as Array<{ started_at: string }> };
    const liveSessions = (liveSessionsRows ?? []) as Array<{
      started_at: string;
      ended_at?: string | null;
      duration_minutes?: number | null;
      avg_viewers?: number | null;
      peak_viewers?: number | null;
      snapshots_count?: number | null;
    }>;

    onStage?.("computing_facts");
    await sleep(200);
    onStage?.("scoring");
    await sleep(200);
    onStage?.("matching_competitors");
    await sleep(200);
    onStage?.("generating_recommendations");
    await sleep(150);

    // Real competitor groups for live mode (server-fetched from
    // /search/channels via twitch-live-fetch).
    const competitorGroups = isLive && liveProfile
      ? buildCompetitorGroups({
          target: {
            login: canonicalLogin,
            language: "fr",
            dominant_category: liveProfile.dominant_category ?? null,
            recent_titles: liveProfile.videos.slice(0, 10).map((v) => v.title),
            channel_type: "solo",
            content_format: "unknown",
            size_proxy: liveProfile.profile?.view_count ?? 0,
          } satisfies TargetSignal,
          candidates: liveProfile.competitors.map<CandidateChannel>((c) => ({
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
        })
      : undefined;

    const report = assembleReport(data, job.id, {
      platform: platform ?? null,
      platform_user_id: platformUserId ?? null,
      platform_login: canonicalLogin,
      display_name: canonicalDisplayName,
      avatar_url:
        liveProfile?.profile?.profile_image_url || data.profile.profile_image_url || null,
      is_demo: !platformUserId,
    }, isLive ? {
      live: liveProfile?.live
        ? {
            title: liveProfile.live.title,
            game_name: liveProfile.live.game_name,
            viewer_count: liveProfile.live.viewer_count,
            started_at: liveProfile.live.started_at,
          }
        : null,
      competitor_groups: competitorGroups && competitorGroups.length > 0
        ? competitorGroups
        : [],
      dominant_category_override: liveProfile?.dominant_category ?? null,
    } : undefined);

    onStage?.("saving");
    const { data: saved, error: repErr } = await supabase
      .from("analysis_reports")
      .insert({
        analysis_job_id: job.id,
        user_id: userId,
        channel_summary: `${report.channel_summary.display_name} · ${report.channel_summary.category} · Score ${report.score.overall}`,
        report_data: report as never,
      })
      .select()
      .single();

    if (repErr || !saved) {
      throw new Error(`Échec de sauvegarde du rapport: ${repErr?.message}`);
    }

    await supabase
      .from("analysis_jobs")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", job.id);

    // StreamScore history snapshot (idempotent on analysis_job_id).
    await persistStreamScoreSnapshot({
      userId,
      analysisJobId: job.id,
      report,
    });

    onStage?.("completed");

    return { jobId: job.id, reportId: saved.id, report };
  } catch (err) {
    await supabase
      .from("analysis_jobs")
      .update({ status: "failed", completed_at: new Date().toISOString() })
      .eq("id", job.id);
    onStage?.("failed");
    throw err;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
