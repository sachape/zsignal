import type {
  MockStreamerData,
  AnalysisReport,
  ChannelSummary,
  AffiliateProgress,
  ReportIdentity,
  CompetitorGroup,
} from "@/types/analysis";
import { extractChannelFacts } from "./factsEngine";
import { computeStreamScore } from "./streamScoreEngine";
import { generateRecommendations } from "./recommendationEngine";
import { findCompetitors } from "./competitorEngine";

export interface ReportIdentityOverrides {
  platform?: string | null;
  platform_user_id?: string | null;
  platform_login?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  is_demo?: boolean;
}

/**
 * Teaser-only overrides used when assembling a public-data report.
 *
 * - `is_partial`: marks the channel summary as a public teaser so the UI
 *   displays "données publiques limitées" framing + the unlock CTA.
 * - `live`: real Twitch live snapshot (Get Streams) for honest live KPI.
 * - `competitor_groups`: real public competitors from /search/channels —
 *   replaces the mock pool used in connected-account mode.
 * - `dominant_category_override`: real game name resolved server-side.
 */
export interface TeaserOverrides {
  is_partial?: boolean;
  live?: {
    title: string;
    game_name: string | null;
    viewer_count: number;
    started_at: string;
  } | null;
  competitor_groups?: CompetitorGroup[];
  dominant_category_override?: string | null;
}

export function assembleReport(
  data: MockStreamerData,
  jobId: string,
  identityOverrides?: ReportIdentityOverrides,
  teaserOverrides?: TeaserOverrides,
): AnalysisReport {
  const { profile, videos, clips } = data;

  const identity: ReportIdentity = {
    platform: identityOverrides?.platform ?? "twitch",
    platform_user_id:
      identityOverrides?.platform_user_id ?? profile.twitch_user_id ?? null,
    platform_login: identityOverrides?.platform_login ?? profile.login,
    display_name: identityOverrides?.display_name ?? profile.display_name,
    avatar_url: identityOverrides?.avatar_url ?? profile.profile_image_url ?? null,
    is_demo: identityOverrides?.is_demo ?? false,
  };

  const facts = extractChannelFacts(profile, videos, clips);
  const score = computeStreamScore(facts);
  const recommendations = generateRecommendations(score, facts);
  const competitor_groups =
    teaserOverrides?.competitor_groups ?? findCompetitors(profile, facts);

  const getFact = (key: string) => facts.find((f) => f.key === key);
  const rawCat =
    teaserOverrides?.dominant_category_override ??
    (getFact("dominant_category")?.value as string | undefined) ??
    null;
  const dominantCat =
    rawCat && typeof rawCat === "string" && rawCat !== "unknown" && rawCat.trim() !== ""
      ? rawCat
      : "";
  const avgViewers = Number(getFact("avg_viewers")?.value ?? 0);

  const followersAvailable = profile.followers_available ?? true;
  const followersValue = followersAvailable ? profile.follower_count : 0;

  const channel_summary: ChannelSummary = {
    channel_name: identity.platform_login,
    display_name: identity.display_name,
    category: dominantCat,
    avg_viewers: avgViewers,
    broadcaster_type: profile.broadcaster_type || "none",
    follower_count: followersValue,
    followers_available: followersAvailable,
    followers_missing_scope: profile.followers_missing_scope ?? false,
    description: profile.description,
    is_partial: teaserOverrides?.is_partial ?? false,
    is_live: !!teaserOverrides?.live,
    live_viewer_count: teaserOverrides?.live?.viewer_count ?? null,
    live_title: teaserOverrides?.live?.title ?? null,
  };

  const affiliate_progress: AffiliateProgress = {
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
  const weak_point = {
    label: weakest?.dimension ?? "Général",
    description: weakest?.reasons[0] ?? "Continue sur ta lancée.",
  };

  const nextAction = recommendations.find((r) => r.type === "next-action")!;

  return {
    job_id: jobId,
    identity,
    channel_summary,
    facts,
    score,
    affiliate_progress,
    competitor_groups,
    recommendations,
    weak_point,
    next_best_action: nextAction,
    videos,
  };
}
