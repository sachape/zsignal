// Shared StreamScore engine — pure TypeScript, runs in Deno (Edge Functions)
// AND in the browser (Vite). MUST stay free of DOM, Node, Deno, Supabase
// client, and `import.meta` references.
//
// This is a verbatim port of `src/services/streamScoreEngine.ts` (v2).
// The frontend module re-exports from here (or runs a parity-tested copy)
// so backend automations and the dashboard produce identical scores.

export interface SharedChannelFact {
  key: string;
  value: number | string | boolean | null;
}

export interface SharedScoreBreakdownItem {
  dimension: string;
  score: number;
  weight: number;
  reasons: string[];
  levers: string[];
}

export interface SharedStreamScore {
  overall: number;
  regularity: number;
  structure: number;
  content: number;
  positioning: number;
  momentum: number;
  monetization: number;
  confidence: number;
  freshness: number;
  breakdown: SharedScoreBreakdownItem[];
}

function getFact(facts: SharedChannelFact[], key: string): number {
  const f = facts.find((f) => f.key === key);
  return typeof f?.value === "number" ? f.value : 0;
}

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}

/**
 * Weight of VOD-derived view signal in the Content score, modulated by how
 * many VODs we actually have. A handful of VODs → minor influence.
 */
export function videosViewWeight(streams30d: number): number {
  if (streams30d >= 12) return 0.25;
  if (streams30d >= 6) return 0.15;
  if (streams30d >= 3) return 0.1;
  return 0;
}

