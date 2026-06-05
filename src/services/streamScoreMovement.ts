// StreamScore movement layer. Pure compute + RLS-scoped read helper.
// Reads stream_score_snapshots only. Never exposes raw evidence,
// analysis_job_id, raw Twitch payloads or tokens.

import { supabase } from "@/integrations/supabase/client";
import type { ScoreLevel, StreamScoreSnapshot } from "./streamScoreHistory";

export type MovementStatus =
  | "not_enough_history"
  | "improved"
  | "declined"
  | "stable"
  | "stale";

const DIM_KEYS = [
  "regularity",
  "structure",
  "content",
  "positioning",
  "momentum",
  "monetization",
] as const;
export type DimKey = (typeof DIM_KEYS)[number];

const DIM_LABEL_FR: Record<DimKey, string> = {
  regularity: "Régularité",
  structure: "Structure",
  content: "Contenu",
  positioning: "Positionnement",
  momentum: "Momentum",
  monetization: "Monétisation",
};

export interface SafeSnapshot {
  id: string;
  created_at: string;
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
}

export interface StreamScoreMovement {
  latest_snapshot: SafeSnapshot | null;
  previous_snapshot: SafeSnapshot | null;
  has_enough_history: boolean;
  is_stale: boolean;
  stale_reason: string | null;
  overall_delta: number | null;
  movement_status: MovementStatus;
  dimension_deltas: Record<DimKey, number | null>;
  top_positive_dimension: DimKey | null;
  top_negative_dimension: DimKey | null;
  top_moving_dimension: DimKey | null;
  priority_dimension: string | null;
  explanation: string;
  confidence: ScoreLevel | null;
  signal_quality: ScoreLevel | null;
}

const STALE_DAYS = 7;
const STABLE_THRESHOLD = 2;

function toSafe(s: StreamScoreSnapshot | null): SafeSnapshot | null {
  if (!s) return null;
  return {
    id: s.id,
    created_at: s.created_at,
    overall: s.overall,
    regularity: s.regularity,
    structure: s.structure,
    content: s.content,
    positioning: s.positioning,
    momentum: s.momentum,
    monetization: s.monetization,
    confidence: s.confidence,
    signal_quality: s.signal_quality,
    priority_dimension: s.priority_dimension,
    top_drag: s.top_drag,
    top_support: s.top_support,
  };
}

function emptyDeltas(): Record<DimKey, number | null> {
  return {
    regularity: null,
    structure: null,
    content: null,
    positioning: null,
    momentum: null,
    monetization: null,
  };
}

function lowestDimension(s: SafeSnapshot): DimKey | null {
  let best: DimKey | null = null;
  let bestVal = Infinity;
  for (const k of DIM_KEYS) {
    const v = s[k];
    if (typeof v !== "number") continue;
    if (v < bestVal) {
      bestVal = v;
      best = k;
    }
  }
  return best;
}

function dimToKey(label: string | null): DimKey | null {
  if (!label) return null;
  const map: Record<string, DimKey> = {
    Régularité: "regularity",
    Structure: "structure",
    Contenu: "content",
    Positionnement: "positioning",
    Momentum: "momentum",
    Monétisation: "monetization",
    Affiliation: "monetization",
    "Potentiel monétisation": "monetization",
    regularity: "regularity",
    structure: "structure",
    content: "content",
    positioning: "positioning",
    momentum: "momentum",
    monetization: "monetization",
    affiliation: "monetization",
  };
  return map[label] ?? null;
}

