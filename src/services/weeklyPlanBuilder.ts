import type { AnalysisReport, Recommendation, ChannelFact, StreamScore } from "@/types/analysis";

export type Effort = "faible" | "moyen" | "élevé";
export type Impact = "fort" | "moyen" | "léger";

export interface WeeklyAction {
  id: string;
  problem: string;
  action: string;
  priority: number;
  impact: Impact;
  effort: Effort;
  category: string;
}

export interface WeeklyExperiment {
  title: string;
  hypothesis: string;
  how: string;
}

export interface WeeklyAvoid {
  title: string;
  reason: string;
}

export interface WeeklyPlan {
  weekKey: string; // e.g. "2026-W16"
  actions: WeeklyAction[];
  experiment: WeeklyExperiment | null;
  avoid: WeeklyAvoid | null;
}

function getFact(facts: ChannelFact[], key: string): number {
  const f = facts.find((f) => f.key === key);
  return typeof f?.value === "number" ? f.value : 0;
}

function inferImpact(category: string, score: StreamScore): Impact {
  const dim = score.breakdown.find(
    (b) => b.dimension.toLowerCase() === category.toLowerCase(),
  );
  if (!dim) return "moyen";
  if (dim.score < 35) return "fort";
  if (dim.score < 60) return "moyen";
  return "léger";
}

function inferEffort(category: string): Effort {
  switch (category) {
    case "regularity":
    case "structure":
      return "moyen";
    case "content":
      return "faible";
    case "positioning":
      return "faible";
    case "monetization":
      return "élevé";
    default:
      return "moyen";
  }
}

function buildExperiment(facts: ChannelFact[], score: StreamScore): WeeklyExperiment | null {
  const clips30d = getFact(facts, "clips_30d");
  const streams30d = getFact(facts, "streams_30d");
  if (clips30d < 2 && streams30d > 0) {
    return {
      title: "Tester 3 clips par session pendant 1 semaine",
      hypothesis: "Plus de clips = plus de découvrabilité hors live.",
      how: "Après chaque stream, isole 3 moments forts et publie-les comme clips. Note les vues à J+7.",
    };
  }
  const weakest = score.breakdown.slice().sort((a, b) => a.score - b.score)[0];
  if (weakest?.dimension.toLowerCase() === "positioning") {
    return {
      title: "Tester un titre orienté niche pendant 5 sessions",
      hypothesis: "Un titre clair sur la niche augmente le taux de clic depuis la directory.",
      how: "Format : '[Catégorie] · [angle clair] · [intention]'. Compare CTR perçu vs semaine précédente.",
    };
  }
  return {
    title: "Tester un horaire fixe pendant 7 jours",
    hypothesis: "Un horaire stable crée l'habitude chez les viewers récurrents.",
    how: "Choisis un créneau identique 4 jours sur 7. Annonce-le 24h avant sur tes réseaux.",
  };
}

function buildAvoid(facts: ChannelFact[]): WeeklyAvoid | null {
  const catSwitchRate = getFact(facts, "category_switch_rate");
  const avgDuration = getFact(facts, "avg_duration_minutes");
  if (catSwitchRate > 50) {
    return {
      title: "Éviter de changer de catégorie en cours de stream",
      reason: "Tu fragmentes ton audience et tu perds le bénéfice algorithmique de la directory.",
    };
  }
  if (avgDuration > 0 && avgDuration < 60) {
    return {
      title: "Éviter les sessions de moins d'1 heure",
      reason: "Les viewers de passage n'ont pas le temps de s'installer ni de découvrir ton format.",
    };
  }
  return null;
}

function getISOWeekKey(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export function buildWeeklyPlan(report: AnalysisReport): WeeklyPlan {
  const priorityRecs: Recommendation[] = report.recommendations
    .filter((r) => r.type === "priority")
    .slice(0, 3);

  const actions: WeeklyAction[] = priorityRecs.map((r, i) => ({
    id: r.id,
    problem: r.reason,
    action: r.action,
    priority: i + 1,
    impact: inferImpact(r.category, report.score),
    effort: inferEffort(r.category),
    category: r.category,
  }));

  return {
    weekKey: getISOWeekKey(),
    actions,
    experiment: buildExperiment(report.facts, report.score),
    avoid: buildAvoid(report.facts),
  };
}

// ── Local completion store (no backend in this phase) ─────────────────
const STORAGE_PREFIX = "streampulse_weekly_done_";

export function getCompletedActionIds(weekKey: string): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + weekKey);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function toggleActionCompletion(weekKey: string, actionId: string): string[] {
  const current = getCompletedActionIds(weekKey);
  const next = current.includes(actionId)
    ? current.filter((id) => id !== actionId)
    : [...current, actionId];
  try {
    localStorage.setItem(STORAGE_PREFIX + weekKey, JSON.stringify(next));
  } catch {
    /* noop */
  }
  return next;
}