export function computeStreamScore(facts: SharedChannelFact[]): SharedStreamScore {
  const streams30d = getFact(facts, "streams_30d");
  const streams7d = getFact(facts, "streams_7d");
  const consistency = getFact(facts, "posting_consistency_score");
  const avgDuration = getFact(facts, "avg_duration_minutes");
  const clips30d = getFact(facts, "clips_30d");
  const catSwitchRate = getFact(facts, "category_switch_rate");
  const avgVodViews = getFact(facts, "avg_vod_views_30d") || getFact(facts, "avg_viewers");
  const followers = getFact(facts, "follower_count");
  const followersAvailable = getFact(facts, "followers_available") === 1;
  const totalHours = getFact(facts, "total_hours_30d");
  const uniqueDays = getFact(facts, "unique_stream_days_30d");

  const hasAnyActivity = streams30d > 0 || clips30d > 0;
  const dataDensity =
    Math.min(streams30d / 8, 1) * 0.5 +
    Math.min(clips30d / 3, 1) * 0.3 +
    (followersAvailable ? 0.2 : 0);

  const freqScore = clamp((streams30d / 12) * 70 + (streams7d / 3) * 30);
  const regularity = clamp(freqScore * 0.5 + consistency * 0.5);
  const regularity_reasons: string[] = [];
  const regularity_levers: string[] = [];
  if (streams30d < 8) {
    regularity_reasons.push(`Seulement ${streams30d} streams en 30 jours`);
    regularity_levers.push("Vise au moins 3 streams par semaine");
  }
  if (consistency < 50 && uniqueDays >= 2) {
    regularity_reasons.push("Planning irrégulier");
    regularity_levers.push("Fixe des jours et horaires récurrents");
  }

  const durationScore = clamp((avgDuration / 150) * 100);
  const hoursScore = clamp((totalHours / 20) * 100);
  const structure = clamp(durationScore * 0.6 + hoursScore * 0.4);
  const structure_reasons: string[] = [];
  const structure_levers: string[] = [];
  if (avgDuration > 0 && avgDuration < 120) {
    structure_reasons.push(`Durée moyenne de ${avgDuration} min — court pour construire une audience`);
    structure_levers.push("Allonge tes sessions à 2h minimum");
  }

  const clipScore = clamp((clips30d / 5) * 70 + Math.min(clips30d, 3) * 10);
  const vodViewSignal = clamp(Math.min((avgVodViews / 20) * 100, 100));
  const vodViewWeight = videosViewWeight(streams30d);
  const content = clamp(clipScore * (1 - vodViewWeight) + vodViewSignal * vodViewWeight);
  const content_reasons: string[] = [];
  const content_levers: string[] = [];
  if (clips30d < 3) {
    content_reasons.push(`Seulement ${clips30d} clip(s) en 30 jours`);
    content_levers.push("Crée ou encourage la création d'au moins 1 clip par stream");
  }

  const posStability = clamp(100 - catSwitchRate);
  const positioning = posStability;
  const positioning_reasons: string[] = [];
  const positioning_levers: string[] = [];
  if (catSwitchRate > 50) {
    positioning_reasons.push("Tu changes de catégorie trop souvent");
    positioning_levers.push("Stabilise ta catégorie principale pendant 2-3 semaines");
  }

  const recentBoost = streams7d >= 3 ? 100 : streams7d >= 2 ? 70 : streams7d >= 1 ? 40 : 0;
  const momentum = clamp(recentBoost);
  const momentum_reasons: string[] = [];
  const momentum_levers: string[] = [];
  if (streams7d < 2) {
    momentum_reasons.push("Faible activité cette semaine");
    momentum_levers.push("Reprends le rythme dès maintenant");
  }

  let monetization: number;
  const monetization_reasons: string[] = [];
  const monetization_levers: string[] = [];
  if (followersAvailable) {
    const followerProg = clamp((followers / 50) * 50);
    const viewerProg = clamp((avgVodViews / 3) * 30);
    monetization = clamp(followerProg + viewerProg + 20);
    if (followers < 50) {
      monetization_reasons.push(`${followers}/50 followers pour l'affiliation`);
      monetization_levers.push("Partage ton lien de chaîne sur les réseaux sociaux");
    }
  } else {
    monetization = 40;
    monetization_reasons.push("Followers indisponibles — score limité");
    monetization_levers.push("Reconnecte Twitch avec la permission followers pour évaluer ce levier");
  }

  let overall = clamp(
    regularity * 0.25 +
    structure * 0.20 +
    content * 0.20 +
    positioning * 0.15 +
    momentum * 0.10 +
    monetization * 0.10
  );

  const densityCap = clamp(20 + dataDensity * 80);
  overall = Math.min(overall, densityCap);
  if (!hasAnyActivity) overall = Math.min(overall, 25);

  const confidence = clamp(dataDensity * 100);
  const freshness = clamp(streams7d >= 3 ? 100 : streams7d >= 1 ? 60 : 20);

  const breakdown: SharedScoreBreakdownItem[] = [
    { dimension: "Régularité", score: regularity, weight: 0.25, reasons: regularity_reasons, levers: regularity_levers },
    { dimension: "Structure", score: structure, weight: 0.20, reasons: structure_reasons, levers: structure_levers },
    { dimension: "Contenu", score: content, weight: 0.20, reasons: content_reasons, levers: content_levers },
    { dimension: "Positionnement", score: positioning, weight: 0.15, reasons: positioning_reasons, levers: positioning_levers },
    { dimension: "Momentum", score: momentum, weight: 0.10, reasons: momentum_reasons, levers: momentum_levers },
    { dimension: "Monétisation", score: monetization, weight: 0.10, reasons: monetization_reasons, levers: monetization_levers },
  ];

  return {
    overall,
    regularity,
    structure,
    content,
    positioning,
    momentum,
    monetization,
    confidence,
    freshness,
    breakdown,
  };
}

/** Convenience: derived helpers exposed for downstream callers. */
export function computeScoreConfidence(facts: SharedChannelFact[]): number {
  return computeStreamScore(facts).confidence;
}

export function computeScoreFreshness(facts: SharedChannelFact[]): number {
  return computeStreamScore(facts).freshness;
}

export function computeSignalQuality(facts: SharedChannelFact[]): "high" | "medium" | "low" {
  const s = computeStreamScore(facts);
  const blended = Math.round(s.confidence * 0.6 + s.freshness * 0.4);
  if (blended >= 70) return "high";
  if (blended >= 35) return "medium";
  return "low";
}

/**
 * Normalize an unknown fact list into the strict shape used by the engine.
 * Drops malformed entries without throwing.
 */
export function normalizeChannelFacts(raw: unknown): SharedChannelFact[] {
  if (!Array.isArray(raw)) return [];
  const out: SharedChannelFact[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const key = (r as { key?: unknown }).key;
    const value = (r as { value?: unknown }).value;
    if (typeof key !== "string") continue;
    if (
      value === null ||
      typeof value === "number" ||
      typeof value === "string" ||
      typeof value === "boolean"
    ) {
      out.push({ key, value: (value ?? null) as string | number | boolean | null });
    }
  }
  return out;
}
