// Read-side helpers for StreamScore history (stream_score_snapshots).

import { supabase } from "@/integrations/supabase/client";
import { getHistoryCutoffISO } from "@/services/historyAccess";

export type ScoreLevel = "low" | "medium" | "high";

export interface StreamScoreSnapshot {
  id: string;
  user_id: string;
  analysis_job_id: string | null;
  overall: number;
  regularity: number | null;
  structure: number | null;
  content: number | null;
  positioning: number | null;
  momentum: number | null;
  monetization: number | null;
  confidence: ScoreLevel;
  signal_quality: ScoreLevel;
  priority_dimension: string | null;
  top_drag: string | null;
  top_support: string | null;
  evidence: Record<string, unknown> | null;
  created_at: string;
}

const DIM_KEYS = [
  "regularity",
  "structure",
  "content",
  "positioning",
  "momentum",
  "monetization",
] as const;

type DimKey = (typeof DIM_KEYS)[number];

const DIM_LABEL_FR: Record<DimKey, string> = {
  regularity: "la régularité",
  structure: "la structure des sessions",
  content: "le contenu réutilisable",
  positioning: "le positionnement",
  momentum: "le momentum",
  monetization: "la monétisation",
};

/**
 * Resolve analysis_job ids for the user that match a given connected
 * platform_user_id. Used to scope snapshot reads to the user's OWN
 * connected channel — never to other channels they manually analyzed.
 * Returns null when no platformUserId is provided (caller should treat
 * as "no scoping" and skip snapshot reads to avoid leaking unrelated
 * channels into the evolution card).
 */
async function getJobIdsForPlatformUser(
  userId: string,
  platformUserId: string,
): Promise<string[]> {
  const { data } = await supabase
    .from("analysis_jobs")
    .select("id")
    .eq("user_id", userId)
    .eq("platform", "twitch")
    .eq("platform_user_id", platformUserId);
  return (data ?? []).map((r) => r.id as string);
}

export async function getLatestSnapshot(
  userId: string,
  platformUserId?: string | null,
): Promise<StreamScoreSnapshot | null> {
  if (!platformUserId) return null;
  const jobIds = await getJobIdsForPlatformUser(userId, platformUserId);
  if (jobIds.length === 0) return null;
  const { data } = await supabase
    .from("stream_score_snapshots")
    .select("*")
    .eq("user_id", userId)
    .in("analysis_job_id", jobIds)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as StreamScoreSnapshot | null) ?? null;
}

export async function getSnapshotsSince(
  userId: string,
  sinceISO: string,
  platformUserId?: string | null,
): Promise<StreamScoreSnapshot[]> {
  if (!platformUserId) return [];
  const jobIds = await getJobIdsForPlatformUser(userId, platformUserId);
  if (jobIds.length === 0) return [];
  const { data } = await supabase
    .from("stream_score_snapshots")
    .select("*")
    .eq("user_id", userId)
    .in("analysis_job_id", jobIds)
    .gte("created_at", sinceISO)
    .order("created_at", { ascending: true });
  return (data as StreamScoreSnapshot[] | null) ?? [];
}

export interface WeekOverWeekDelta {
  latest: StreamScoreSnapshot | null;
  previous: StreamScoreSnapshot | null;
  overall_delta: number | null;
  dimension_deltas: Record<DimKey, number | null>;
  top_moving_dimension: DimKey | null;
  explanation: string;
}

export async function getWeekOverWeekDelta(
  userId: string,
  platformUserId?: string | null,
): Promise<WeekOverWeekDelta> {
  const emptyDeltas: Record<DimKey, number | null> = {
    regularity: null,
    structure: null,
    content: null,
    positioning: null,
    momentum: null,
    monetization: null,
  };
  if (!platformUserId) {
    return {
      latest: null,
      previous: null,
      overall_delta: null,
      dimension_deltas: emptyDeltas,
      top_moving_dimension: null,
      explanation: "Pas encore assez d'historique pour expliquer l'évolution.",
    };
  }
  const jobIds = await getJobIdsForPlatformUser(userId, platformUserId);
  if (jobIds.length === 0) {
    return {
      latest: null,
      previous: null,
      overall_delta: null,
      dimension_deltas: emptyDeltas,
      top_moving_dimension: null,
      explanation: "Pas encore assez d'historique pour expliquer l'évolution.",
    };
  }

  const { data } = await supabase
    .from("stream_score_snapshots")
    .select("*")
    .eq("user_id", userId)
    .in("analysis_job_id", jobIds)
    .order("created_at", { ascending: false })
    .limit(2);

  const rows = (data as StreamScoreSnapshot[] | null) ?? [];
  const latest = rows[0] ?? null;
  const previous = rows[1] ?? null;

  if (!latest || !previous) {
    return {
      latest,
      previous,
      overall_delta: null,
      dimension_deltas: emptyDeltas,
      top_moving_dimension: null,
      explanation: "Pas encore assez d'historique pour expliquer l'évolution.",
    };
  }

  const overall_delta = latest.overall - previous.overall;

  const dimension_deltas = { ...emptyDeltas };
  let topDim: DimKey | null = null;
  let topAbs = -1;
  for (const k of DIM_KEYS) {
    const a = latest[k];
    const b = previous[k];
    if (a == null || b == null) continue;
    const d = a - b;
    dimension_deltas[k] = d;
    if (Math.abs(d) > topAbs) {
      topAbs = Math.abs(d);
      topDim = k;
    }
  }

  let explanation: string;
  if (overall_delta === 0 && topAbs <= 0) {
    explanation = "Ton score est stable depuis la dernière analyse.";
  } else if (topDim && topAbs > 0) {
    const dir = (dimension_deltas[topDim] ?? 0) > 0 ? "progresse" : "baisse";
    const cause = dir === "progresse" ? "grâce à" : "à cause de";
    explanation = `Ton score ${dir} surtout ${cause} ${DIM_LABEL_FR[topDim]}.`;
  } else if (overall_delta > 0) {
    explanation = "Ton score progresse légèrement depuis la dernière analyse.";
  } else if (overall_delta < 0) {
    explanation = "Ton score baisse légèrement depuis la dernière analyse.";
  } else {
    explanation = "Ton score est stable depuis la dernière analyse.";
  }

  return {
    latest,
    previous,
    overall_delta,
    dimension_deltas,
    top_moving_dimension: topDim,
    explanation,
  };
}
