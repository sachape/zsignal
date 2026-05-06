export interface Resource {
  id: string;
  title: string;
  type: "conseil" | "exercice" | "concept";
  duration: string;
  summary: string;
}

// French dimension names match score.breakdown[].dimension exactly
const LIBRARY: Record<string, Resource[]> = {
  Régularité: [
    {
      id: "reg_1",
      title: "La règle des 2 créneaux fixes",
      type: "conseil",
      duration: "3 min",
      summary:
        "Choisir 2 jours de stream par semaine et les annoncer publiquement crée une attente. Ton audience s'adapte à ton calendrier — pas l'inverse. Poste ton planning chaque lundi.",
    },
    {
      id: "reg_2",
      title: "Le minimum viable streamer",
      type: "concept",
      duration: "5 min",
      summary:
        "Un live de 1h30 à heure fixe bat un marathon sporadique de 6h. La régularité construit la confiance de l'algorithme Twitch et de ton audience avant même la qualité du contenu.",
    },
    {
      id: "reg_3",
      title: "Exercice : le planning 4 semaines",
      type: "exercice",
      duration: "10 min",
      summary:
        "Prends un calendrier vide. Place 2 créneaux par semaine pendant 4 semaines. Bloque-les comme des réunions professionnelles. Colle une capture d'écran dans ton channel Discord dès ce soir.",
    },
  ],

  Structure: [
    {
      id: "str_1",
      title: "L'intro parfaite en 90 secondes",
      type: "conseil",
      duration: "4 min",
      summary:
        "Les 90 premières secondes décident si un viewer reste. Structure : accueil + contexte du live ('aujourd'hui on fait X car Y') + accroche ('dans 30 min on teste Z'). Prépare-le à l'avance.",
    },
    {
      id: "str_2",
      title: "La règle des segments de 45 min",
      type: "concept",
      duration: "3 min",
      summary:
        "Découper mentalement ton live en segments de 45 min avec un mini-objectif chacun maintient ton énergie et relance l'attention du chat. Annonce chaque transition à voix haute.",
    },
    {
      id: "str_3",
      title: "Exercice : le script d'intro",
      type: "exercice",
      duration: "15 min",
      summary:
        "Écris 5 phrases pour ton intro type. Pas un script mot pour mot — juste les 5 points clés : accueil, contexte, objectif du live, accroche, call-to-action (follow/raid). Lis-les à voix haute avant de lancer.",
    },
  ],

  Contenu: [
    {
      id: "cont_1",
      title: "Trouve ton angle différenciateur",
      type: "conseil",
      duration: "5 min",
      summary:
        "Même jeu que 10 000 autres streamers — angle différent. Exemples : le coach pédagogue, le rageur contrôlé, le commentateur analytique. Ton angle n'est pas le jeu, c'est ta personnalité appliquée au jeu.",
    },
    {
      id: "cont_2",
      title: "Le clip stratégique",
      type: "conseil",
      duration: "4 min",
      summary:
        "1 clip fort par live suffit pour nourrir les réseaux. Cible le moment le plus intense ou le plus drôle. Poste-le dans les 2h suivant ton live — la fenêtre d'attention est courte.",
    },
    {
      id: "cont_3",
      title: "Exercice : l'inventaire de moments",
      type: "exercice",
      duration: "10 min",
      summary:
        "Liste tes 3 meilleurs moments des 30 derniers jours. Qu'est-ce qui les a rendus mémorables ? Réponse = ton contenu fort. Programme au moins 1 moment de ce type dans chaque prochain live.",
    },
  ],

  Positionnement: [
    {
      id: "pos_1",
      title: "La catégorie principale : choisir et tenir",
      type: "conseil",
      duration: "4 min",
      summary:
        "Twitch te recommande là où tu es connu. Changer de catégorie trop souvent remet le compteur à zéro. Choisis une catégorie principale sur laquelle tu veux être trouvé et reste dessus 80% de ton temps.",
    },
    {
      id: "pos_2",
      title: "Le titre qui convertit",
      type: "conseil",
      duration: "3 min",
      summary:
        "Formule : [objectif concret] + [ton angle]. Exemples : 'Je climb jusqu'au Diamond ou j'arrête', 'Guide débutant Minecraft commenté'. Évite les titres vagues comme 'Gaming chill' ou 'Live du soir'.",
    },
    {
      id: "pos_3",
      title: "Exercice : l'audit de profil",
      type: "exercice",
      duration: "20 min",
      summary:
        "Ouvre ta chaîne Twitch comme si tu ne te connaissais pas. En 10 secondes : qui est ce streamer, qu'est-ce qu'il stream, pourquoi le suivre ? Si les réponses ne sont pas évidentes, mets à jour bio, panneaux et photo de profil.",
    },
  ],

  Momentum: [
    {
      id: "mom_1",
      title: "Construire avant de streamer",
      type: "conseil",
      duration: "5 min",
      summary:
        "Rejoins 3 communautés Discord de streamers similaires. Soit actif pendant 15 min par jour hors live. L'algorithme social te ramène des viewers si tu existes hors de ta chaîne.",
    },
    {
      id: "mom_2",
      title: "Le raid stratégique",
      type: "concept",
      duration: "3 min",
      summary:
        "Raider quelqu'un dans ta niche en fin de live construit des relations mutuelles. Cible des chaînes de taille similaire ou légèrement plus grande. La réciprocité crée du momentum sur le long terme.",
    },
    {
      id: "mom_3",
      title: "Exercice : 5 interactions par jour",
      type: "exercice",
      duration: "10 min",
      summary:
        "Pendant 7 jours : réagis à 5 clips de streamers de ta niche, réponds à 5 posts dans des communautés pertinentes. C'est 10 minutes par jour. L'objectif : exister dans l'écosystème avant le live.",
    },
  ],

  Monétisation: [
    {
      id: "mon_1",
      title: "Les 5 panneaux essentiels",
      type: "conseil",
      duration: "5 min",
      summary:
        "À minima : About, Schedule, Commands, Social links, et un panneau 'Comment soutenir'. Des panneaux complets signalent le sérieux de ta chaîne et guident les viewers vers l'action (follow, sub, clip).",
    },
    {
      id: "mon_2",
      title: "Configurer les alertes qui convertissent",
      type: "conseil",
      duration: "4 min",
      summary:
        "Les alertes de follow/sub doivent être visibles mais non intrusives. Règle : < 5 secondes d'animation, réaction vocale systématique. Chaque alert est une micro-célébriation qui fidélise le viewer.",
    },
    {
      id: "mon_3",
      title: "Exercice : le test en 10 min",
      type: "exercice",
      duration: "10 min",
      summary:
        "Ouvre ton tableau de bord Twitch Creator. Vérifie que chaque panneau est rempli, que ton horaire est à jour, que tes commandes chat fonctionnent. Résous les éléments manquants avant ton prochain live.",
    },
  ],
};

export function getResourcesForDimension(dimension: string): Resource[] {
  return LIBRARY[dimension] ?? [];
}

export function getResourcesForWeakDimensions(
  breakdown: Array<{ dimension: string; score: number }>,
  maxDimensions = 2,
  scoreThreshold = 65,
): Array<{ dimension: string; resources: Resource[] }> {
  return breakdown
    .filter((d) => d.score < scoreThreshold)
    .sort((a, b) => a.score - b.score)
    .slice(0, maxDimensions)
    .map((d) => ({
      dimension: d.dimension,
      resources: getResourcesForDimension(d.dimension),
    }))
    .filter((d) => d.resources.length > 0);
}
