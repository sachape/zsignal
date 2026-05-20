// Short content planner — reads existing twitch_clip_snapshots and
// returns a ranked, label-annotated view of clips the streamer can
// recycle into short-form content (TikTok / Reels / Shorts).
//
// Strict rules:
//  - Read-only. No new tables, no new edge functions.
//  - Honest labels. Never inflate a weak clip.
//  - User-scoped (RLS already restricts to auth.uid()).
//  - Resilient to missing fields (duration, is_featured, etc.).

import { supabase } from "@/integrations/supabase/client";

/** Raw row read from twitch_clip_snapshots. */
export interface ClipRow {
  id: string;
  twitch_clip_id: string;
  broadcaster_id: string;
  video_id: string | null;
  game_id: string | null;
  title: string | null;
  view_count: number | null;
  clip_created_at: string;
  duration: number | null;
  vod_offset: number | null;
  is_featured: boolean | null;
  thumbnail_url: string | null;
  url: string | null;
}

export type PotentialLabel =
  | "high"
  | "good"
  | "rework"
  | "weak";

export const POTENTIAL_LABEL_FR: Record<PotentialLabel, string> = {
  high: "Potentiel élevé",
  good: "Potentiel correct",
  rework: "À retravailler",
  weak: "Signal faible",
};

export interface ClipInsight {
  clip: ClipRow;
  /** Composite score 0-100. */
  score: number;
  label: PotentialLabel;
  /** Days since clip_created_at. */
  ageDays: number;
  /** Duration in seconds (0 if unknown). */
  durationSec: number;
  /** True if duration fits short-form sweet spot. */
  durationFit: boolean;
  /** True if the clip is recent and under-performing its peers. */
  isUnderused: boolean;
  /** Short human reason (FR) used in the UI as supporting text. */
  reason: string;
}

export interface ConnectedTwitchAccount {
  user_id: string;
  broadcaster_id: string;
  login: string | null;
}

const DEFAULT_LOOKBACK_DAYS = 14;
const RECENT_WINDOW_DAYS = 14;
const SWEET_SPOT_MIN = 15;
const SWEET_SPOT_MAX = 60;

/** Resolve the current user's connected Twitch broadcaster id. */
export async function loadConnectedTwitchAccount(
  userId: string,
): Promise<ConnectedTwitchAccount | null> {
  const { data, error } = await supabase
    .from("connected_accounts")
    .select("user_id, platform_user_id, platform_login")
    .eq("user_id", userId)
    .eq("platform", "twitch")
    .maybeSingle();
  if (error || !data?.platform_user_id) return null;
  return {
    user_id: data.user_id,
    broadcaster_id: data.platform_user_id,
    login: data.platform_login ?? null,
  };
}

/**
 * Load clip snapshots for the authenticated user.
 * RLS enforces user_id = auth.uid().
 */
export async function loadRecentClips(
  options: { lookbackDays?: number } = {},
): Promise<ClipRow[]> {
  const lookback = options.lookbackDays ?? DEFAULT_LOOKBACK_DAYS;
  const since = new Date(Date.now() - lookback * 86400000).toISOString();
  const { data, error } = await supabase
    .from("twitch_clip_snapshots")
    .select(
      "id, twitch_clip_id, broadcaster_id, video_id, game_id, title, view_count, clip_created_at, duration, vod_offset, is_featured, thumbnail_url, url",
    )
    .gte("clip_created_at", since)
    .order("clip_created_at", { ascending: false })
    .limit(200);
  if (error || !data) return [];
  return data as ClipRow[];
}

