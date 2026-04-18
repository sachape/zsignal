import type { AnalysisReport, CompetitorMatch } from "@/types/analysis";
import { diagnoseFoundationMode } from "./foundationMode";

/**
 * Concrete, repeatable mechanics small streamers can copy this week.
 *
 * Each opportunity carries a structured triple (what / why / test-this-week)
 * so the UI never falls back to vague advice. Opportunities are ordered by
 * the foundation blocker first, then enriched with mechanics extracted from
 * real competitors when their content_format is informative.
 */
export interface CopyableOpportunity {
  id: string;
  /** Short title — the mechanic itself. */
  what: string;
  /** Why this mechanic matters for a small streamer. */
  why: string;
  /** Concrete test for the next 7 days. */
  testThisWeek: string;
  /** Optional source competitor login when the mechanic was extracted from one. */
  sourceLogin?: string;
  /** UI tag: "Mécanique fondation" / "Observée sur …" / "Pattern niche". */
  sourceLabel: string;
}

/**
 * Foundation-stage mechanics, ordered by blocker priority. These are what we
 * recommend even when no competitor data is available at all.
 */
const FOUNDATION_OPPORTUNITIES: Record<string, CopyableOpportunity[]> = {
  no_cadence: [
    {
      id: "fnd-cadence-bio",
      what: "Afficher le planning dans la bio et les panels",
      why: "Une chaîne sans planning lisible est invisible pour les viewers de passage.",
      testThisWeek: "Écris 3 créneaux fixes dans ta bio et un panel dédié, garde-les inchangés 7 jours.",
      sourceLabel: "Mécanique fondation",
    },
    {
      id: "fnd-cadence-ann",
      what: "Annoncer chaque stream 24 h avant",
      why: "Le rappel J-1 est ce qui transforme un planning théorique en présence réelle.",
      testThisWeek: "Poste un rappel court 24 h avant chaque stream cette semaine, mesure le pic d'ouverture.",
      sourceLabel: "Mécanique fondation",
    },
  ],
  weak_positioning: [
    {
      id: "fnd-pos-title",
      what: "Construire un titre type : Catégorie · angle · intention",
      why: "Un titre clair augmente le taux de clic depuis la directory, surtout pour une petite chaîne.",
      testThisWeek: "Garde ce format de titre sur tes 5 prochains streams, compare les viewers de passage.",
      sourceLabel: "Mécanique fondation",
    },
    {
      id: "fnd-pos-cat",
      what: "Tenir une seule catégorie principale par semaine",
      why: "Changer de catégorie casse le bénéfice algorithmique de la directory.",
      testThisWeek: "Choisis 1 catégorie pour la semaine, refuse toute variation en cours de live.",
      sourceLabel: "Mécanique fondation",
    },
  ],
  no_clips_loop: [
    {
      id: "fnd-clips-3",
      what: "Publier 3 clips après chaque session",
      why: "Sans clips, la chaîne n'existe pas hors du live. C'est ta seule surface de découverte continue.",
      testThisWeek: "Repère 3 moments forts en live, publie les clips dans les 24 h, mesure les vues à J+7.",
      sourceLabel: "Mécanique fondation",
    },
    {
      id: "fnd-clips-angle",
      what: "Choisir un angle unique pour tes clips",
      why: "Des clips dispersés ne construisent ni format ni reconnaissance.",
      testThisWeek: "Pendant 7 jours, tous tes clips suivent le même angle (ex : punchlines, gros plays, fails).",
      sourceLabel: "Mécanique fondation",
    },
  ],
  no_return_habit: [
    {
      id: "fnd-return-rituel",
      what: "Ouvrir et clôturer chaque stream avec le même rituel",
      why: "Un rituel court rend la chaîne mémorable et augmente le taux de retour.",
      testThisWeek: "Une phrase d'ouverture identique + l'annonce du prochain stream à la fin, sur 7 jours.",
      sourceLabel: "Mécanique fondation",
    },
  ],
  insufficient_volume: [
    {
      id: "fnd-vol-3x2",
      what: "Viser 3 sessions d'au moins 2 h cette semaine",
      why: "En dessous de ce volume, aucun signal n'est interprétable.",
      testThisWeek: "Bloque 3 créneaux de 2 h minimum, tiens-les sans en sauter un.",
      sourceLabel: "Mécanique fondation",
    },
  ],
};

