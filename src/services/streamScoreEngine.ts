import type { StreamScore, ChannelFact, ScoreBreakdownItem } from "@/types/analysis";

function getFact(facts: ChannelFact[], key: string): number {
  const f = facts.find((f) => f.key === key);
  return typeof f?.value === "number" ? f.value : 0;
}

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}

/**
 * StreamScore v2 — credibility-first.
 *
 * Key changes vs v1:
 *  - VOD-derived "avg viewers" (avg_viewers / avg_vod_views_30d) is NOT
 *    treated as live audience anymore; its weight in Content/Monetization
 *    is capped and modulated by data confidence.
 *  - Followers contribute to Monetization ONLY when actually retrieved
 *    (followers_available === 1). Otherwise that lever is neutralized so
 *    we don't fake-zero the score.
 *  - Score is suppressed when there is essentially no live signal
 *    (no streams in 30d, no clips, no follower data) → avoids inflated
 *    placeholder scores on cold accounts.
 *  - Weakness/levers are derived from the lowest scoring dimension and
 *    will always align with the next_best_action computed downstream.
 */
export function computeStreamScore(facts: ChannelFact[]): StreamScore {
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

  // ---- Data sufficiency: drives confidence + score suppression ----
  const hasAnyActivity = streams30d > 0 || clips30d > 0;
  const dataDensity =
    Math.min(streams30d / 8, 1) * 0.5 +
    Math.min(clips30d / 3, 1) * 0.3 +
    (followersAvailable ? 0.2 : 0);

  // --- Regularity (25%) ---
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

  // --- Structure (20%) ---
  const durationScore = clamp((avgDuration / 150) * 100);
  const hoursScore = clamp((totalHours / 20) * 100);
  const structure = clamp(durationScore * 0.6 + hoursScore * 0.4);
  const structure_reasons: string[] = [];
  const structure_levers: string[] = [];
  if (avgDuration > 0 && avgDuration < 120) {
    structure_reasons.push(`Durée moyenne de ${avgDuration} min — court pour construire une audience`);
    structure_levers.push("Allonge tes sessions à 2h minimum");
  }

  // --- Content (20%) ---
  // Clips dominate this dimension. VOD views contribute weakly and ONLY
  // when there is enough data (confidence-weighted, capped at 25).
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

  // --- Positioning (15%) ---
  const posStability = clamp(100 - catSwitchRate);
  const positioning = posStability;
  const positioning_reasons: string[] = [];
  const positioning_levers: string[] = [];
  if (catSwitchRate > 50) {
    positioning_reasons.push("Tu changes de catégorie trop souvent");
    positioning_levers.push("Stabilise ta catégorie principale pendant 2-3 semaines");
  }

  // --- Momentum (10%) ---
  const recentBoost = streams7d >= 3 ? 100 : streams7d >= 2 ? 70 : streams7d >= 1 ? 40 : 0;
  const momentum = clamp(recentBoost);
  const momentum_reasons: string[] = [];
  const momentum_levers: string[] = [];
  if (streams7d < 2) {
    momentum_reasons.push("Faible activité cette semaine");
    momentum_levers.push("Reprends le rythme dès maintenant");
  }

  // --- Monetization (10%) ---
  // Followers contribute ONLY when their value is verified. Otherwise the
  // dimension uses a neutral placeholder (40) so we neither inflate nor
  // fake-zero the score. The UI still surfaces the missing-followers
  // warning separately.
  let monetization: number;
  const monetization_reasons: string[] = [];
  const monetization_levers: string[] = [];
  if (followersAvailable) {
    const followerProg = clamp((followers / 50) * 50);
    const viewerProg = clamp((avgVodViews / 3) * 30); // capped weight, VOD-derived
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

  // --- Weighted overall ---
  let overall = clamp(
    regularity * 0.25 +
    structure * 0.20 +
    content * 0.20 +
    positioning * 0.15 +
    momentum * 0.10 +
    monetization * 0.10
  );

  // Score suppression for cold accounts: cap overall by data density when
  // there is essentially no signal. Avoids the "near-perfect on empty"
  // teaser bug.
  const densityCap = clamp(20 + dataDensity * 80); // 20..100
  overall = Math.min(overall, densityCap);
  if (!hasAnyActivity) overall = Math.min(overall, 25);

  const confidence = clamp(dataDensity * 100);
  const freshness = clamp(streams7d >= 3 ? 100 : streams7d >= 1 ? 60 : 20);

  const breakdown: ScoreBreakdownItem[] = [
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

/**
 * Weight of VOD-derived view signal in the Content score, modulated by
 * how many VODs we actually have. A handful of VODs → minor influence.
 */
function videosViewWeight(streams30d: number): number {
  if (streams30d >= 12) return 0.25;
  if (streams30d >= 6) return 0.15;
  if (streams30d >= 3) return 0.1;
  return 0;
}
