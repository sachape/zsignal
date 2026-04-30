import type { TwitchProfile, TwitchVideo, TwitchClip, ChannelFact } from "@/types/analysis";

/** Parse "3h15m" → minutes */
function parseDuration(d: string): number {
  const h = d.match(/(\d+)h/);
  const m = d.match(/(\d+)m/);
  return (h ? parseInt(h[1]) * 60 : 0) + (m ? parseInt(m[1]) : 0);
}

function daysBetween(a: string, b: string): number {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 86400000;
}

function uniqueValues<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

export function extractChannelFacts(
  profile: TwitchProfile,
  videos: TwitchVideo[],
  clips: TwitchClip[]
): ChannelFact[] {
  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * 86400000);
  const d30 = new Date(now.getTime() - 30 * 86400000);

  const videos7d = videos.filter((v) => new Date(v.created_at) >= d7);
  const videos30d = videos.filter((v) => new Date(v.created_at) >= d30);
  const clips30d = clips.filter((c) => new Date(c.created_at) >= d30);

  const durations = videos30d.map((v) => parseDuration(v.duration));
  const avgDuration = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
  const totalHours30d = durations.reduce((a, b) => a + b, 0) / 60;

  // Category analysis from clip game_ids
  const categories = clips.map((c) => c.game_id).filter(Boolean);
  const catCounts: Record<string, number> = {};
  categories.forEach((c) => { catCounts[c] = (catCounts[c] || 0) + 1; });
  const dominant = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0];
  const dominantCategory = dominant ? dominant[0] : "";
  const uniqueCategories = uniqueValues(categories);
  const switchRate = uniqueCategories.length > 1 ? (uniqueCategories.length - 1) / Math.max(categories.length - 1, 1) : 0;

  // Consistency: days between consecutive streams in last 30d
  const streamDates = videos30d.map((v) => new Date(v.created_at).toISOString().slice(0, 10));
  const uniqueDays = uniqueValues(streamDates).sort();
  let consistencyScore = 0;
  if (uniqueDays.length >= 2) {
    const gaps = [];
    for (let i = 1; i < uniqueDays.length; i++) {
      gaps.push(daysBetween(uniqueDays[i], uniqueDays[i - 1]));
    }
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const variance = gaps.reduce((a, b) => a + Math.pow(b - avgGap, 2), 0) / gaps.length;
    const stdDev = Math.sqrt(variance);
    consistencyScore = Math.max(0, Math.min(100, Math.round(100 - stdDev * 15)));
  }

  // VOD-derived avg view metric. NOT a live concurrent viewers count.
  // The label is intentionally honest: "Vues moyennes par VOD (30j)".
  // Influenced by rebroadcasts, raids, events. Confidence is low when the
  // VOD pool is small.
  const avgVodViews = videos30d.length
    ? Math.round(videos30d.reduce((a, v) => a + v.view_count, 0) / videos30d.length)
    : 0;
  const vodViewsConfidence = videos30d.length >= 6 ? 0.6 : videos30d.length >= 3 ? 0.4 : 0.2;

  const followersAvailable = profile.followers_available ?? true;
  const followersValue = followersAvailable ? profile.follower_count : 0;

  // Affiliate thresholds
  const AFFILIATE = { followers: 50, avg_viewers: 3, stream_days_30d: 7, stream_hours_30d: 8 };

  const facts: ChannelFact[] = [
    { key: "streams_7d", value: videos7d.length, label: "Streams (7 derniers jours)", confidence: 1 },
    { key: "streams_30d", value: videos30d.length, label: "Streams (30 derniers jours)", confidence: 1 },
    { key: "clips_30d", value: clips30d.length, label: "Clips (30 derniers jours)", confidence: 1 },
    { key: "avg_duration_minutes", value: Math.round(avgDuration), label: "Durée moyenne (min)", confidence: 1 },
    { key: "total_hours_30d", value: Math.round(totalHours30d * 10) / 10, label: "Heures streamées (30j)", confidence: 1 },
    { key: "dominant_category", value: dominantCategory, label: "Catégorie dominante", confidence: dominant ? 0.9 : 0.3 },
    { key: "category_switch_rate", value: Math.round(switchRate * 100), label: "Taux de changement de catégorie (%)", confidence: 0.8 },
    { key: "posting_consistency_score", value: consistencyScore, label: "Score de régularité", confidence: uniqueDays.length >= 3 ? 0.9 : 0.5 },
    // Honest naming: this is the average view_count of recent VODs, not a
    // live concurrent viewer count. The legacy `avg_viewers` key is kept
    // for backward compatibility in the report payload.
    { key: "avg_vod_views_30d", value: avgVodViews, label: "Vues moyennes par VOD (30j)", confidence: vodViewsConfidence },
    { key: "avg_viewers", value: avgVodViews, label: "Vues moyennes par VOD (30j)", confidence: vodViewsConfidence },
    { key: "follower_count", value: followersValue, label: "Followers", confidence: followersAvailable ? 1 : 0 },
    { key: "followers_available", value: followersAvailable ? 1 : 0, label: "Followers disponibles", confidence: 1 },
    { key: "followers_remaining", value: followersAvailable ? Math.max(0, AFFILIATE.followers - followersValue) : 0, label: "Followers restants (affilié)", confidence: followersAvailable ? 1 : 0 },
    { key: "avg_viewers_remaining", value: Math.max(0, AFFILIATE.avg_viewers - avgVodViews), label: "Viewers moyens restants (affilié)", confidence: vodViewsConfidence },
    { key: "stream_days_remaining", value: Math.max(0, AFFILIATE.stream_days_30d - uniqueDays.length), label: "Jours de stream restants (affilié)", confidence: 1 },
    { key: "stream_hours_remaining", value: Math.max(0, Math.round((AFFILIATE.stream_hours_30d - totalHours30d) * 10) / 10), label: "Heures restantes (affilié)", confidence: 1 },
    { key: "unique_stream_days_30d", value: uniqueDays.length, label: "Jours uniques streamés (30j)", confidence: 1 },
  ];

  return facts;
}
