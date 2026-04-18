import type { AnalysisReport, ChannelFact } from "@/types/analysis";

/**
 * Foundation mode = product mode for connected accounts with low data / low
 * activity. When active, the dashboard stops behaving like an optimization
 * tool and becomes a structuring coach: surface the main blocker, sequence
 * the week, and demote noisy analytics.
 */

export type BlockerKey =
  | "no_cadence"
  | "no_clips_loop"
  | "weak_positioning"
  | "no_return_habit"
  | "insufficient_volume";

export interface MainBlocker {
  key: BlockerKey;
  title: string;
  explanation: string;
}

export interface WeeklySequenceAction {
  order: number;
  title: string;
  why: string;
  expectedImpact: string;
  effort: "faible" | "moyen" | "élevé";
}

export interface FoundationDiagnosis {
  isActive: boolean;
  reasons: string[];
  blocker: MainBlocker;
  sequence: WeeklySequenceAction[];
}

const getNum = (facts: ChannelFact[], key: string): number => {
  const f = facts.find((x) => x.key === key);
  return typeof f?.value === "number" ? f.value : Number(f?.value ?? 0) || 0;
};

const getStr = (facts: ChannelFact[], key: string): string => {
  const f = facts.find((x) => x.key === key);
  return typeof f?.value === "string" ? f.value : String(f?.value ?? "");
};

/**
 * Decide whether foundation mode should activate. Conservative thresholds:
 * if any 2 of the weak signals are true, we consider the channel low-data.
 */
export function diagnoseFoundationMode(report: AnalysisReport): FoundationDiagnosis {
  const facts = report.facts;
  const streams30d = getNum(facts, "streams_30d");
  const clips30d = getNum(facts, "clips_30d");
  const uniqueDays = getNum(facts, "unique_stream_days_30d");
  const totalHours = getNum(facts, "total_hours_30d");
  const catSwitchRate = getNum(facts, "category_switch_rate");
  const avgViewers = getNum(facts, "avg_viewers");
  const dominantCategory = getStr(facts, "dominant_category");

  const weak = {
    fewStreams: streams30d > 0 && streams30d < 8,
    noStreams: streams30d === 0,
    noClips: clips30d < 2,
    lowCadence: uniqueDays < 6,
    lowVolume: totalHours < 12,
    unstableCategory: catSwitchRate > 50 || !dominantCategory,
    lowAudience: avgViewers < 3,
  };

  const reasons: string[] = [];
  if (weak.fewStreams || weak.noStreams)
    reasons.push(
      weak.noStreams ? "Aucun stream sur les 30 derniers jours" : `${streams30d} streams en 30 jours`,
    );
  if (weak.noClips) reasons.push("Boucle clips quasi inexistante");
  if (weak.lowCadence) reasons.push(`${uniqueDays} jours actifs sur 30`);
  if (weak.lowVolume) reasons.push(`${Math.round(totalHours)} h cumulées sur 30 jours`);
  if (weak.unstableCategory) reasons.push("Pas de catégorie dominante stable");
  if (weak.lowAudience) reasons.push("Audience moyenne très faible");

  const weakCount = Object.values(weak).filter(Boolean).length;
  const isActive = weakCount >= 2;

  // Pick the single most pressing blocker (priority order matters).
  let blocker: MainBlocker;
  if (weak.lowCadence || weak.fewStreams || weak.noStreams) {
    blocker = {
      key: "no_cadence",
      title: "Tu n'as pas encore de rythme identifiable",
      explanation:
        "Sans rythme régulier, l'algorithme et tes viewers ne peuvent pas créer d'habitude de retour. C'est le verrou principal à débloquer avant tout le reste.",
    };
  } else if (weak.noClips) {
    blocker = {
      key: "no_clips_loop",
      title: "Tu n'as pas encore activé la boucle clips",
      explanation:
        "Sans clips, ta chaîne n'existe pas hors du live. C'est ta seule surface de découverte gratuite et continue.",
    };
  } else if (weak.unstableCategory) {
    blocker = {
      key: "weak_positioning",
      title: "Ton positionnement n'est pas assez lisible",
      explanation:
        "Tu changes trop souvent de catégorie ou de format. Un viewer de passage ne comprend pas en 5 secondes ce qu'il vient regarder.",
    };
  } else if (weak.lowAudience) {
    blocker = {
      key: "no_return_habit",
      title: "Ta chaîne ne crée pas encore d'habitude de retour",
      explanation:
        "Les viewers passent mais ne reviennent pas. La régularité et un format identifiable sont les deux leviers à activer en priorité.",
    };
  } else {
    blocker = {
      key: "insufficient_volume",
      title: "Tu n'as pas encore assez de signal exploitable",
      explanation:
        "Le volume actuel ne permet pas d'optimiser. L'objectif cette semaine est de produire assez d'activité pour rendre tes données lisibles.",
    };
  }

  const sequence = buildWeeklySequence(blocker.key);

  return { isActive, reasons, blocker, sequence };
}

