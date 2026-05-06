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
  timeMinutes: number;
  steps: string[];
  why: string;
  difficulty: "easy" | "medium" | "hard";
  impact: "medium" | "high";
  keyInsight: string;
  proTip?: string;
}

export const PLAYBOOKS: Playbook[] = [
  // ── Clarté & bio ──────────────────────────────────────────────────────────
  {
    slug: "twitch-bio-clarity",
    title: "Clarifier sa bio Twitch en 15 minutes",
    summary: "Une bio qui dit qui tu es, ce que tu streames, et quand. Rien d'autre.",
    tags: ["bio", "clarity"],
    timeMinutes: 15,
    difficulty: "easy",
    impact: "high",
    why: "Une bio floue fait fuir 70 % des nouveaux visiteurs en moins de 10 secondes.",
    keyInsight: "La bio est la première chose lue par un visiteur. Tu as exactement 3 secondes pour le convaincre de rester.",
    steps: [
      "Ligne 1 : ton nom + ton format en 6 mots max (ex. 'Ranked Valorant FR · solo grind').",
      "Ligne 2 : ton planning fixe (ex. 'Mar/Jeu/Sam · 20h-23h').",
      "Ligne 3 : un lien clair (Discord ou Twitter), pas une liste de 8 réseaux.",
      "Supprime les emojis décoratifs qui n'ajoutent pas d'info.",
      "Vérifie sur mobile : la bio doit tenir sans dépliage.",
    ],
    proTip: "Teste ta bio auprès d'un ami qui ne te connaît pas : peut-il te décrire en 10 secondes après l'avoir lue ?",
  },
  {
    slug: "twitch-panels",
    title: "Optimiser ses panels Twitch",
    summary: "Tes panels sont une page de vente silencieuse. La plupart sont vides ou illisibles.",
    tags: ["clarity", "structure"],
    timeMinutes: 20,
    difficulty: "easy",
    impact: "medium",
    why: "70 % des visiteurs regardent les panels avant de décider de suivre. La plupart des panels ne contiennent que du remplissage.",
    keyInsight: "Chaque panel doit répondre à une question que ton visiteur se pose — pas juste te permettre de parler de toi.",
    steps: [
      "Panel 1 — À propos : qui tu es + ce que tu joues + ton planning en 3 lignes maximum.",
      "Panel 2 — Planning : tes jours et heures fixes, mis à jour chaque mois.",
      "Panel 3 — Rejoindre : un seul lien prioritaire (Discord ou Twitter).",
      "Panel 4 — Règles : 3 à 5 règles courtes, pas un règlement de 20 points.",
      "Supprime tous les panels vides ou marqués 'bientôt disponible'.",
      "Utilise des visuels cohérents : même palette, même style pour tous les panels.",
    ],
    proTip: "Un panel 'Soutenir' avec un lien Ko-fi peut générer 5-20€/mois dès maintenant, même avant l'affiliation.",
  },
  // ── Titres & catégories ───────────────────────────────────────────────────
  {
    slug: "stream-titles",
    title: "Mieux titrer ses streams",
    summary: "Un titre = une promesse. Si elle est floue, personne ne clique.",
    tags: ["titles", "clarity", "category"],
    timeMinutes: 10,
    difficulty: "easy",
    impact: "high",
    why: "Un bon titre double le CTR depuis la directory Twitch.",
    keyInsight: "Le titre est ton unique annonce gratuite dans une directory de milliers de streams — traite-le comme une pub.",
    steps: [
      "Format recommandé : [Catégorie/Mode] · [Angle clair] · [Intention].",
      "Exemple : 'Ranked Valorant · Push Immortal · Solo queue chill'.",
      "Évite les majuscules partout, les emojis décoratifs et les '!!!' multiples.",
      "Mets l'info la plus importante dans les 30 premiers caractères.",
      "Change le titre si tu changes vraiment d'activité — pas avant.",
    ],
  },
  {
    slug: "category-positioning",
    title: "Choisir sa catégorie principale",
    summary: "Twitch te recommande mieux quand tu es identifié à une niche.",
    tags: ["category", "clarity"],
    timeMinutes: 20,
    difficulty: "medium",
    impact: "high",
    why: "Changer de catégorie en permanence dilue le signal envoyé à l'algorithme.",
    keyInsight: "L'algorithme Twitch récompense la cohérence bien plus que la variété — sois identifiable avant d'être complet.",
    steps: [
      "Identifie la catégorie où tu prends le plus de plaisir et où tu es identifiable.",
      "Engage-toi à y faire au moins 70 % de tes sessions pendant 4 semaines.",
      "Garde 1 jour 'variety' max par semaine pour expérimenter sans brouiller le signal.",
      "Mentionne ta catégorie principale dans ta bio.",
      "Au bout d'un mois, mesure : audience moyenne stable ? CTR meilleur ?",
    ],
    proTip: "Si tu veux 2 catégories, crée deux identités distinctes (deux jours dédiés), jamais du mixing aléatoire.",
  },
  // ── Planning & régularité ─────────────────────────────────────────────────
  {
    slug: "stable-schedule",
    title: "Construire un planning stable en 7 jours",
    summary: "Trois créneaux fixes, et tu deviens prévisible pour ton audience.",
    tags: ["schedule", "structure"],
    timeMinutes: 30,
    difficulty: "medium",
    impact: "high",
    why: "Sans horaire stable, les viewers fidèles ne peuvent pas créer d'habitude autour de toi.",
    keyInsight: "La prévisibilité est le seul avantage compétitif accessible à n'importe qui, dès aujourd'hui.",
    steps: [
      "Bloque 3 créneaux récurrents dans ton agenda (mêmes jours, mêmes heures).",
      "Choisis des heures où tu es vraiment disponible, pas les 'idéales théoriques'.",
      "Affiche le planning en haut de ta bio Twitch et en épinglé sur Twitter.",
      "Respecte-le 4 semaines d'affilée, même si l'audience est faible au début.",
      "Au bout de 4 semaines, ajuste si nécessaire — mais pas avant.",
    ],
    proTip: "Crée un événement Google Calendar public et partage le lien — tes viewers les plus engagés s'y abonneront.",
  },
  {
    slug: "content-calendar",
    title: "Planifier 4 semaines de contenu en 1h",
    summary: "La planification transforme le 'qu'est-ce que je fais ce soir ?' en exécution fluide.",
    tags: ["schedule", "clips"],
    timeMinutes: 60,
    difficulty: "medium",
    impact: "high",
    why: "Les streamers qui planifient à l'avance streamtent 1,8× plus régulièrement que ceux qui décident au dernier moment.",
    keyInsight: "Ce que tu planifies la semaine d'avant, tu le fais. Ce que tu décides le jour même, tu l'annules.",
    steps: [
      "Bloque 1 heure chaque fin de mois pour planifier le mois suivant.",
      "Définis tes créneaux fixes de la semaine (jours + horaires).",
      "Pour chaque session, note : jeu/activité + angle + objectif d'engagement.",
      "Prévois 1 session 'spéciale' par mois : event, collab, marathon ou défi.",
      "Note les clips prévus et les contenus à recycler (clips → TikTok, Twitter).",
      "Laisse 20 % de créneaux flexibles pour les opportunités ou imprévus.",
    ],
    proTip: "Un tableau Notion simple (Date / Jeu / Angle / Statut) suffit — inutile d'investir dans un outil complexe.",
  },
  {
    slug: "smart-goals",
    title: "Se fixer des objectifs SMART pour sa chaîne",
    summary: "Sans objectif clair, tu optimises au hasard. Avec des objectifs SMART, chaque stream a un sens.",
    tags: ["schedule", "monetization"],
    timeMinutes: 20,
    difficulty: "easy",
    impact: "high",
    why: "Les streamers avec des objectifs écrits atteignent leurs paliers 40 % plus vite — l'intention change les comportements.",
    keyInsight: "Un objectif vague génère de l'anxiété. Un objectif SMART génère un plan d'action.",
    steps: [
      "Spécifique : définis UN objectif précis pour les 30 prochains jours.",
      "Mesurable : identifie la métrique exacte (viewers moyens, followers, heures streamées).",
      "Atteignable : vérifie que l'objectif est réaliste avec ta situation actuelle.",
      "Relevant : l'objectif doit rapprocher de l'affiliation ou d'un vrai palier de croissance.",
      "Temporel : fixe une date butoir et programme une revue hebdomadaire de 10 minutes.",
      "Écris l'objectif sur papier ou dans une note — ça triple les chances de l'atteindre.",
    ],
  },
  // ── Clips & découvrabilité ────────────────────────────────────────────────
  {
    slug: "post-stream-clips",
    title: "Créer 3 clips après chaque live",
    summary: "Le moteur de découvrabilité n°1 sur Twitch, et c'est gratuit.",
    tags: ["clips", "community"],
    timeMinutes: 20,
    difficulty: "easy",
    impact: "high",
    why: "Les chaînes qui clippent régulièrement gagnent 2-3× plus de viewers de passage.",
    keyInsight: "Un clip bien titré peut apporter 10× plus de découvertes organiques qu'un stream supplémentaire.",
    steps: [
      "À la fin du stream, ouvre l'onglet Créateur > Vidéos.",
      "Identifie 3 moments : un highlight gameplay, un moment chat, un moment réaction.",
      "Crée des clips de 30-50 secondes (pas plus).",
      "Donne-leur un titre concret : verbe + détail (ex. 'Clutch 1v3 sans armure').",
      "Partage le meilleur sur Twitter/TikTok dans les 24h suivant le live.",
    ],
    proTip: "Partage tes clips sur TikTok avec les hashtags #twitch et le nom du jeu — c'est le levier gratuit le plus sous-utilisé.",
  },
  // ── Structure de session ──────────────────────────────────────────────────
  {
    slug: "session-structure",
    title: "Structurer une session de 2-3h",
    summary: "Une session sans structure perd 40 % des viewers dans les 20 premières minutes.",
    tags: ["structure", "schedule"],
    timeMinutes: 25,
    difficulty: "medium",
    impact: "medium",
    why: "Une structure claire fidélise et donne envie de revenir.",
    keyInsight: "Les 20 premières minutes décident si un viewer reste ou part — structure-les toujours en premier.",
    steps: [
      "Intro courte (5 min) : présente le programme du jour et accueille le chat.",
      "Bloc principal (90-120 min) : ton activité cœur sans interruption majeure.",
      "Pause chat (10-15 min) : interaction directe, lecture des messages.",
      "Bloc secondaire (30-45 min) : variation ou défi du jour.",
      "Outro (5 min) : récap, annonce du prochain stream, raid si possible.",
    ],
  },
  {
    slug: "vod-analysis",
    title: "Analyser ses VoDs pour progresser vite",
    summary: "Regarder ses propres streams avec un œil critique est l'outil de progression le plus puissant.",
    tags: ["structure", "schedule"],
    timeMinutes: 30,
    difficulty: "medium",
    impact: "high",
    why: "Les streamers qui regardent leurs VoDs progressent 2× plus vite — l'œil extérieur sur soi-même change tout.",
    keyInsight: "Regarde tes VoDs comme un coach regarde un match : en cherchant les patterns, pas en te jugeant.",
    steps: [
      "Programme 30 minutes par semaine pour regarder 20-30 min de ta dernière VoD.",
      "Note les moments où tu as perdu des viewers (pic de départs dans les stats Twitch).",
      "Identifie 3 patterns récurrents : moments forts, moments creux, interactions réussies.",
      "Liste 2 choses à améliorer et 1 chose à garder absolument pour le prochain stream.",
      "Compare une VoD récente avec une d'il y a 1 mois — les progrès visibles motivent.",
    ],
    proTip: "Active les 'clips recommandés' dans l'outil Créateur Twitch — l'IA repère les moments de pic automatiquement.",
  },
  // ── Communauté ────────────────────────────────────────────────────────────
  {
    slug: "chat-engagement",
    title: "Animer son chat quand il est vide",
    summary: "Le silence tue les streams. Parler à 0 viewer forme l'habitude qui retient 50 viewers.",
    tags: ["community", "structure"],
    timeMinutes: 15,
    difficulty: "easy",
    impact: "high",
    why: "Les viewers qui voient un streamer muet ou mal à l'aise partent en moins de 3 minutes. Parler de façon engageante double la rétention.",
    keyInsight: "Parle toujours comme si 50 personnes regardaient — les 2 viewers actuels sentiront la différence immédiatement.",
    steps: [
      "Présente-toi et le programme du jour dès le début, même à 0 viewer.",
      "Commente chaque action en temps réel — pense à voix haute.",
      "Pose une question ouverte au chat toutes les 10-15 minutes.",
      "Crée des rituels récurrents : sondage d'ouverture, défi du stream, mot du chat.",
      "Lis et réponds à chaque message quand tu as moins de 10 viewers.",
      "Reconnecte-toi aux anciens messages si le chat est calme depuis quelques minutes.",
    ],
    proTip: "Configure un bot chat (Nightbot, StreamElements) avec des messages automatiques pour briser les silences.",
  },
  {
    slug: "raid-strategy",
    title: "Faire des raids qui créent des liens",
    summary: "Un raid bien fait te rapporte plus qu'une semaine de streaming supplémentaire.",
    tags: ["community", "monetization"],
    timeMinutes: 15,
    difficulty: "easy",
    impact: "medium",
    why: "Les streamers qui raidissent régulièrement reçoivent 3× plus de raids entrants — la réciprocité est réelle sur Twitch.",
    keyInsight: "Un raid, c'est un investissement social. Raider les bons streamers crée des alliances durables, pas juste un chiffre.",
    steps: [
      "En fin de stream, identifie 3 streamers dans ta catégorie avec 5-50 viewers.",
      "Préfère les streamers que tu connais déjà ou qui t'ont raidé par le passé.",
      "Annonce le raid à ton chat 2-3 minutes avant pour créer l'anticipation.",
      "Prépare un message de présentation sincère pour le streamer raidé.",
      "Reste 5 minutes dans le stream raidé pour créer une vraie connexion.",
      "Note les streamers que tu raidis — suis leur progression et entretiens le lien.",
    ],
    proTip: "Un groupe de 5-10 streamers en 'raid train' peut multiplier par 5 la croissance de chacun en 3 mois.",
  },
  {
    slug: "discord-community",
    title: "Lancer un Discord minimal qui fonctionne",
    summary: "Pas besoin de 12 salons. 3 suffisent pour créer du lien.",
    tags: ["community", "schedule"],
    timeMinutes: 30,
    difficulty: "medium",
    impact: "medium",
    why: "Une communauté Discord active augmente la rétention live de 25-40 %.",
    keyInsight: "Un Discord de 20 personnes actives vaut plus qu'une communauté silencieuse de 500.",
    steps: [
      "3 salons max au départ : #annonces, #général, #live-en-cours.",
      "Annonce chaque stream 1h avant dans #annonces avec un message court.",
      "Désigne 1-2 modérateurs de confiance — pas toi-même.",
      "Épingle un message d'accueil clair : qui tu es, quand tu streames, comment participer.",
      "Anime au moins 2× par semaine, même hors stream.",
    ],
    proTip: "Demande à tes 2-3 viewers les plus fidèles d'inviter un ami — le bouche-à-oreille en communauté est 5× plus efficace que la pub.",
  },
  {
    slug: "post-bad-stream",
    title: "Rebondir après un mauvais live",
    summary: "Chaque streamer vit des sessions en dessous de ses standards. Ce qui compte, c'est l'analyse, pas la culpabilité.",
    tags: ["structure", "community"],
    timeMinutes: 10,
    difficulty: "easy",
    impact: "medium",
    why: "Les streamers qui analysent leurs mauvaises sessions sans se juger progressent plus vite que ceux qui évitent l'inconfort.",
    keyInsight: "Un mauvais live est un feedback gratuit — traite-le comme une donnée, pas comme un verdict sur ta valeur.",
    steps: [
      "Attends au moins 1h après la session avant de l'analyser — jamais à chaud.",
      "Identifie 1 cause technique, 1 cause contenu, 1 cause externe.",
      "Écris 3 choses qui ont quand même bien fonctionné dans le stream.",
      "Définis 1 seul changement concret à faire pour le prochain stream.",
      "Communique brièvement sur Discord ou Twitter — l'authenticité fidélise.",
    ],
    proTip: "Envoie un message à tes viewers réguliers après une mauvaise session — la transparence crée une loyauté forte.",
  },
  // ── Alertes & technique ───────────────────────────────────────────────────
  {
    slug: "stream-alerts",
    title: "Configurer ses alertes sans surcharger le stream",
    summary: "Une alerte bien placée crée de l'émotion. Cinq alertes en 5 minutes créent du chaos.",
    tags: ["clarity", "community"],
    timeMinutes: 25,
    difficulty: "medium",
    impact: "medium",
    why: "Les overlays surchargés font fuir les nouveaux viewers — 30 % quittent dans les 2 premières minutes si l'interface est illisible.",
    keyInsight: "Chaque alerte interrompt ton stream — elle doit valoir cette interruption pour le viewer, pas juste pour toi.",
    steps: [
      "Active uniquement 3 types d'alertes : nouveau follower, abonnement, raid.",
      "Garde les alertes courtes : 3-5 secondes max pour un follow, 5-8 pour un abonnement.",
      "Utilise un son distinctif mais pas agressif — teste le volume à -15 dB maximum.",
      "Désactive les alertes de Bits sous 50 et de hosts sous 5 viewers.",
      "Teste toutes tes alertes en mode preview avant chaque stream.",
      "Supprime les alertes 'refollow' — elles n'apportent rien au viewer.",
    ],
    proTip: "Streamlabs et StreamElements permettent de programmer des pauses d'alertes pendant les moments intenses du gameplay.",
  },
  // ── Monétisation ──────────────────────────────────────────────────────────
  {
    slug: "monetization-affiliate",
    title: "Préparer son passage à l'affiliation",
    summary: "Affiliation = 50 followers + 7 jours stream + 500 min + 3 viewers moyens.",
    tags: ["monetization", "schedule"],
    timeMinutes: 20,
    difficulty: "easy",
    impact: "high",
    why: "Atteindre l'affiliation débloque les abonnements et change la dynamique de la chaîne.",
    keyInsight: "Les chaînes qui se préparent activement à l'affiliation l'atteignent 2× plus vite que celles qui attendent.",
    steps: [
      "Vérifie où tu en es sur les 4 critères dans ton dashboard Twitch.",
      "Identifie le critère le plus en retard et concentre-toi dessus pendant 2 semaines.",
      "Pour les viewers moyens : annonce tes lives 24h avant sur tous tes canaux.",
      "Pour les minutes streamées : allonge tes sessions sans étirer artificiellement le contenu.",
      "Une fois affilié, configure tes émotes et tes alertes d'abonnement dans la semaine.",
    ],
  },
];

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

export function getRelatedPlaybooks(playbook: Playbook, count = 2): Playbook[] {
  const others = PLAYBOOKS.filter((p) => p.slug !== playbook.slug);
  const scored = others.map((p) => ({
    playbook: p,
    score: p.tags.filter((t) => playbook.tags.includes(t)).length,
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, count).map((s) => s.playbook);
}
