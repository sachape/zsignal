import type { StreamScore, ScoreBreakdownItem } from "@/types/analysis";

/**
 * Single source of truth for StreamScore visual + narrative tiers.
 *
 * Thresholds (no overlap):
 *  - 0..24   → low      (red / destructive)
 *  - 25..79  → mid      (orange / warning)
 *  - 80..100 → high     (current primary / brand color)
 *
 * Used by ScoreCard, ProgressRow, and ScoreInsightCard so that the
 * color signal stays consistent everywhere the StreamScore is shown.
 */

export type ScoreTier = "low" | "mid" | "high";

export function getScoreTier(score: number): ScoreTier {
  if (score <= 24) return "low";
  if (score <= 79) return "mid";
  return "high";
}

export interface TierTheme {
  /** HSL token name for stroke / accents (without `hsl()` wrapper). */
  strokeVar: string;
  /** Tailwind text color class for the score number. */
  textClass: string;
  /** Tailwind border + bg classes for soft accents. */
  surfaceClass: string;
  /** Tailwind background class for progress bar fill. */
  progressClass: string;
  /** Short label for the tier (sentence case). */
  label: string;
}

export function getTierTheme(tier: ScoreTier): TierTheme {
  switch (tier) {
    case "low":
      return {
        strokeVar: "var(--destructive)",
        textClass: "text-destructive",
        surfaceClass: "border-destructive/30 bg-destructive/5",
        progressClass: "bg-destructive",
        label: "Base fragile",
      };
    case "mid":
      return {
        strokeVar: "var(--warning)",
        textClass: "text-warning",
        surfaceClass: "border-warning/30 bg-warning/5",
        progressClass: "bg-warning",
        label: "En construction",
      };
    case "high":
    default:
      return {
        strokeVar: "var(--primary)",
        textClass: "text-foreground",
        surfaceClass: "border-primary/30 bg-primary/5",
        progressClass: "bg-primary",
        label: "Base solide",
      };
  }
}

/* ------------------------------------------------------------------ */
/* Narrative — "Pourquoi ce score"                                     */
/* ------------------------------------------------------------------ */

export interface ScoreNarrative {
  /** Tier headline (one short sentence). */
  headline: string;
  /** "Ce qui tire ton score vers le bas" — up to 2 weak points. */
  drags: string[];
  /** "Ce qui soutient ton score" — up to 2 strong points. */
  supports: string[];
  /** Single actionable next step, prefixed with "Priorité : ". */
  priority: string;
  /** Compact sub-score breakdown for the mini decomposition. */
  miniBreakdown: Array<{
    label: string;
    score: number;
    tier: ScoreTier;
  }>;
}

const HEADLINES: Record<ScoreTier, string> = {
  low: "Ta chaîne n'a pas encore assez de base exploitable.",
  mid: "Ta base existe, mais plusieurs points freinent encore ta progression.",
  high: "Ta chaîne repose sur une base solide.",
};

/** Plain-language label per dimension, used in drag/support lines. */
const DIM_DRAG: Record<string, string> = {
  Régularité: "Régularité trop instable",
  Structure: "Sessions encore trop courtes",
  Contenu: "Peu de contenu marquant à exploiter",
  Positionnement: "Catégorie principale qui change trop",
  Momentum: "Démarrage de semaine encore faible",
  Monétisation: "Base d'audience encore trop fine",
};

const DIM_SUPPORT: Record<string, string> = {
  Régularité: "Bon rythme tenu sur la durée",
  Structure: "Sessions bien tenues dans le temps",
  Contenu: "Du contenu qui ressort déjà",
  Positionnement: "Positionnement clair et stable",
  Momentum: "Bon démarrage récent",
  Monétisation: "Base d'audience qui se construit",
};

/** Priority recommendation built from the weakest dimension. */
function buildPriority(weakest: ScoreBreakdownItem | undefined, tier: ScoreTier): string {
  if (!weakest) {
    return tier === "high"
      ? "Priorité : confirmer cette stabilité sur le prochain live."
      : "Priorité : relancer un live complet cette semaine.";
  }
  switch (weakest.dimension) {
    case "Régularité":
      return "Priorité : relancer 2 sessions complètes cette semaine.";
    case "Structure":
      return "Priorité : tenir une session d'au moins 2 h sur le prochain live.";
    case "Contenu":
      return "Priorité : sortir au moins 1 clip fort du prochain live.";
    case "Positionnement":
      return "Priorité : rester sur la même catégorie 2 lives d'affilée.";
    case "Momentum":
      return "Priorité : remettre un live cette semaine pour relancer le rythme.";
    case "Monétisation":
      return "Priorité : pousser ta chaîne hors stream pour élargir l'audience.";
    default:
      return "Priorité : confirmer ce point sur un nouveau live.";
  }
}

export function buildScoreNarrative(score: StreamScore): ScoreNarrative {
  const tier = getScoreTier(score.overall);

  const sorted = [...score.breakdown].sort((a, b) => a.score - b.score);
  const drags = sorted
    .slice(0, 2)
    .filter((d) => d.score < 60)
    .map((d) => DIM_DRAG[d.dimension] ?? d.dimension);

  const supports = [...score.breakdown]
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .filter((d) => d.score >= 60)
    .map((d) => DIM_SUPPORT[d.dimension] ?? d.dimension);

  const weakest = sorted[0];
  const priority = buildPriority(weakest, tier);

  // Mini decomposition: keep only the 3 most informative dimensions
  // (highest weight) to avoid a dense table.
  const miniBreakdown = [...score.breakdown]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map((d) => ({
      label: d.dimension,
      score: d.score,
      tier: getScoreTier(d.score),
    }));

  return {
    headline: HEADLINES[tier],
    drags,
    supports,
    priority,
    miniBreakdown,
  };
}
