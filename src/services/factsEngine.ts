import type { TwitchProfile, TwitchVideo, TwitchClip, ChannelFact } from "@/types/analysis";

/** Parse Twitch duration ("2h13m4s", "45m12s", "1h", "30s") → minutes. */
function parseDuration(d: string): number {
  if (!d) return 0;
  const h = d.match(/(\d+)h/);
  const m = d.match(/(\d+)m/);
  const s = d.match(/(\d+)s/);
  return (
    (h ? parseInt(h[1], 10) * 60 : 0) +
    (m ? parseInt(m[1], 10) : 0) +
    (s ? parseInt(s[1], 10) / 60 : 0)
  );
}

function daysBetween(a: string, b: string): number {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 86400000;
}

function uniqueValues<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

export interface LiveSessionFact {
  started_at: string;
  ended_at?: string | null;
  duration_minutes?: number | null;
  avg_viewers?: number | null;
  peak_viewers?: number | null;
  snapshots_count?: number | null;
}

export function extractChannelFacts(
  profile: TwitchProfile,
  videos: TwitchVideo[],
  clips: TwitchClip[],
  liveSessions: LiveSessionFact[] = []
): ChannelFact[] {
  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * 86400000);
  const d30 = new Date(now.getTime() - 30 * 86400000);

  const videos7d = videos.filter((v) => new Date(v.created_at) >= d7);
  const videos30d = videos.filter((v) => new Date(v.created_at) >= d30);
  const clips30d = clips.filter((c) => new Date(c.created_at) >= d30);

  // Source of truth for "lives / sessions" is live_sessions when present.
  // VODs are a fallback: a streamer may have VOD storage disabled or the
  // VOD may not be published yet right after a live ends.
  const lives7d = liveSessions.filter((s) => new Date(s.started_at) >= d7);
  const lives30d = liveSessions.filter((s) => new Date(s.started_at) >= d30);
  const liveHours30d =
    lives30d.reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0) / 60;
  const liveDays30d = uniqueValues(
    lives30d.map((s) => new Date(s.started_at).toISOString().slice(0, 10)),
  );
  const liveAvgViewersSamples = lives30d
    .map((s) => s.avg_viewers)
    .filter((v): v is number => typeof v === "number" && v >= 0 && (v > 0 || (lives30d.find((x) => x.avg_viewers === v)?.snapshots_count ?? 0) > 0));
  const livePeakViewersSamples = lives30d
    .map((s) => s.peak_viewers)
    .filter((v): v is number => typeof v === "number" && v >= 0);
  const liveAvgViewers = liveAvgViewersSamples.length
    ? Math.round(liveAvgViewersSamples.reduce((a, b) => a + b, 0) / liveAvgViewersSamples.length)
    : null;
  const livePeakViewers = livePeakViewersSamples.length
    ? Math.max(...livePeakViewersSamples)
    : null;

  const vodDurations = videos30d.map((v) => parseDuration(v.duration));
  const avgDurationVod = vodDurations.length ? vodDurations.reduce((a, b) => a + b, 0) / vodDurations.length : 0;
  const totalHoursVod30d = vodDurations.reduce((a, b) => a + b, 0) / 60;
  const avgDurationLive = lives30d.length
    ? lives30d.reduce((a, s) => a + (s.duration_minutes ?? 0), 0) / lives30d.length
    : 0;
  const avgDuration = Math.max(avgDurationVod, avgDurationLive);
  const totalHours30d = Math.max(totalHoursVod30d, liveHours30d);

  // Category analysis from clip game_ids
  const categories = clips.map((c) => c.game_id).filter(Boolean);
  const catCounts: Record<string, number> = {};
  categories.forEach((c) => { catCounts[c] = (catCounts[c] || 0) + 1; });
  const dominant = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0];
  const dominantCategory = dominant ? dominant[0] : "";
  const uniqueCategories = uniqueValues(categories);
  const switchRate = uniqueCategories.length > 1 ? (uniqueCategories.length - 1) / Math.max(categories.length - 1, 1) : 0;

  // Consistency: days between consecutive streams in last 30d.
  // Days come from the union of VOD created_at + live_session started_at,
  // so a live with no VOD still counts.
  const streamDates = videos30d.map((v) => new Date(v.created_at).toISOString().slice(0, 10));
  const uniqueDays = uniqueValues([...streamDates, ...liveDays30d]).sort();
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

  // Effective stream counts: lives are source of truth, VODs are fallback.
  const effectiveStreams30d = Math.max(videos30d.length, lives30d.length);
  const effectiveStreams7d = Math.max(videos7d.length, lives7d.length);

  // Viewers metric: prefer real live_sessions avg/peak when at least one
  // session has snapshot-backed data. Otherwise fall back to the legacy
  // VOD view_count proxy (honestly labeled). Never show 0 as a real value
  // when the underlying source is missing.
  const hasLiveViewerSignal =
    lives30d.some((s) => (s.snapshots_count ?? 0) > 0 && typeof s.avg_viewers === "number");
  const avgVodViews = videos30d.length
    ? Math.round(videos30d.reduce((a, v) => a + v.view_count, 0) / videos30d.length)
    : 0;
  const vodViewsConfidence = videos30d.length >= 6 ? 0.6 : videos30d.length >= 3 ? 0.4 : 0.2;
  const avgViewersValue = hasLiveViewerSignal && liveAvgViewers !== null
    ? liveAvgViewers
    : avgVodViews;
  const avgViewersConfidence = hasLiveViewerSignal ? 0.9 : vodViewsConfidence;
  const avgViewersLabel = hasLiveViewerSignal
    ? "Viewers moyens (sessions live)"
    : "Vues moyennes par VOD (30j)";

  const followersAvailable = profile.followers_available ?? true;
  const followersValue = followersAvailable ? profile.follower_count : 0;

  // Affiliate thresholds
  const AFFILIATE = { followers: 50, avg_viewers: 3, stream_days_30d: 7, stream_hours_30d: 8 };

  const hasDescription = !!(profile.description && profile.description.trim().length > 0) ? 1 : 0;
  const hasAvatar = !!(profile.profile_image_url && profile.profile_image_url.trim().length > 0) ? 1 : 0;

  const facts: ChannelFact[] = [
    { key: "streams_7d", value: effectiveStreams7d, label: "Streams (7 derniers jours)", confidence: 1 },
    { key: "streams_30d", value: effectiveStreams30d, label: "Streams (30 derniers jours)", confidence: 1 },
    { key: "lives_30d", value: lives30d.length, label: "Lives détectés (30j)", confidence: 1 },
    { key: "lives_7d", value: lives7d.length, label: "Lives détectés (7j)", confidence: 1 },
    { key: "vods_30d", value: videos30d.length, label: "VODs publiées (30j)", confidence: 1 },
    { key: "clips_30d", value: clips30d.length, label: "Clips (30 derniers jours)", confidence: 1 },
    { key: "exported_clips_30d", value: 0, label: "Clips exportés (30j)", confidence: 0.5 },
    { key: "connected_social_accounts_count", value: 0, label: "Réseaux sociaux connectés", confidence: 0.5 },
    { key: "has_description", value: hasDescription, label: "Bio renseignée", confidence: 1 },
    { key: "has_avatar", value: hasAvatar, label: "Avatar renseigné", confidence: 1 },
    { key: "avg_duration_minutes", value: Math.round(avgDuration), label: "Durée moyenne (min)", confidence: 1 },
    { key: "total_hours_30d", value: Math.round(totalHours30d * 10) / 10, label: "Heures streamées (30j)", confidence: 1 },
    { key: "dominant_category", value: dominantCategory, label: "Catégorie dominante", confidence: dominant ? 0.9 : 0.3 },
    { key: "category_switch_rate", value: Math.round(switchRate * 100), label: "Taux de changement de catégorie (%)", confidence: 0.8 },
    { key: "posting_consistency_score", value: consistencyScore, label: "Score de régularité", confidence: uniqueDays.length >= 3 ? 0.9 : 0.5 },
    { key: "avg_vod_views_30d", value: avgVodViews, label: "Vues moyennes par VOD (30j)", confidence: vodViewsConfidence },
    { key: "avg_viewers", value: avgViewersValue, label: avgViewersLabel, confidence: avgViewersConfidence },
    { key: "live_avg_viewers", value: liveAvgViewers ?? 0, label: "Viewers moyens (live)", confidence: hasLiveViewerSignal ? 0.9 : 0 },
    { key: "live_peak_viewers", value: livePeakViewers ?? 0, label: "Pic de viewers (live)", confidence: livePeakViewers !== null ? 0.9 : 0 },
    { key: "follower_count", value: followersValue, label: "Followers", confidence: followersAvailable ? 1 : 0 },
    { key: "followers_available", value: followersAvailable ? 1 : 0, label: "Followers disponibles", confidence: 1 },
    { key: "followers_remaining", value: followersAvailable ? Math.max(0, AFFILIATE.followers - followersValue) : 0, label: "Followers restants (affilié)", confidence: followersAvailable ? 1 : 0 },
    { key: "avg_viewers_remaining", value: Math.max(0, AFFILIATE.avg_viewers - avgViewersValue), label: "Viewers moyens restants (affilié)", confidence: avgViewersConfidence },
    { key: "stream_days_remaining", value: Math.max(0, AFFILIATE.stream_days_30d - uniqueDays.length), label: "Jours de stream restants (affilié)", confidence: 1 },
    { key: "stream_hours_remaining", value: Math.max(0, Math.round((AFFILIATE.stream_hours_30d - totalHours30d) * 10) / 10), label: "Heures restantes (affilié)", confidence: 1 },
    { key: "unique_stream_days_30d", value: uniqueDays.length, label: "Jours uniques streamés (30j)", confidence: 1 },
  ];

  return facts;
}
