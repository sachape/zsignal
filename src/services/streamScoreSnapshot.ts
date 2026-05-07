// Persists a StreamScore snapshot for an authenticated analysis run.
// Idempotent on analysis_job_id thanks to the unique partial index.

import { supabase } from "@/integrations/supabase/client";
import type { AnalysisReport, ChannelFact, StreamScore } from "@/types/analysis";
import { buildScoreNarrative } from "./streamScoreTier";

type Level = "low" | "medium" | "high";

const DIM_KEY: Record<string, keyof StreamScore> = {
  Régularité: "regularity",
  Structure: "structure",
  Contenu: "content",
  Positionnement: "positioning",
  Momentum: "momentum",
  Monétisation: "monetization",
};

function levelFromPct(pct: number): Level {
  if (pct >= 70) return "high";
  if (pct >= 35) return "medium";
  return "low";
}

function getFact(facts: ChannelFact[] | undefined, key: string): number {
  const f = facts?.find((f) => f.key === key);
  return typeof f?.value === "number" ? f.value : 0;
}

export interface PersistSnapshotOptions {
  userId: string;
  analysisJobId: string | null;
  report: AnalysisReport;
}

export async function persistStreamScoreSnapshot({
  userId,
  analysisJobId,
  report,
}: PersistSnapshotOptions): Promise<void> {
  const score = report.score;
  if (!score) return;

  const narrative = buildScoreNarrative(score);

  // Find priority dimension = weakest in breakdown (matches buildPriority logic).
  const sortedAsc = [...score.breakdown].sort((a, b) => a.score - b.score);
  const weakest = sortedAsc[0];
  const priorityDimension = weakest?.dimension ?? null;

  const facts = report.facts ?? [];
  const followersAvailable = getFact(facts, "followers_available") === 1;
  const avgViewers = getFact(facts, "avg_viewers") || getFact(facts, "avg_vod_views_30d");

  const evidence = {
    streams_30d: getFact(facts, "streams_30d"),
    clips_30d: getFact(facts, "clips_30d"),
    followers_available: followersAvailable,
    avg_viewers_available: avgViewers > 0,
    facts_available: facts.length > 0,
    score_freshness: score.freshness,
    dimension_count: score.breakdown.length,
  };

  const confidence: Level = levelFromPct(score.confidence);
  // Signal quality blends confidence and freshness for a UI-honest summary.
  const signalQuality: Level = levelFromPct(
    Math.round(score.confidence * 0.6 + score.freshness * 0.4),
  );

  const row = {
    user_id: userId,
    analysis_job_id: analysisJobId,
    overall: Math.round(score.overall),
    regularity: Math.round(score.regularity),
    structure: Math.round(score.structure),
    content: Math.round(score.content),
    positioning: Math.round(score.positioning),
    momentum: Math.round(score.momentum),
    monetization: Math.round(score.monetization),
    confidence,
    signal_quality: signalQuality,
    priority_dimension: priorityDimension,
    top_drag: narrative.drags[0] ?? null,
    top_support: narrative.supports[0] ?? null,
    evidence,
  };

  // Idempotent: unique partial index on analysis_job_id ensures no dup.
  const { error } = await supabase
    .from("stream_score_snapshots")
    .insert(row);

  if (error && !/duplicate key|unique/i.test(error.message)) {
    // Don't break the analysis flow on snapshot failure — just log.
    // eslint-disable-next-line no-console
    console.warn("[streamScoreSnapshot] insert failed", error.message);
  }

  // Silence unused var warning in case DIM_KEY isn't referenced elsewhere.
  void DIM_KEY;
}
