import type {
  AnalysisReport,
  Recommendation,
  ChannelFact,
  StreamScore,
} from "@/types/analysis";
import {
  diagnoseFoundationMode,
  type BlockerKey,
  type MainBlocker,
} from "./foundationMode";

export type Effort = "faible" | "moyen" | "élevé";
export type Impact = "fort" | "moyen" | "léger";

export interface WeeklyAction {
  id: string;
  /** Step number in the execution sequence (1-based). */
  step: number;
  problem: string;
  action: string;
  impact: Impact;
  effort: Effort;
  category: string;
}

export interface WeeklyExperiment {
  title: string;
  /** What we expect to learn or move. */
  hypothesis: string;
  /** How to set it up. */
  how: string;
  /** Duration of the test, e.g. "7 jours". */
  duration: string;
  /** What signal to observe to call it a win. */
  signalToObserve: string;
  /** Why this test matters now (ties to current blocker / weakest dim). */
  whyNow: string;
}

export interface WeeklyAvoid {
  title: string;
  reason: string;
}

export interface WeeklyFocus {
  /** Short label of the current focus, e.g. "Créer du rythme". */
  label: string;
  /** One-sentence explanation tying the plan to the blocker. */
  rationale: string;
  /** Source blocker key so the UI can stay in sync. */
  blockerKey: BlockerKey | null;
}

export interface WeeklyPlan {
  weekKey: string;
  /** Ordered execution sequence (Étape 1 → 2 → 3). */
  actions: WeeklyAction[];
  experiment: WeeklyExperiment | null;
  avoid: WeeklyAvoid | null;
  /** Current weekly focus, derived from the main blocker when available. */
  focus: WeeklyFocus;
  /** True when the plan was sequenced from the foundation blocker. */
  sequencedFromBlocker: boolean;
}

function getFact(facts: ChannelFact[], key: string): number {
  const f = facts.find((f) => f.key === key);
  return typeof f?.value === "number" ? f.value : Number(f?.value ?? 0) || 0;
}

function getStr(facts: ChannelFact[], key: string): string {
  const f = facts.find((f) => f.key === key);
  return typeof f?.value === "string" ? f.value : "";
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
    case "positioning":
      return "faible";
    case "monetization":
      return "élevé";
    default:
      return "moyen";
  }
}

/** Foundation-stage priority order. Earlier categories must be addressed first. */
const FOUNDATION_PRIORITY: string[] = [
  "regularity", // create regularity
  "positioning", // create category consistency / clarify niche
  "content", // activate clips / discovery loop
  "structure",
  "monetization",
];

function categoryRank(category: string): number {
  const idx = FOUNDATION_PRIORITY.indexOf(category.toLowerCase());
  return idx === -1 ? 99 : idx;
}

/**
 * Sequence priority recommendations following the foundation order so the
 * weekly plan reads as: do this first, then this, then this.
 *
 * Advanced optimization actions are deferred until basic structure exists.
 */
function sequenceRecommendations(
  recs: Recommendation[],
  isFoundation: boolean,
): Recommendation[] {
  const priority = recs.filter((r) => r.type === "priority");
  if (!isFoundation) {
    return priority.slice(0, 3);
  }
  // Foundation: drop anything that isn't basic structuring; sort by foundation rank.
  const allowed = new Set(["regularity", "positioning", "content", "structure"]);
  const filtered = priority.filter((r) => allowed.has(r.category.toLowerCase()));
  const pool = filtered.length > 0 ? filtered : priority;
  return [...pool]
    .sort((a, b) => categoryRank(a.category) - categoryRank(b.category))
    .slice(0, 3);
}