function buildWeeklySequence(key: BlockerKey): WeeklySequenceAction[] {
  switch (key) {
    case "no_cadence":
      return [
        {
          order: 1,
          title: "Choisis 3 créneaux fixes cette semaine",
          why: "Un planning lisible est la base d'un rythme. 3 créneaux annoncés valent mieux que 5 incertains.",
          expectedImpact: "Crée la première habitude de retour viewer.",
          effort: "faible",
        },
        {
          order: 2,
          title: "Annonce ton planning 24 h avant chaque session",
          why: "Sans annonce, même un planning fixe reste invisible pour les viewers de passage.",
          expectedImpact: "Augmente le taux de présence à l'ouverture du stream.",
          effort: "faible",
        },
        {
          order: 3,
          title: "Tiens les 3 créneaux sans en sauter aucun",
          why: "Un créneau sauté en phase de structuration efface tout le bénéfice algorithmique.",
          expectedImpact: "Première vraie semaine régulière = signal exploitable.",
          effort: "moyen",
        },
      ];
    case "no_clips_loop":
      return [
        {
          order: 1,
          title: "Identifie 3 moments forts par session",
          why: "Sans repérage en live, la création de clips après-coup est trop coûteuse.",
          expectedImpact: "Rend la production de clips réaliste sans monteur.",
          effort: "faible",
        },
        {
          order: 2,
          title: "Publie 3 clips après chaque stream cette semaine",
          why: "Les clips sont ta seule surface de découverte hors live. Sans eux, la chaîne n'existe pas.",
          expectedImpact: "Ouvre une vraie source de vues passives sur 7 jours.",
          effort: "moyen",
        },
        {
          order: 3,
          title: "Mesure les vues clips à J+7",
          why: "Sans mesure, impossible de savoir quel format de clip déclenche.",
          expectedImpact: "Tu identifies ton premier format de clip rentable.",
          effort: "faible",
        },
      ];
    case "weak_positioning":
      return [
        {
          order: 1,
          title: "Choisis une catégorie principale pour la semaine",
          why: "Changer de catégorie en cours de stream casse le bénéfice de la directory.",
          expectedImpact: "Tes streams deviennent lisibles en 5 secondes.",
          effort: "faible",
        },
        {
          order: 2,
          title: "Réécris ton titre sur le format : Catégorie · angle · intention",
          why: "Un titre clair augmente le clic depuis la directory, surtout pour une petite chaîne.",
          expectedImpact: "Plus de clics depuis Twitch sans audience supplémentaire.",
          effort: "faible",
        },
        {
          order: 3,
          title: "Garde la même catégorie sur les 3 streams de la semaine",
          why: "Un viewer ne revient que s'il sait ce qu'il va retrouver.",
          expectedImpact: "Première habitude de retour identifiable.",
          effort: "moyen",
        },
      ];
    case "no_return_habit":
      return [
        {
          order: 1,
          title: "Stabilise un créneau identique 3 fois cette semaine",
          why: "L'habitude de retour se construit sur la répétition au même horaire.",
          expectedImpact: "Premier signal de viewers récurrents.",
          effort: "moyen",
        },
        {
          order: 2,
          title: "Ouvre chaque stream avec la même phrase d'intention",
          why: "Une ouverture rituelle aide les viewers à reconnaître ta chaîne.",
          expectedImpact: "Ta chaîne devient mémorable, pas juste de passage.",
          effort: "faible",
        },
        {
          order: 3,
          title: "Termine chaque stream par l'annonce du prochain",
          why: "Sans rendez-vous explicite, le viewer n'a aucune raison de revenir.",
          expectedImpact: "Augmente le taux de retour entre deux sessions.",
          effort: "faible",
        },
      ];
    case "insufficient_volume":
    default:
      return [
        {
          order: 1,
          title: "Vise 3 sessions d'au moins 2 h cette semaine",
          why: "En dessous de ce volume, aucun signal n'est interprétable.",
          expectedImpact: "Génère assez de données pour un vrai diagnostic.",
          effort: "moyen",
        },
        {
          order: 2,
          title: "Reste sur une seule catégorie par session",
          why: "Le volume seul ne suffit pas s'il est fragmenté.",
          expectedImpact: "Volume + cohérence = base exploitable.",
          effort: "faible",
        },
        {
          order: 3,
          title: "Note après chaque session ce qui a marché",
          why: "Sans observation, le volume ne se transforme pas en apprentissage.",
          expectedImpact: "Tu construis ta première vraie boucle d'amélioration.",
          effort: "faible",
        },
      ];
  }
}
