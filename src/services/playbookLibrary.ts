import type { AnalysisReport } from "@/types/analysis";

export type PlaybookTag =
  | "bio"
  | "schedule"
  | "clips"
  | "titles"
  | "category"
  | "clarity"
  | "community"
  | "structure"
  | "monetization";

export interface Playbook {
  slug: string;
  title: string;
  summary: string;
  tags: PlaybookTag[];
  /** Time to apply, in minutes. */
  timeMinutes: number;
  steps: string[];
  /** Short rationale tying the playbook to a typical weakness. */
  why: string;
}

export const PLAYBOOKS: Playbook[] = [
  {
    slug: "twitch-bio-clarity",
    title: "Clarifier sa bio Twitch en 15 minutes",
    summary: "Une bio qui dit qui tu es, ce que tu streames, et quand. Rien d'autre.",
    tags: ["bio", "clarity"],
    timeMinutes: 15,
    why: "Une bio floue fait fuir 70 % des nouveaux visiteurs en moins de 10 secondes.",
    steps: [
      "Ligne 1 : ton nom + ton format en 6 mots max (ex. 'Ranked Valorant FR · solo grind').",
      "Ligne 2 : ton planning fixe (ex. 'Mar/Jeu/Sam · 20h-23h').",
      "Ligne 3 : un lien clair (Discord ou Twitter), pas une liste de 8 réseaux.",
      "Supprime les emojis décoratifs qui n'ajoutent pas d'info.",
      "Vérifie sur mobile : la bio doit tenir sans dépliage.",
    ],
  },
  {
    slug: "post-stream-clips",
    title: "Créer 3 clips après chaque live",
    summary: "Le moteur de découvrabilité n°1 sur Twitch, et c'est gratuit.",
    tags: ["clips", "community"],
    timeMinutes: 20,
    why: "Les chaînes qui clippent régulièrement gagnent 2-3× plus de viewers de passage.",
    steps: [
      "À la fin du stream, ouvre l'onglet Créateur > Vidéos.",
      "Identifie 3 moments : un highlight gameplay, un moment chat, un moment réaction.",
      "Crée des clips de 30-50 secondes (pas plus).",
      "Donne-leur un titre concret : verbe + détail (ex. 'Clutch 1v3 sans armure').",
      "Partage le meilleur sur Twitter/TikTok dans les 24h.",
    ],
  },
  {
    slug: "stable-schedule",
    title: "Construire un planning stable en 7 jours",
    summary: "Trois créneaux fixes, et tu deviens prévisible pour ton audience.",
    tags: ["schedule", "structure"],
    timeMinutes: 30,
    why: "Sans horaire stable, les viewers fidèles ne peuvent pas créer d'habitude autour de toi.",
    steps: [
      "Bloque 3 créneaux récurrents dans ton agenda (mêmes jours, mêmes heures).",
      "Choisis des heures où tu es vraiment dispo, pas les 'idéales théoriques'.",
      "Affiche le planning en haut de ta bio Twitch et en épinglé sur Twitter.",
      "Respecte-le 4 semaines d'affilée, même si l'audience est faible.",
      "Au bout de 4 semaines, ajuste si nécessaire — mais pas avant.",
    ],
  },
  {
    slug: "stream-titles",
    title: "Mieux titrer ses streams",
    summary: "Un titre = une promesse. Si elle est floue, personne ne clique.",
    tags: ["titles", "clarity", "category"],
    timeMinutes: 10,
    why: "Un bon titre double le CTR depuis la directory Twitch.",
    steps: [
      "Format recommandé : [Catégorie/Mode] · [Angle clair] · [Intention].",
      "Exemple : 'Ranked Valorant · Push Immortal · Solo queue chill'.",
      "Évite les majuscules partout, les emojis décoratifs, et les '!!!' multiples.",
      "Mets l'info la plus importante au début (les 30 premiers caractères).",
      "Change le titre si tu changes vraiment d'activité — pas avant.",
    ],
  },
  {
    slug: "category-positioning",
    title: "Choisir sa catégorie principale",
    summary: "Twitch te recommande mieux quand tu es identifié à une niche.",
    tags: ["category", "clarity"],
    timeMinutes: 20,
    why: "Changer de catégorie en permanence dilue le signal envoyé à l'algorithme.",
    steps: [
      "Identifie la catégorie où tu prends le plus de plaisir et où tu es identifiable.",
      "Engage-toi à y faire au moins 70 % de tes sessions pendant 4 semaines.",
      "Garde 1 jour 'variety' max par semaine pour expérimenter.",
      "Mentionne ta catégorie principale dans ta bio.",
      "Au bout d'un mois, mesure : audience moyenne stable ? CTR meilleur ?",
    ],
  },
  {
    slug: "session-structure",
    title: "Structurer une session de 2-3h",
    summary: "Une session sans structure perd 40 % des viewers dans les 20 premières minutes.",
    tags: ["structure", "schedule"],
    timeMinutes: 25,
    why: "Une structure claire fidélise et donne envie de revenir.",
    steps: [
      "Intro courte (5 min) : présente le programme du jour.",
      "Bloc principal (90-120 min) : ton activité cœur sans interruption majeure.",
      "Pause chat (10-15 min) : interaction directe, lecture du chat.",
      "Bloc secondaire (30-45 min) : variation ou défi du jour.",
      "Outro (5 min) : récap, prochain stream, raid si possible.",
    ],
  },
  {
    slug: "discord-community",
    title: "Lancer un Discord minimal qui fonctionne",
    summary: "Pas besoin de 12 salons. 3 suffisent pour créer du lien.",
    tags: ["community", "schedule"],
    timeMinutes: 30,
    why: "Une communauté Discord active augmente la rétention live de 25-40 %.",
    steps: [
      "3 salons max au départ : #annonces, #général, #live-en-cours.",
      "Annonce chaque stream 1h avant dans #annonces avec un message court.",
      "Désigne 1-2 modos de confiance (pas toi-même).",
      "Pin un message d'accueil clair : qui tu es, quand tu streames, comment participer.",
      "Anime au moins 2× par semaine, même hors stream.",
    ],
  },
  {
    slug: "monetization-affiliate",
    title: "Préparer son passage à l'affiliation",
    summary: "Affiliation = 50 followers + 7 jours stream + 500 min + 3 viewers moyens.",
    tags: ["monetization", "schedule"],
    timeMinutes: 20,
    why: "Atteindre l'affiliation débloque les abonnements et change la dynamique de la chaîne.",
    steps: [
      "Vérifie où tu en es sur les 4 critères dans ton dashboard Twitch.",
      "Identifie le critère le plus en retard et concentre-toi dessus 2 semaines.",
      "Pour les viewers moyens : annonce tes lives 24h avant sur tous tes canaux.",
      "Pour les minutes : allonge tes sessions sans étirer artificiellement.",
      "Une fois affilié, configure tes émotes et tes alertes d'abo dans la semaine.",
    ],
  },
];

/**
 * Pick the most relevant playbook for the current diagnosis.
 * Strategy: take the weakest score dimension, map it to a tag, return the first
 * matching playbook. Fall back to the first playbook if no mapping found.
 */
export function recommendPlaybookForReport(report: AnalysisReport): Playbook {
  const weakest = report.score.breakdown.slice().sort((a, b) => a.score - b.score)[0];
  const dim = weakest?.dimension.toLowerCase() ?? "";
  const facts = report.facts;
  const clips30d = Number(facts.find((f) => f.key === "clips_30d")?.value ?? 0);

  const map: Record<string, PlaybookTag> = {
    regularity: "schedule",
    structure: "structure",
    content: "clips",
    positioning: "category",
    momentum: "clips",
    monetization: "monetization",
  };
  const tag = map[dim] ?? "clarity";
  if (clips30d < 2) {
    const p = PLAYBOOKS.find((p) => p.tags.includes("clips"));
    if (p) return p;
  }
  return PLAYBOOKS.find((p) => p.tags.includes(tag)) ?? PLAYBOOKS[0];
}

export function getPlaybookBySlug(slug: string): Playbook | null {
  return PLAYBOOKS.find((p) => p.slug === slug) ?? null;
}