function buildExperiment(
  facts: ChannelFact[],
  score: StreamScore,
  blocker: MainBlocker | null,
): WeeklyExperiment {
  const clips30d = getFact(facts, "clips_30d");
  const streams30d = getFact(facts, "streams_30d");

  // Tie the experiment to the blocker first.
  if (blocker?.key === "no_cadence") {
    return {
      title: "Tester un créneau fixe 3 fois cette semaine",
      hypothesis:
        "Un horaire stable crée une habitude de retour, même avec une petite audience.",
      how: "Choisis un créneau identique sur 3 jours, annonce-le 24 h avant, ouvre à l'heure exacte.",
      duration: "7 jours",
      signalToObserve:
        "Nombre de viewers présents à l'ouverture vs il y a 7 jours.",
      whyNow:
        "Sans rythme identifiable, aucune autre optimisation n'a d'effet durable.",
    };
  }
  if (blocker?.key === "no_clips_loop") {
    return {
      title: "Publier 3 clips après chaque session pendant 7 jours",
      hypothesis:
        "Plus de clips = plus de découverte hors live, surtout sur une petite chaîne.",
      how: "Repère 3 moments forts en live, clippe-les, publie dans les 24 h.",
      duration: "7 jours",
      signalToObserve: "Vues clips à J+7 et nouveaux followers attribuables.",
      whyNow: "Les clips sont ta seule surface de découverte gratuite et continue.",
    };
  }
  if (blocker?.key === "weak_positioning") {
    return {
      title: "Tester un titre orienté niche sur 5 sessions",
      hypothesis:
        "Un titre clair sur la niche augmente le taux de clic depuis la directory.",
      how: "Format : '[Catégorie] · [angle clair] · [intention]'. Garde-le sur 5 streams.",
      duration: "5 sessions",
      signalToObserve: "Clics depuis la directory et viewers de passage.",
      whyNow: "Tant que ton positionnement n'est pas lisible, la croissance plafonne.",
    };
  }
  if (blocker?.key === "no_return_habit") {
    return {
      title: "Ouvrir et clôturer chaque stream avec le même rituel",
      hypothesis:
        "Un rituel court rend la chaîne mémorable et augmente le taux de retour.",
      how: "Une phrase d'ouverture + une annonce du prochain stream à la fin.",
      duration: "7 jours",
      signalToObserve: "Viewers récurrents entre 2 sessions consécutives.",
      whyNow:
        "Une chaîne sans rituel reste anonyme, même quand le contenu est bon.",
    };
  }

  // Fallback: data-driven experiments when not in clear blocker context.
  if (clips30d < 2 && streams30d > 0) {
    return {
      title: "Tester 3 clips par session pendant 1 semaine",
      hypothesis: "Plus de clips = plus de découvrabilité hors live.",
      how: "Après chaque stream, isole 3 moments forts et publie-les comme clips.",
      duration: "7 jours",
      signalToObserve: "Vues clips à J+7.",
      whyNow: "Boucle clips inactive : c'est le levier le plus rapide.",
    };
  }
  const weakest = score.breakdown.slice().sort((a, b) => a.score - b.score)[0];
  if (weakest?.dimension.toLowerCase() === "positioning") {
    return {
      title: "Tester un titre orienté niche pendant 5 sessions",
      hypothesis:
        "Un titre clair sur la niche augmente le taux de clic depuis la directory.",
      how: "Format : '[Catégorie] · [angle clair] · [intention]'.",
      duration: "5 sessions",
      signalToObserve: "CTR perçu depuis la directory.",
      whyNow: "Le positionnement est ta dimension la plus faible cette semaine.",
    };
  }
  return {
    title: "Tester un horaire fixe pendant 7 jours",
    hypothesis: "Un horaire stable crée l'habitude chez les viewers récurrents.",
    how: "Choisis un créneau identique 4 jours sur 7. Annonce-le 24 h avant.",
    duration: "7 jours",
    signalToObserve: "Viewers présents à l'ouverture du stream.",
    whyNow: "La régularité reste ton meilleur multiplicateur.",
  };
}