export function computeStreamScoreMovement(
  snapshots: StreamScoreSnapshot[],
): StreamScoreMovement {
  // Expect snapshots ordered by created_at desc.
  const latestRaw = snapshots[0] ?? null;
  const previousRaw = snapshots[1] ?? null;
  const latest = toSafe(latestRaw);
  const previous = toSafe(previousRaw);

  const lowConfNote =
    latest?.confidence === "low"
      ? " Fiabilité faible : il manque encore des données."
      : "";

  if (!latest) {
    return {
      latest_snapshot: null,
      previous_snapshot: null,
      has_enough_history: false,
      is_stale: false,
      stale_reason: null,
      overall_delta: null,
      movement_status: "not_enough_history",
      dimension_deltas: emptyDeltas(),
      top_positive_dimension: null,
      top_negative_dimension: null,
      top_moving_dimension: null,
      priority_dimension: null,
      explanation:
        "Pas encore assez d'historique pour expliquer l'évolution du StreamScore.",
      confidence: null,
      signal_quality: null,
    };
  }

  const ageMs = Date.now() - new Date(latest.created_at).getTime();
  const isStale = ageMs > STALE_DAYS * 86400_000;

  const priorityDim =
    dimToKey(latest.priority_dimension) ?? lowestDimension(latest);
  const priorityLabel = priorityDim
    ? DIM_LABEL_FR[priorityDim]
    : latest.priority_dimension;

  if (!previous) {
    return {
      latest_snapshot: latest,
      previous_snapshot: null,
      has_enough_history: false,
      is_stale: isStale,
      stale_reason: isStale ? "older_than_7d" : null,
      overall_delta: null,
      movement_status: isStale ? "stale" : "not_enough_history",
      dimension_deltas: emptyDeltas(),
      top_positive_dimension: null,
      top_negative_dimension: null,
      top_moving_dimension: null,
      priority_dimension: priorityDim ?? latest.priority_dimension ?? null,
      explanation: isStale
        ? "Ton dernier StreamScore date de plus de 7 jours. Lance une nouvelle analyse pour obtenir une lecture fiable."
        : "Pas encore assez d'historique pour expliquer l'évolution du StreamScore." +
          lowConfNote,
      confidence: latest.confidence,
      signal_quality: latest.signal_quality,
    };
  }

  // Two snapshots present.
  const overall_delta = latest.overall - previous.overall;
  const dimension_deltas = emptyDeltas();
  let topPos: DimKey | null = null;
  let topPosVal = 0;
  let topNeg: DimKey | null = null;
  let topNegVal = 0;
  let topMoving: DimKey | null = null;
  let topMovingAbs = -1;
  for (const k of DIM_KEYS) {
    const a = latest[k];
    const b = previous[k];
    if (a == null || b == null) continue;
    const d = a - b;
    dimension_deltas[k] = d;
    if (d > topPosVal) {
      topPosVal = d;
      topPos = k;
    }
    if (d < topNegVal) {
      topNegVal = d;
      topNeg = k;
    }
    if (Math.abs(d) > topMovingAbs) {
      topMovingAbs = Math.abs(d);
      topMoving = k;
    }
  }

  let movement_status: MovementStatus;
  if (isStale) {
    movement_status = "stale";
  } else if (overall_delta > STABLE_THRESHOLD) {
    movement_status = "improved";
  } else if (overall_delta < -STABLE_THRESHOLD) {
    movement_status = "declined";
  } else {
    movement_status = "stable";
  }

  let explanation: string;
  switch (movement_status) {
    case "stale":
      explanation =
        "Ton dernier StreamScore date de plus de 7 jours. Lance une nouvelle analyse pour obtenir une lecture fiable.";
      break;
    case "improved": {
      const cause = topPos ? ` La progression vient surtout de ta ${DIM_LABEL_FR[topPos]}.` : "";
      explanation = `Ton StreamScore progresse de +${overall_delta} pts.${cause}${lowConfNote}`;
      break;
    }
    case "declined": {
      const cause = topNeg ? ` Le principal frein vient de ta dimension ${DIM_LABEL_FR[topNeg]}.` : "";
      explanation = `Ton StreamScore baisse de ${overall_delta} pts.${cause}${lowConfNote}`;
      break;
    }
    case "stable":
    default: {
      const dim = priorityLabel ? ` La prochaine progression dépend surtout de ta dimension ${priorityLabel}.` : "";
      explanation = `Ton StreamScore est stable.${dim}${lowConfNote}`;
      break;
    }
  }

  return {
    latest_snapshot: latest,
    previous_snapshot: previous,
    has_enough_history: true,
    is_stale: isStale,
    stale_reason: isStale ? "older_than_7d" : null,
    overall_delta,
    movement_status,
    dimension_deltas,
    top_positive_dimension: topPosVal > 0 ? topPos : null,
    top_negative_dimension: topNegVal < 0 ? topNeg : null,
    top_moving_dimension: topMoving,
    priority_dimension: priorityDim ?? latest.priority_dimension ?? null,
    explanation,
    confidence: latest.confidence,
    signal_quality: latest.signal_quality,
  };
}

export async function getStreamScoreMovement(
  userId: string,
): Promise<StreamScoreMovement> {
  const { data } = await supabase
    .from("stream_score_snapshots")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(2);
  const rows = (data as StreamScoreSnapshot[] | null) ?? [];
  return computeStreamScoreMovement(rows);
}
