import type { StreamScore } from "@/types/analysis";

export interface StreamerDNA {
  archetype: string;
  subtitle: string;
  description: string;
  icon: string;
  color: "primary" | "warning" | "destructive" | "emerald" | "violet" | "sky";
  strengths: string[];
  blindspot: string;
  nextStep: string;
}

export function computeStreamerDNA(score: StreamScore): StreamerDNA {
  const { regularity, structure, content, positioning, momentum, monetization, overall } = score;

  // Score global faible — base fragile
  if (overall < 25) {
    return {
      archetype: "La Page Blanche",
      subtitle: "En cours de démarrage",
      description: "Ta chaîne n'a pas encore assez de signal pour se définir. C'est le bon moment pour poser les bases.",
      icon: "🌱",
      color: "destructive",
      strengths: ["Tout est possible", "Aucune mauvaise habitude à corriger"],
      blindspot: "L'absence de régularité empêche la croissance de démarrer",
      nextStep: "Commence par 3 streams par semaine aux mêmes horaires pendant 4 semaines",
    };
  }

  // Régularité + Structure élevées → Le Grinder
  if (regularity >= 70 && structure >= 65) {
    return {
      archetype: "Le Grinder",
      subtitle: "Régulier et endurant",
      description: "Tu es là, toujours. Tes sessions sont longues et ton planning est tenu. C'est la fondation la plus solide qui soit sur Twitch.",
      icon: "⚙️",
      color: "primary",
      strengths: ["Régularité exemplaire", "Sessions structurées"],
      blindspot: content < 50 ? "Tu ne convertis pas assez tes moments forts en clips" : "Ton positionnement peut être affiné",
      nextStep: content < 50 ? "Force-toi à créer 1 clip par stream — tes meilleurs moments méritent de survivre au live" : "Stabilise ta catégorie principale sur 3 semaines d'affilée",
    };
  }

  // Contenu + Régularité élevés → Le Créateur
  if (content >= 65 && regularity >= 55) {
    return {
      archetype: "Le Créateur",
      subtitle: "Du contenu qui dure",
      description: "Tu ne streams pas juste en live — tu produis. Tes clips circulent, ton contenu a une vie après le stream.",
      icon: "🎬",
      color: "emerald",
      strengths: ["Production de clips régulière", "Bon rythme de stream"],
      blindspot: structure < 55 ? "Tes sessions pourraient être plus longues pour maximiser chaque live" : "La monétisation reste un chantier à ouvrir",
      nextStep: structure < 55 ? "Allonge progressivement tes sessions à 2h minimum" : "Commence à partager tes clips sur Instagram ou TikTok",
    };
  }

  // Positionnement + Momentum élevés → Le Compétiteur
  if (positioning >= 70 && momentum >= 60) {
    return {
      archetype: "Le Compétiteur",
      subtitle: "Focus et actif",
      description: "Tu restes dans ta lane. Même catégorie, même ambition. Cette semaine tu es là — et la semaine prochaine aussi.",
      icon: "🎯",
      color: "sky",
      strengths: ["Positionnement stable", "Présence récente forte"],
      blindspot: content < 50 ? "Peu de clips pour capitaliser sur tes bons moments" : "La régularité sur la durée reste à confirmer",
      nextStep: content < 50 ? "1 clip par live minimum — même 30 secondes comptent" : "Maintiens ce rythme 4 semaines de plus pour ancrer l'habitude",
    };
  }

  // Régularité élevée mais Contenu faible → Le Régulier
  if (regularity >= 65 && content < 45) {
    return {
      archetype: "Le Régulier",
      subtitle: "Présent, mais discret",
      description: "Tu streams souvent et tes viewers peuvent compter sur toi. Mais hors live, ta chaîne est silencieuse.",
      icon: "📅",
      color: "warning",
      strengths: ["Planning tenu", "Viewers qui savent quand revenir"],
      blindspot: "Aucun clip ne survive à tes streams — ta chaîne n'existe pas entre les lives",
      nextStep: "Demande à tes viewers de clipper, ou crée toi-même 1-2 clips après chaque session",
    };
  }

  // Momentum faible → L'Irrégulier
  if (momentum < 30 && regularity < 50) {
    return {
      archetype: "L'Irrégulier",
      subtitle: "Par vagues",
      description: "Tu streames par burst — intense quelques jours, puis absent. L'algorithme Twitch récompense la constance, pas les marathons.",
      icon: "🌊",
      color: "warning",
      strengths: ["Intensité quand tu es là", "Motivation présente"],
      blindspot: "L'imprévisibilité empêche les viewers de créer l'habitude de te regarder",
      nextStep: "3 streams courts et réguliers valent plus que 1 marathon. Commence par bloquer 2 créneaux fixes",
    };
  }

  // Score moyen avec momentum élevé → L'Ascendant
  if (momentum >= 70 && overall >= 40) {
    return {
      archetype: "L'Ascendant",
      subtitle: "En progression",
      description: "Cette semaine est bonne. Tu es actif, tu construis. La trajectoire est là — l'enjeu est de la tenir.",
      icon: "📈",
      color: "emerald",
      strengths: ["Activité récente forte", "Score en construction"],
      blindspot: positioning < 50 ? "Tes changements de catégorie cassent la dynamique" : "La régularité sur la durée reste à prouver",
      nextStep: "Ne casse pas l'élan — planifie déjà les 2 prochaines semaines",
    };
  }

  // Score élevé → La Référence
  if (overall >= 75) {
    return {
      archetype: "La Référence",
      subtitle: "Base solide, exécution propre",
      description: "Ton channel tourne bien sur tous les axes. Tu as construit quelque chose de solide. L'étape suivante, c'est l'optimisation fine.",
      icon: "🏆",
      color: "primary",
      strengths: ["Performance globale forte", "Plusieurs dimensions dans le vert"],
      blindspot: monetization < 60 ? "La monétisation n'est pas encore à la hauteur du reste" : "Il reste de la marge sur le contenu hors-live",
      nextStep: monetization < 60 ? "Travaille ta visibilité hors Twitch pour élargir l'audience" : "Focus sur les clips courts pour maximiser la découvrabilité",
    };
  }

  // Défaut — En construction
  return {
    archetype: "En Construction",
    subtitle: "Base qui se forme",
    description: "Ton channel avance. Certains axes tiennent, d'autres restent à construire. C'est la phase la plus formatrice.",
    icon: "🔧",
    color: "warning",
    strengths: ["Potentiel identifiable", "Blocages connus"],
    blindspot: "Trop de dimensions encore fragiles pour un levier clair",
    nextStep: "Concentre-toi sur ta dimension la plus faible pendant 3 semaines avant de toucher au reste",
  };
}