function buildAvoid(
  facts: ChannelFact[],
  blocker: MainBlocker | null,
): WeeklyAvoid {
  // Blocker-driven first.
  if (blocker?.key === "weak_positioning") {
    return {
      title: "Éviter de changer de catégorie à chaque live",
      reason:
        "Tu fragmentes ton audience et tu casses le bénéfice algorithmique de la directory.",
    };
  }
  if (blocker?.key === "no_cadence") {
    return {
      title: "Éviter de streamer à des horaires aléatoires",
      reason:
        "Un planning imprévisible empêche toute habitude de retour, même avec un bon contenu.",
    };
  }
  if (blocker?.key === "no_clips_loop") {
    return {
      title: "Éviter de publier des clips sans cohérence",
      reason:
        "Des clips dispersés ne construisent ni format ni reconnaissance — choisis 1 angle.",
    };
  }
  if (blocker?.key === "no_return_habit") {
    return {
      title: "Éviter de tester trop de formats à la fois",
      reason:
        "Sans repères stables, les viewers ne savent pas pourquoi revenir.",
    };
  }

  // Data-driven fallbacks.
  const catSwitchRate = getFact(facts, "category_switch_rate");
  const avgDuration = getFact(facts, "avg_duration_minutes");
  if (catSwitchRate > 50) {
    return {
      title: "Éviter de changer de catégorie en cours de stream",
      reason:
        "Tu fragmentes ton audience et tu casses le bénéfice algorithmique de la directory.",
    };
  }
  if (avgDuration > 0 && avgDuration < 60) {
    return {
      title: "Éviter les sessions de moins d'1 heure",
      reason:
        "Les viewers de passage n'ont pas le temps de s'installer ni de découvrir ton format.",
    };
  }
  return {
    title: "Éviter de tester trop de formats à la fois",
    reason: "Une seule expérience à la fois te donne un signal lisible.",
  };
}

function blockerToFocus(blocker: MainBlocker | null): WeeklyFocus {
  if (!blocker) {
    return {
      label: "Consolider l'exécution",
      rationale:
        "Pas de blocage majeur détecté : on consolide les fondations et on prépare la prochaine optimisation.",
      blockerKey: null,
    };
  }
  switch (blocker.key) {
    case "no_cadence":
      return {
        label: "Créer du rythme",
        rationale:
          "Ton blocage cette semaine : pas de rythme identifiable. Le plan attaque ce point en priorité.",
        blockerKey: blocker.key,
      };
    case "weak_positioning":
      return {
        label: "Clarifier le positionnement",
        rationale:
          "Ton blocage : ton positionnement n'est pas lisible. Le plan rend ta chaîne identifiable en 5 secondes.",
        blockerKey: blocker.key,
      };
    case "no_clips_loop":
      return {
        label: "Activer la boucle clips",
        rationale:
          "Ton blocage : tu n'existes pas hors du live. Le plan ouvre une vraie surface de découverte.",
        blockerKey: blocker.key,
      };
    case "no_return_habit":
      return {
        label: "Créer l'habitude de retour",
        rationale:
          "Ton blocage : les viewers passent mais ne reviennent pas. Le plan installe les premiers repères de retour.",
        blockerKey: blocker.key,
      };
    case "insufficient_volume":
    default:
      return {
        label: "Produire un signal exploitable",
        rationale:
          "Ton blocage : pas assez d'activité pour optimiser. Le plan vise un volume cohérent cette semaine.",
        blockerKey: blocker.key,
      };
  }
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
  const foundation = diagnoseFoundationMode(report);
  const blocker: MainBlocker | null = foundation.isActive ? foundation.blocker : null;

  const sequenced = sequenceRecommendations(
    report.recommendations,
    foundation.isActive,
  );

  const actions: WeeklyAction[] = sequenced.map((r, i) => ({
    id: r.id,
    step: i + 1,
    problem: r.reason,
    action: r.action,
    impact: inferImpact(r.category, report.score),
    effort: inferEffort(r.category),
    category: r.category,
  }));

  return {
    weekKey: getISOWeekKey(),
    actions,
    experiment: buildExperiment(report.facts, report.score, blocker),
    avoid: buildAvoid(report.facts, blocker),
    focus: blockerToFocus(blocker),
    sequencedFromBlocker: foundation.isActive,
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

// Re-export types still used externally so existing imports don't break.
// (No-op runtime; pure type re-exports.)
