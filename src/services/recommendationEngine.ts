import type { StreamScore, ChannelFact, Recommendation } from "@/types/analysis";

function getFact(facts: ChannelFact[], key: string): number {
  const f = facts.find((f) => f.key === key);
  return typeof f?.value === "number" ? f.value : 0;
}

let idCounter = 0;
function nextId() { return `rec-${++idCounter}`; }

export function generateRecommendations(
  score: StreamScore,
  facts: ChannelFact[]
): Recommendation[] {
  idCounter = 0;
  const recs: Recommendation[] = [];

  const streams30d = getFact(facts, "streams_30d");
  const clips30d = getFact(facts, "clips_30d");
  const catSwitchRate = getFact(facts, "category_switch_rate");
  const followersRemaining = getFact(facts, "followers_remaining");
  const avgViewersRemaining = getFact(facts, "avg_viewers_remaining");
  const consistency = getFact(facts, "posting_consistency_score");
  const avgDuration = getFact(facts, "avg_duration_minutes");

  // Priority recommendations (up to 3)
  if (score.regularity < 50 && streams30d < 8) {
    recs.push({
      id: nextId(), priority: 1, type: "priority",
      title: "Augmente ta fréquence de stream",
      reason: `Tu n'as streamé que ${streams30d} fois en 30 jours. La régularité est le premier levier de croissance sur Twitch.`,
      action: "Planifie au moins 3 sessions par semaine à heures fixes. Commence par bloquer 3 créneaux dans ton agenda.",
      category: "regularity", is_locked: false,
    });
  }

  if (clips30d < 2) {
    recs.push({
      id: nextId(), priority: recs.length + 1, type: "priority",
      title: "Crée plus de clips",
      reason: `Seulement ${clips30d} clip(s) en 30 jours. Les clips sont le moteur de découvrabilité n°1 sur Twitch.`,
      action: "Après chaque session, crée 1-2 clips des meilleurs moments. Encourage tes viewers à clipper aussi.",
      category: "content", is_locked: false,
    });
  }

  if (catSwitchRate > 50) {
    recs.push({
      id: nextId(), priority: recs.length + 1, type: "priority",
      title: "Stabilise ta catégorie",
      reason: "Tu changes de catégorie trop souvent. L'algorithme Twitch te recommande mieux quand tu es identifié à une niche.",
      action: "Choisis ta catégorie principale et tiens-y pendant au moins 3 semaines. Tu peux varier 1 jour par semaine.",
      category: "positioning", is_locked: false,
    });
  }

  if (consistency < 40) {
    recs.push({
      id: nextId(), priority: recs.length + 1, type: "priority",
      title: "Fixe un planning régulier",
      reason: "Ton planning est imprévisible. Les viewers fidèles ont besoin de savoir quand tu es en live.",
      action: "Affiche un planning dans ta bio et tes réseaux sociaux. Respecte-le 4 semaines de suite pour créer l'habitude.",
      category: "regularity", is_locked: false,
    });
  }

  if (score.structure < 50 && avgDuration < 120) {
    recs.push({
      id: nextId(), priority: recs.length + 1, type: "priority",
      title: "Allonge tes sessions",
      reason: `Tes streams durent en moyenne ${avgDuration} min. C'est trop court pour capter et fidéliser une audience.`,
      action: "Vise des sessions de 2h à 3h. Prépare une structure : intro, contenu principal, chat de fin.",
      category: "structure", is_locked: false,
    });
  }

  // Keep top 3 priority recs
  const priorityRecs = recs.slice(0, 3);

  // Next best action
  const weakest = score.breakdown.sort((a, b) => a.score - b.score)[0];
  const forceClipAction = clips30d === 0 && streams30d >= 1;
  const nextAction: Recommendation = forceClipAction
    ? {
        id: nextId(), priority: 0, type: "next-action",
        title: "Crée 1 clip à partir de ton dernier live",
        reason: "Tu as relancé un live mais aucun clip n'en est sorti — c'est le levier de découvrabilité le plus rapide.",
        action: "Transforme ton dernier live en au moins 1 clip publiable.",
        category: "content",
        is_locked: false,
      }
    : {
        id: nextId(), priority: 0, type: "next-action",
        title: weakest?.levers[0] || "Continue sur ta lancée",
        reason: weakest?.reasons[0] || "Ton score est équilibré — maintiens ta régularité.",
        action: weakest?.levers[0] || "Reviens demain et streame à la même heure.",
        category: weakest?.dimension?.toLowerCase() || "general",
        is_locked: false,
      };

  // Short-term goal
  let goalTitle = "Atteins 50 followers";
  let goalReason = "C'est le premier palier vers l'affiliation Twitch.";
  let goalAction = "Partage ton lien sur tes réseaux et invite tes amis.";
  if (followersRemaining === 0 && avgViewersRemaining > 0) {
    goalTitle = "Passe à 3 viewers moyens";
    goalReason = "Tu as les followers — il te manque l'audience en live pour l'affiliation.";
    goalAction = "Annonce tes lives en avance sur Discord et Twitter.";
  } else if (followersRemaining === 0 && avgViewersRemaining === 0) {
    goalTitle = "Candidate à l'affiliation";
    goalReason = "Tu remplis les conditions ! Il est temps de passer au niveau suivant.";
    goalAction = "Vérifie tes critères d'affiliation dans ton tableau de bord Twitch.";
  }

  const shortTermGoal: Recommendation = {
    id: nextId(), priority: 0, type: "short-term-goal",
    title: goalTitle,
    reason: goalReason,
    action: goalAction,
    category: "monetization",
    is_locked: false,
  };

  return [...priorityRecs, nextAction, shortTermGoal];
}
