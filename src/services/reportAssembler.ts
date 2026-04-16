import type { MockStreamerData, AnalysisReport, ChannelSummary, AffiliateProgress } from "@/types/analysis";
import { extractChannelFacts } from "./factsEngine";
import { computeStreamScore } from "./streamScoreEngine";
import { generateRecommendations } from "./recommendationEngine";
import { findCompetitors } from "./competitorEngine";

export function assembleReport(data: MockStreamerData, jobId: string): AnalysisReport {
  const { profile, videos, clips } = data;

  // 1. Extract facts
  const facts = extractChannelFacts(profile, videos, clips);

  // 2. Compute score
  const score = computeStreamScore(facts);

  // 3. Recommendations
  const recommendations = generateRecommendations(score, facts);

  // 4. Competitors
  const competitor_groups = findCompetitors(profile, facts);

  // 5. Channel summary
  const getFact = (key: string) => facts.find((f) => f.key === key);
  const dominantCat = String(getFact("dominant_category")?.value ?? "Variété");
  const avgViewers = Number(getFact("avg_viewers")?.value ?? 0);

  const channel_summary: ChannelSummary = {
    channel_name: profile.login,
    display_name: profile.display_name,
    category: dominantCat,
    avg_viewers: avgViewers,
    broadcaster_type: profile.broadcaster_type || "none",
    follower_count: profile.follower_count,
    description: profile.description,
  };

  // 6. Affiliate progress
  const affiliate_progress: AffiliateProgress = {
    followers: { current: profile.follower_count, target: 50 },
    avg_viewers: { current: avgViewers, target: 3 },
    stream_days: { current: Number(getFact("unique_stream_days_30d")?.value ?? 0), target: 7 },
    stream_hours: { current: Number(getFact("total_hours_30d")?.value ?? 0), target: 8 },
    unique_chatters: { current: Math.round(avgViewers * 1.2), target: 50 },
  };

  // 7. Weak point = lowest score dimension
  const weakest = [...score.breakdown].sort((a, b) => a.score - b.score)[0];
  const weak_point = {
    label: weakest?.dimension ?? "Général",
    description: weakest?.reasons[0] ?? "Continue sur ta lancée.",
  };

  // 8. Next best action
  const nextAction = recommendations.find((r) => r.type === "next-action")!;

  return {
    job_id: jobId,
    channel_summary,
    facts,
    score,
    affiliate_progress,
    competitor_groups,
    recommendations,
    weak_point,
    next_best_action: nextAction,
  };
}