function daysBetween(iso: string): number {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 999;
  return Math.max(0, (Date.now() - t) / 86400000);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function scoreClip(row: ClipRow, ageDays: number): {
  score: number;
  durationSec: number;
  durationFit: boolean;
} {
  const views = Math.max(0, row.view_count ?? 0);
  // Views component (log-scaled, capped). 0 vues = 0 pts. ~50 vues = ~30, 300 = ~55, 1500 = ~75, 10k = ~95.
  const viewsPts = views <= 0 ? 0 : Math.min(95, Math.log10(views + 1) * 30);

  // Recency component. Fresh < 7d = full, decays to 0 after 21d.
  const recencyPts = ageDays <= 7
    ? 25
    : ageDays <= 14
      ? 18
      : ageDays <= 21
        ? 10
        : 0;

  // Duration component — sweet spot 15-60s.
  const durationSec = Math.max(0, row.duration ?? 0);
  let durationPts = 0;
  let durationFit = false;
  if (durationSec >= SWEET_SPOT_MIN && durationSec <= SWEET_SPOT_MAX) {
    durationPts = 15;
    durationFit = true;
  } else if (durationSec >= 8 && durationSec <= 90) {
    durationPts = 8;
  } else if (durationSec > 0) {
    durationPts = 2;
  }

  // Featured boost (Twitch's own signal).
  const featuredPts = row.is_featured ? 8 : 0;

  const total = Math.round(
    Math.min(100, viewsPts * 0.55 + recencyPts + durationPts + featuredPts),
  );
  return { score: total, durationSec, durationFit };
}

function labelFor(score: number, views: number): PotentialLabel {
  // Guardrail: a clip with very few views can never be "Potentiel élevé",
  // even if it ticks every other box (recent, sweet duration, featured).
  if (score >= 70 && views >= 150) return "high";
  if (score >= 45) return "good";
  if (score >= 22) return "rework";
  return "weak";
}

function reasonFor(args: {
  views: number;
  ageDays: number;
  durationFit: boolean;
  isUnderused: boolean;
  isFeatured: boolean;
  label: PotentialLabel;
}): string {
  const parts: string[] = [];
  if (args.isFeatured) parts.push("mis en avant par Twitch");
  if (args.views >= 200) parts.push(`${args.views} vues`);
  else if (args.views > 0) parts.push(`${args.views} vues seulement`);
  if (args.durationFit) parts.push("durée idéale pour TikTok");
  if (args.ageDays <= 3) parts.push("encore très récent");
  else if (args.ageDays <= 7) parts.push("publié cette semaine");

  if (args.isUnderused) {
    return parts.length > 0
      ? `Sous-exploité — ${parts.join(", ")}.`
      : "Sous-exploité — moins vu que les autres clips de ce live.";
  }

  if (parts.length === 0) {
    if (args.label === "weak") return "Signal trop faible pour conclure.";
    return "Données limitées, à confirmer.";
  }
  return parts.join(" · ") + ".";
}

function flagUnderused(insights: ClipInsight[]): void {
  // Group by video_id (same live). Fallback: bucket by ISO date.
  const groups = new Map<string, ClipInsight[]>();
  for (const ins of insights) {
    const key = ins.clip.video_id ?? ins.clip.clip_created_at.slice(0, 10);
    const arr = groups.get(key) ?? [];
    arr.push(ins);
    groups.set(key, arr);
  }
  for (const arr of groups.values()) {
    if (arr.length < 3) continue;
    const views = arr.map((i) => i.clip.view_count ?? 0);
    const med = median(views);
    if (med <= 2) continue;
    for (const ins of arr) {
      const v = ins.clip.view_count ?? 0;
      const fresh = ins.ageDays <= RECENT_WINDOW_DAYS;
      const usableDuration = ins.durationSec >= 10 && ins.durationSec <= 90;
      if (fresh && usableDuration && v > 0 && v < med * 0.4) {
        ins.isUnderused = true;
      }
    }
  }
}

export interface PlannerResult {
  insights: ClipInsight[];
  total: number;
  topPerformer: ClipInsight | null;
  underusedCount: number;
  highPotentialCount: number;
  /** Recommended format based on what the best clips look like. */
  recommendedFormat: string;
  /** Suggested publishing slot (template). */
  recommendedTiming: string;
}

/** Compute insights and a small summary view-model for the page. */
export function buildPlannerResult(clips: ClipRow[]): PlannerResult {
  const insights: ClipInsight[] = clips.map((clip) => {
    const ageDays = daysBetween(clip.clip_created_at);
    const { score, durationSec, durationFit } = scoreClip(clip, ageDays);
    const label = labelFor(score);
    return {
      clip,
      score,
      label,
      ageDays,
      durationSec,
      durationFit,
      isUnderused: false,
      reason: "",
    };
  });

  flagUnderused(insights);

  for (const ins of insights) {
    ins.reason = reasonFor({
      views: ins.clip.view_count ?? 0,
      ageDays: ins.ageDays,
      durationFit: ins.durationFit,
      isUnderused: ins.isUnderused,
      isFeatured: ins.clip.is_featured === true,
      label: ins.label,
    });
  }

  // Sort: featured first within score band, then score desc, then views desc.
  insights.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const af = a.clip.is_featured ? 1 : 0;
    const bf = b.clip.is_featured ? 1 : 0;
    if (bf !== af) return bf - af;
    return (b.clip.view_count ?? 0) - (a.clip.view_count ?? 0);
  });

  const topPerformer = insights[0] ?? null;
  const underusedCount = insights.filter((i) => i.isUnderused).length;
  const highPotentialCount = insights.filter(
    (i) => i.label === "high" || i.label === "good",
  ).length;

  const sweetSpotCount = insights.filter((i) => i.durationFit).length;
  const recommendedFormat = sweetSpotCount >= 2
    ? "Format vertical 9:16 — coupes nettes, 30 à 45 secondes."
    : insights.some((i) => i.durationSec > 60)
      ? "Recoupe tes meilleurs clips entre 30 et 45 secondes pour TikTok et Reels."
      : "Privilégie un format vertical 9:16 court (15-45 s) pour la découverte.";

  const recommendedTiming = "Publie en fin d'après-midi (17h-19h) ou en soirée (20h-22h), 1 plateforme à la fois.";

  return {
    insights,
    total: insights.length,
    topPerformer,
    underusedCount,
    highPotentialCount,
    recommendedFormat,
    recommendedTiming,
  };
}

export type ClipFilter = "all" | "high" | "underused" | "recent" | "rework";
export type ClipSort = "potential" | "views" | "recent" | "duration";

export function filterInsights(
  insights: ClipInsight[],
  filter: ClipFilter,
): ClipInsight[] {
  switch (filter) {
    case "high":
      return insights.filter((i) => i.label === "high");
    case "underused":
      return insights.filter((i) => i.isUnderused);
    case "recent":
      return insights.filter((i) => i.ageDays <= 7);
    case "rework":
      return insights.filter((i) => i.label === "rework" || i.label === "weak");
    case "all":
    default:
      return insights;
  }
}

export function sortInsights(
  insights: ClipInsight[],
  sort: ClipSort,
): ClipInsight[] {
  const arr = [...insights];
  switch (sort) {
    case "views":
      arr.sort((a, b) => (b.clip.view_count ?? 0) - (a.clip.view_count ?? 0));
      break;
    case "recent":
      arr.sort((a, b) => a.ageDays - b.ageDays);
      break;
    case "duration":
      arr.sort((a, b) => a.durationSec - b.durationSec);
      break;
    case "potential":
    default:
      arr.sort((a, b) => b.score - a.score);
      break;
  }
  return arr;
}