/** Generic mechanics used as last-resort filler. Always solid for small streamers. */
const GENERIC_OPPORTUNITIES: CopyableOpportunity[] = [
  {
    id: "gen-bio",
    what: "Planning visible dans la bio (3 créneaux, mêmes jours)",
    why: "C'est le premier signal de sérieux que voient les viewers de passage.",
    testThisWeek: "Affiche tes 3 créneaux fixes dans la bio, ne change rien pendant 7 jours.",
    sourceLabel: "Pattern niche",
  },
  {
    id: "gen-title",
    what: "Titre en deux temps : promesse + accroche",
    why: "Un titre purement descriptif ne génère pas de clic depuis la directory.",
    testThisWeek: "Réécris tes titres en 'objectif clair · accroche émotionnelle' sur 5 streams.",
    sourceLabel: "Pattern niche",
  },
  {
    id: "gen-clip",
    what: "Un clip court par stream, posté dans les 24 h",
    why: "C'est la seule source de vues passives accessible à une petite chaîne.",
    testThisWeek: "Publie 1 clip de moins de 30 s après chaque stream, mesure les vues à J+7.",
    sourceLabel: "Pattern niche",
  },
  {
    id: "gen-cat",
    what: "Catégorie principale assumée en premier mot du titre",
    why: "Cela renforce ton positionnement dans la directory et te rend identifiable.",
    testThisWeek: "Mets le nom de ta catégorie en début de titre sur tes 5 prochains streams.",
    sourceLabel: "Pattern niche",
  },
];

/** Convert a competitor's content_format into a concrete, copyable mechanic. */
function competitorMechanic(c: CompetitorMatch): CopyableOpportunity | null {
  const base = {
    sourceLogin: c.competitor_login,
    sourceLabel: `Observée sur ${c.display_name}`,
  };
  switch (c.content_format) {
    case "ranked":
      return {
        ...base,
        id: `cmp-ranked-${c.competitor_login}`,
        what: "Une session ranked dédiée par semaine, sans variety au milieu",
        why: "La ranked pure crée un public spécifique qui revient pour ce format précis.",
        testThisWeek: "Bloque 1 créneau ranked clair cette semaine, sans changement de jeu.",
      };
    case "casting":
      return {
        ...base,
        id: `cmp-cast-${c.competitor_login}`,
        what: "Un format d'analyse court (10 min) en début ou fin de stream",
        why: "Ça donne une raison de venir 'juste pour ce moment', même sans regarder tout le live.",
        testThisWeek: "Annonce ton créneau d'analyse à l'avance, tiens-le 3 streams d'affilée.",
      };
    case "chill":
      return {
        ...base,
        id: `cmp-chill-${c.competitor_login}`,
        what: "Un créneau 'chill' identifiable dans le planning",
        why: "Le chill ne fonctionne que s'il est attendu, pas improvisé.",
        testThisWeek: "Étiquette 1 créneau de la semaine comme 'chill', garde une ambiance constante.",
      };
    case "variety":
      return {
        ...base,
        id: `cmp-var-${c.competitor_login}`,
        what: "Annoncer chaque variation 24 h avant pour préparer l'audience",
        why: "Sans annonce, la variety est perçue comme de l'instabilité, pas comme un format.",
        testThisWeek: "Annonce chaque changement de jeu 24 h avant sur ton réseau le plus actif.",
      };
    case "educational":
      return {
        ...base,
        id: `cmp-edu-${c.competitor_login}`,
        what: "Un format tutoriel récurrent (même jour, même heure)",
        why: "L'éducatif fidélise très fort dès qu'il devient un rendez-vous.",
        testThisWeek: "Bloque 1 créneau tuto cette semaine, annonce-le 48 h avant.",
      };
    case "reaction":
      return {
        ...base,
        id: `cmp-rea-${c.competitor_login}`,
        what: "Une rubrique réaction courte intégrée au début du live",
        why: "Une rubrique courte donne un point d'entrée clair aux viewers de passage.",
        testThisWeek: "Ouvre 3 streams cette semaine par 5 min de réactions sur un thème unique.",
      };
    default:
      return null;
  }
}

/**
 * Build the final, never-empty list of copyable opportunities. The order is:
 *
 * 1) Foundation-stage mechanics tied to the current blocker (always available).
 * 2) Mechanics extracted from real competitors when their format is informative.
 * 3) Generic niche patterns as last-resort filler.
 *
 * Capped at 6 to keep the page focused.
 */
export function buildCopyableOpportunities(
  report: AnalysisReport,
): CopyableOpportunity[] {
  const out: CopyableOpportunity[] = [];
  const seen = new Set<string>();
  const push = (op: CopyableOpportunity | null) => {
    if (!op || seen.has(op.id)) return;
    seen.add(op.id);
    out.push(op);
  };

  const foundation = diagnoseFoundationMode(report);
  if (foundation.isActive) {
    for (const op of FOUNDATION_OPPORTUNITIES[foundation.blocker.key] ?? []) {
      push(op);
    }
  }

  const matches = report.competitor_groups.flatMap((g) => g.matches);
  for (const m of matches) {
    if (out.length >= 6) break;
    push(competitorMechanic(m));
  }

  for (const g of GENERIC_OPPORTUNITIES) {
    if (out.length >= 6) break;
    push(g);
  }

  return out.slice(0, 6);
}
