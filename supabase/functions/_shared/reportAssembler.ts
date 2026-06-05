// Server-side port of src/services/reportAssembler.ts
//
// Produces an analysis_reports.report_data payload that the existing
// frontend Dashboard / ResultPage already knows how to render.
//
// Scope of this port (Livraison A):
//   - score + breakdown        (via shared streamScoreEngine)
//   - recommendations          (via shared recommendationEngine)
//   - weak_point + next_best_action (forces Contenu / "1 clip" when applicable)
//   - channel_summary + identity   (from twitch profile fetched server-side)
//   - affiliate_progress
//   - competitor_groups: []     (kept empty for now — Result page tolerates,
//                                Dashboard does not display them)
//   - facts (raw ChannelFact list, identical to frontend factsEngine)
//
// Not yet ported (deferred to Livraison A.2):
//   - competitor matching (competitorEngine + watchlist + snapshots)
//   - weekly action plan (weeklyActions/*)
// These remain enrichable by the frontend if needed; the Dashboard score
// and blocking-point UI work without them.

import {
  extractChannelFacts,
  type SharedChannelFactFull,
  type SharedLiveSessionFact,
  type SharedTwitchClip,
  type SharedTwitchVideo,
} from "./factsEngine.ts";
import {
  computeStreamScore,
  normalizeChannelFacts,
  type SharedStreamScore,
} from "./streamScoreEngine.ts";
import {
  generateRecommendations,
  type SharedRecommendation,
} from "./recommendationEngine.ts";

export interface ServerReportIdentity {
  platform: string;
  platform_user_id: string | null;
  platform_login: string;
  display_name: string;
  avatar_url: string | null;
  is_demo: boolean;
}

export interface ServerChannelSummary {
  channel_name: string;
  display_name: string;
  category: string;
  avg_viewers: number;
  broadcaster_type: string;
  follower_count: number;
  followers_available: boolean;
  followers_missing_scope: boolean;
  description: string;
  is_partial: boolean;
  is_live: boolean;
  live_viewer_count: number | null;
  live_title: string | null;
}

export interface ServerAffiliateProgress {
  followers: { current: number | null; target: number; available: boolean };
  avg_viewers: { current: number; target: number };
  stream_days: { current: number; target: number };
  stream_hours: { current: number; target: number };
  unique_chatters: { current: number; target: number };
}

export interface ServerWeeklyAction {
  position: number;
  title: string;
  reason: string;
  action: string;
  category: string;
  source: "next-action" | "priority";
}

export interface ServerAnalysisReport {
  job_id: string;
  identity: ServerReportIdentity;
  channel_summary: ServerChannelSummary;
  facts: SharedChannelFactFull[];
  score: SharedStreamScore;
  affiliate_progress: ServerAffiliateProgress;
  competitor_groups: unknown[];
  competitor_groups_enabled: boolean;
  recommendations: SharedRecommendation[];
  weak_point: { label: string; description: string };
  next_best_action: SharedRecommendation;
  weekly_actions: ServerWeeklyAction[];
  videos: SharedTwitchVideo[];
  meta: {
    assembled_by: "process-analysis-job";
    assembled_at: string;
    schema_version: 2;
  };
}

export interface AssembleArgs {
  jobId: string;
  profile: {
    login: string;
    display_name: string;
    follower_count?: number | null;
    followers_available?: boolean | null;
    broadcaster_type?: string;
    description?: string;
    profile_image_url?: string | null;
  };
  videos: SharedTwitchVideo[];
  clips: SharedTwitchClip[];
  liveSessions: SharedLiveSessionFact[];
  platformUserId: string | null;
}

export function assembleServerReport(args: AssembleArgs): ServerAnalysisReport {
  const { jobId, profile, videos, clips, liveSessions, platformUserId } = args;

  const identity: ServerReportIdentity = {
    platform: "twitch",
    platform_user_id: platformUserId,
    platform_login: profile.login,
    display_name: profile.display_name || profile.login,
    avatar_url: profile.profile_image_url ?? null,
    is_demo: false,
  };

  const facts = extractChannelFacts(profile, videos, clips, liveSessions);
  const normalized = normalizeChannelFacts(facts);
  const score = computeStreamScore(normalized);
  const recommendations = generateRecommendations(score, facts);

  const getFact = (key: string) => facts.find((f) => f.key === key);
  const rawCat = getFact("dominant_category")?.value as string | undefined;
  const dominantCat =
    rawCat && typeof rawCat === "string" && rawCat !== "unknown" && rawCat.trim() !== ""
      ? rawCat
      : "";
  const avgViewers = Number(getFact("avg_viewers")?.value ?? 0);

  const followersAvailable = profile.followers_available ?? true;
  const followersValue = followersAvailable ? (profile.follower_count ?? 0) : 0;

  const channel_summary: ServerChannelSummary = {
    channel_name: identity.platform_login,
    display_name: identity.display_name,
    category: dominantCat,
    avg_viewers: avgViewers,
    broadcaster_type: profile.broadcaster_type || "none",
    follower_count: followersValue,
    followers_available: followersAvailable,
    followers_missing_scope: false,
    description: profile.description || "",
    is_partial: false,
    is_live: false,
    live_viewer_count: null,
    live_title: null,
  };

  const affiliate_progress: ServerAffiliateProgress = {
    followers: {
      current: followersAvailable ? followersValue : null,
      target: 50,
      available: followersAvailable,
    },
    avg_viewers: { current: avgViewers, target: 3 },
    stream_days: {
      current: Number(getFact("unique_stream_days_30d")?.value ?? 0),
      target: 7,
    },
    stream_hours: {
      current: Number(getFact("total_hours_30d")?.value ?? 0),
      target: 8,
    },
    unique_chatters: { current: Math.round(avgViewers * 1.2), target: 50 },
  };

  const weakest = [...score.breakdown].sort((a, b) => a.score - b.score)[0];
  const clipsCount = Number(getFact("clips_30d")?.value ?? 0);
  const streamsCount = Number(getFact("streams_30d")?.value ?? 0);
  const forceContentBlock = clipsCount === 0 && streamsCount >= 1;
  const weak_point = forceContentBlock
    ? {
        label: "Contenu",
        description: "Transforme ton dernier live en au moins 1 clip publiable.",
      }
    : {
        label: weakest?.dimension ?? "Général",
        description: weakest?.reasons[0] ?? "Continue sur ta lancée.",
      };

  const nextAction = recommendations.find((r) => r.type === "next-action")!;
  const priorityActions = recommendations.filter((r) => r.type === "priority").slice(0, 3);

  const weeklyActions: ServerWeeklyAction[] = [];
  // Always seed weekly actions with the next-best-action first.
  weeklyActions.push({
    position: 1,
    title: nextAction.title,
    reason: nextAction.reason,
    action: nextAction.action,
    category: nextAction.category,
    source: "next-action",
  });
  priorityActions.forEach((p, i) => {
    if (weeklyActions.find((w) => w.title === p.title)) return;
    weeklyActions.push({
      position: weeklyActions.length + 1,
      title: p.title,
      reason: p.reason,
      action: p.action,
      category: p.category,
      source: "priority",
    });
  });

  return {
    job_id: jobId,
    identity,
    channel_summary,
    facts,
    score,
    affiliate_progress,
    competitor_groups: [],
    competitor_groups_enabled: false,
    recommendations,
    weak_point,
    next_best_action: nextAction,
    weekly_actions: weeklyActions.slice(0, 3),
    videos,
    meta: {
      assembled_by: "process-analysis-job",
      assembled_at: new Date().toISOString(),
      schema_version: 2,
    },
  };
}
