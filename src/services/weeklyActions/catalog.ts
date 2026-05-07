// Static catalog of action candidates. Deterministic, pure.
// Each candidate emits its own category, evidence and reason from the
// SignalBundle. No regex, no inference from titles.

import type { ActionCandidate, SignalBundle } from "./types";

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`;
}

const setup_complete_twitch_foundation: ActionCandidate = {
  action_key: "setup_complete_twitch_foundation",
  category: "setup",
  title: "Complète ta base Twitch avant d'optimiser",
  description:
    "Vérifie ton profil, tes panneaux et lance une première session complète.",
  reason: () =>
    "Pas encore assez de signaux fiables (profil, lives, débriefs) pour générer des recommandations précises.",
  expected_impact:
    "Donner un point de départ clair pour les prochaines recommandations.",
  difficulty: "easy",
  confidence: "high",
  verification_signal: "live_sessions.count_increase",
  auto_verifiable: false,
  source_type: "setup",
  source_ref: () => null,
  evidence: (s) => ({
    sessions_count: s.sessions_count,
    debriefs_count: s.debriefs_count,
  }),
  eligible: (s) =>
    s.maturity_state === "setup" ||
    (s.sessions_count < 2 && s.debriefs_count === 0),
  score: () => ({ urgency: 5, impact: 4 }),
  critical: (s) => s.maturity_state === "setup",
};

const consistency_schedule_next_live: ActionCandidate = {
  action_key: "consistency_schedule_next_live",
  category: "consistency",
  title: "Planifie ton prochain live cette semaine",
  description: "Bloque un créneau réaliste et tiens-le.",
  reason: (s) =>
    s.days_since_last === null
      ? "Aucune session récente détectée."
      : `Aucun live depuis ${s.days_since_last} jours.`,
  expected_impact: "Reconstruire une régularité minimale exploitable.",
  difficulty: "easy",
  confidence: "high",
  verification_signal: "live_sessions.next_started",
  auto_verifiable: true,
  source_type: "inactivity",
  source_ref: (s) => s.last_session?.id ?? null,
  evidence: (s) => ({
    inactivity_tier: s.inactivity_tier,
    days_since_last: s.days_since_last,
  }),
  eligible: (s) =>
    s.maturity_state === "inactive" ||
    s.inactivity_tier === "soft" ||
    s.inactivity_tier === "paused" ||
    s.inactivity_tier === "rebuild",
  score: (s) => {
    const tierUrgency: Record<string, number> = {
      rebuild: 6,
      paused: 5,
      soft: 4,
      active: 0,
    };
    return { urgency: tierUrgency[s.inactivity_tier] ?? 3, impact: 4 };
  },
  critical: (s) => s.inactivity_tier !== "active",
};

const consistency_protect_streak: ActionCandidate = {
  action_key: "consistency_protect_streak",
  category: "consistency",
  title: "Garde le même créneau pour ton prochain live",
  description: "Reproduire un horaire stable est le plus gros levier de fidélité.",
  reason: (s) =>
    `Tu as ${s.recent_sessions_count} sessions récentes — protéger la cadence vaut plus qu'un test.`,
  expected_impact:
    "Fidéliser les viewers récurrents en évitant la friction de planning.",
  difficulty: "easy",
  confidence: "medium",
  verification_signal: "live_sessions.same_slot",
  auto_verifiable: false,
  source_type: "consistency",
  source_ref: (s) => s.last_session?.id ?? null,
  evidence: (s) => ({ recent_sessions_count: s.recent_sessions_count }),
  eligible: (s) =>
    s.maturity_state !== "setup" &&
    s.maturity_state !== "inactive" &&
    s.recent_sessions_count >= 2,
  score: () => ({ urgency: 3, impact: 3 }),
};

const content_create_clips_from_last_live: ActionCandidate = {
  action_key: "content_create_clips_from_last_live",
  category: "content",
  title: "Sélectionne 2 nouveaux clips à réutiliser cette semaine",
  description:
    "Choisis ou crée 2 nouveaux clips à partir de tes lives récents pour nourrir la découverte hors live.",
  reason: () =>
    "Une session récente existe mais aucun signal de réutilisation de contenu n'est détecté.",
  expected_impact: "Augmenter la découverte hors live.",
  difficulty: "easy",
  confidence: "high",
  verification_signal: "twitch_clips.count_increase",
  auto_verifiable: true,
  source_type: "content",
  source_ref: (s) => s.last_session?.id ?? null,
  evidence: (s) => ({
    last_session_id: s.last_session?.id ?? null,
    last_session_ended_at: s.last_session?.ended_at ?? null,
    baseline_clip_count: 0,
    baseline_clip_ids: [],
  }),
  eligible: (s) =>
    (s.maturity_state === "active" || s.maturity_state === "growth") &&
    s.last_session !== null,
  score: () => ({ urgency: 3, impact: 4 }),
};

const positioning_stabilize_title_category: ActionCandidate = {
  action_key: "positioning_stabilize_title_category",
  category: "positioning",
  title: "Stabilise ton titre et ta catégorie cette semaine",
  description:
    "Garde le même titre et la même catégorie pendant tout le live.",
  reason: (s) =>
    `${s.channel_updates_count_14d} changements de titre/catégorie sur 14 jours suggèrent un positionnement instable.`,
  expected_impact: "Aider les viewers à comprendre à quoi s'attendre.",
  difficulty: "easy",
  confidence: "high",
  verification_signal: "channel_update_history.count_decrease",
  auto_verifiable: true,
  source_type: "channel_update_history",
  source_ref: () => null,
  evidence: (s) => ({
    channel_updates_count_14d: s.channel_updates_count_14d,
  }),
  eligible: (s) => s.channel_updates_count_14d >= 3,
  score: (s) => ({
    urgency: Math.min(6, 2 + Math.floor(s.channel_updates_count_14d / 3)),
    impact: 4,
  }),
};

const community_reinforce_momentum: ActionCandidate = {
  action_key: "community_reinforce_momentum",
  category: "community",
  title: "Transforme le momentum communauté en engagement",
  description:
    "Remercie nominativement tes nouveaux followers/subs et organise un moment dédié.",
  reason: (s) =>
    `${s.community_events_count_14d} événements communauté récents (${s.community_event_kinds
      .slice(0, 3)
      .join(", ")}).`,
  expected_impact: "Convertir une activité ponctuelle en viewers récurrents.",
  difficulty: "medium",
  confidence: "high",
  verification_signal: "community_events.engagement_increase",
  auto_verifiable: false,
  source_type: "community_events",
  source_ref: () => null,
  evidence: (s) => ({
    community_events_count_14d: s.community_events_count_14d,
    kinds: s.community_event_kinds.slice(0, 5),
  }),
  eligible: (s) => s.community_events_count_14d >= 3,
  score: (s) => ({
    urgency: 4,
    impact: Math.min(6, 3 + Math.floor(s.community_events_count_14d / 4)),
  }),
};

const debrief_fix_priority_weakness: ActionCandidate = {
  action_key: "debrief_fix_priority_weakness",
  category: "content",
  title: "Corrige le point faible identifié au dernier débrief",
  description: "Concentre-toi sur la priorité issue de l'analyse.",
  reason: (s) => {
    const w = s.latest_weakness ? `Point faible : ${truncate(s.latest_weakness, 80)}.` : "";
    const p = s.latest_priority_action
      ? ` Priorité : ${truncate(s.latest_priority_action, 80)}.`
      : "";
    return (w + p).trim() || "Le dernier débrief identifie un levier prioritaire.";
  },
  expected_impact: "Améliorer la partie la plus faible du prochain stream.",
  difficulty: "medium",
  confidence: "high",
  verification_signal: "live_debriefs.weakness_change",
  auto_verifiable: false,
  source_type: "live_debrief",
  source_ref: (s) => s.latest_debrief?.id ?? null,
  evidence: (s) => ({
    latest_debrief_id: s.latest_debrief?.id ?? null,
    weakness: s.latest_weakness,
    priority_action: s.latest_priority_action,
  }),
  eligible: (s) =>
    Boolean(s.latest_priority_action || s.latest_weakness) &&
    s.maturity_state !== "setup" &&
    s.maturity_state !== "inactive",
  score: () => ({ urgency: 5, impact: 5 }),
  critical: (s) => Boolean(s.latest_priority_action),
};

const discovery_review_tags_category: ActionCandidate = {
  action_key: "discovery_review_tags_category",
  category: "discovery",
  title: "Revois tes tags et ta catégorie pour la découverte",
  description:
    "Choisis 1 catégorie principale claire et des tags cohérents avec ton format.",
  reason: () =>
    "Aucun signal récent indiquant un travail explicite sur la découverte.",
  expected_impact:
    "Augmenter les chances d'apparaître pour la bonne audience.",
  difficulty: "easy",
  confidence: "medium",
  verification_signal: "channel_update_history.category_stable",
  auto_verifiable: false,
  source_type: "discovery",
  source_ref: () => null,
  evidence: (s) => ({
    channel_updates_count_14d: s.channel_updates_count_14d,
  }),
  eligible: (s) =>
    (s.maturity_state === "active" || s.maturity_state === "growth") &&
    s.channel_updates_count_14d < 3,
  score: () => ({ urgency: 2, impact: 3 }),
};

const monetization_review_affiliate_path: ActionCandidate = {
  action_key: "monetization_review_affiliate_path",
  category: "monetization",
  title: "Vérifie où tu en es du chemin Affilié",
  description:
    "50 followers, 500 minutes diffusées, 7 jours uniques, 3 viewers en moyenne.",
  reason: () =>
    "Phase de croissance détectée — clarifier les jalons monétisation aide à structurer la semaine.",
  expected_impact:
    "Aligner les efforts hebdomadaires avec un objectif mesurable.",
  difficulty: "easy",
  confidence: "low",
  verification_signal: "twitch_profile.broadcaster_type_change",
  auto_verifiable: true,
  source_type: "monetization",
  source_ref: () => null,
  evidence: (s) => ({
    facts_available: s.facts_available,
    stream_score: s.stream_score_latest,
  }),
  eligible: (s) => s.maturity_state === "growth",
  score: () => ({ urgency: 1, impact: 3 }),
};

function scoreEvidence(s: SignalBundle): Record<string, unknown> {
  const m = s.stream_score_movement;
  return {
    overall_delta: m.overall_delta,
    movement_status: m.movement_status,
    priority_dimension: m.priority_dimension,
    top_positive_dimension: m.top_positive_dimension,
    top_negative_dimension: m.top_negative_dimension,
    confidence: m.confidence,
  };
}

function priorityIs(s: SignalBundle, dim: string): boolean {
  const m = s.stream_score_movement;
  const norm = (x: string | null): string | null => {
    if (!x) return null;
    const map: Record<string, string> = {
      Régularité: "regularity",
      Structure: "structure",
      Contenu: "content",
      Positionnement: "positioning",
      Momentum: "momentum",
      Monétisation: "monetization",
    };
    return map[x] ?? x;
  };
  return norm(m.priority_dimension) === dim || m.top_negative_dimension === dim;
}

const score_refresh_analysis: ActionCandidate = {
  action_key: "score_refresh_analysis",
  category: "setup",
  title: "Relance une analyse pour mettre ton StreamScore à jour",
  description:
    "Ton dernier StreamScore date de plus de 7 jours — relance une analyse pour repartir d'un diagnostic fiable.",
  reason: () =>
    "Le dernier StreamScore a plus de 7 jours et n'est plus représentatif.",
  expected_impact:
    "Obtenir un diagnostic à jour avant d'optimiser quoi que ce soit.",
  difficulty: "easy",
  confidence: "high",
  verification_signal: "stream_score_snapshots.recent",
  auto_verifiable: true,
  source_type: "stream_score",
  source_ref: () => null,
  evidence: scoreEvidence,
  eligible: (s) => s.stream_score_movement.is_stale === true,
  score: () => ({ urgency: 6, impact: 4 }),
  critical: (s) => s.stream_score_movement.is_stale === true,
};

const score_focus_content: ActionCandidate = {
  action_key: "score_focus_content",
  category: "content",
  title: "Priorise le contenu réutilisable cette semaine",
  description:
    "Investis ta semaine sur clips, shorts ou rediffusions pour renforcer la dimension Contenu.",
  reason: () =>
    "Ton StreamScore identifie le Contenu comme principal frein à la progression.",
  expected_impact:
    "Améliorer la découverte hors live et compenser un point faible identifié.",
  difficulty: "medium",
  confidence: "medium",
  verification_signal: "stream_score_snapshots.content_increase",
  auto_verifiable: false,
  source_type: "stream_score",
  source_ref: () => null,
  evidence: scoreEvidence,
  eligible: (s) =>
    s.stream_score_movement.has_enough_history === true ||
    s.stream_score_latest !== null
      ? priorityIs(s, "content")
      : false,
  score: () => ({ urgency: 4, impact: 4 }),
};

const score_focus_regularite: ActionCandidate = {
  action_key: "score_focus_regularite",
  category: "consistency",
  title: "Stabilise ta régularité cette semaine",
  description:
    "Programme tes prochains lives à horaires stables pour renforcer la dimension Régularité.",
  reason: () =>
    "Ton StreamScore identifie la Régularité comme dimension la plus faible.",
  expected_impact:
    "Construire une base de progression solide pour les semaines suivantes.",
  difficulty: "easy",
  confidence: "high",
  verification_signal: "stream_score_snapshots.regularity_increase",
  auto_verifiable: false,
  source_type: "stream_score",
  source_ref: () => null,
  evidence: scoreEvidence,
  eligible: (s) =>
    s.stream_score_latest !== null && priorityIs(s, "regularity"),
  score: () => ({ urgency: 5, impact: 4 }),
};

const score_focus_positioning: ActionCandidate = {
  action_key: "score_focus_positioning",
  category: "positioning",
  title: "Clarifie ton positionnement de chaîne",
  description:
    "Affine titre, catégorie principale et tagline pour renforcer la dimension Positionnement.",
  reason: () =>
    "Ton StreamScore identifie le Positionnement comme dimension faible.",
  expected_impact:
    "Aider les viewers à comprendre rapidement pourquoi te suivre.",
  difficulty: "medium",
  confidence: "medium",
  verification_signal: "stream_score_snapshots.positioning_increase",
  auto_verifiable: false,
  source_type: "stream_score",
  source_ref: () => null,
  evidence: scoreEvidence,
  eligible: (s) =>
    s.stream_score_latest !== null && priorityIs(s, "positioning"),
  score: () => ({ urgency: 4, impact: 4 }),
};

const score_focus_momentum: ActionCandidate = {
  action_key: "score_focus_momentum",
  category: "community",
  title: "Capitalise sur ton momentum",
  description:
    "Profite de la dynamique positive sur le Momentum pour transformer l'engagement récent en habitude.",
  reason: () =>
    "Ton StreamScore montre une progression positive sur la dimension Momentum.",
  expected_impact:
    "Convertir des signaux récents en viewers récurrents.",
  difficulty: "easy",
  confidence: "medium",
  verification_signal: "stream_score_snapshots.momentum_sustained",
  auto_verifiable: false,
  source_type: "stream_score",
  source_ref: () => null,
  evidence: scoreEvidence,
  eligible: (s) =>
    s.stream_score_movement.movement_status === "improved" &&
    s.stream_score_movement.top_positive_dimension === "momentum",
  score: () => ({ urgency: 3, impact: 4 }),
};

export const ACTION_CATALOG: ActionCandidate[] = [
  setup_complete_twitch_foundation,
  consistency_schedule_next_live,
  consistency_protect_streak,
  content_create_clips_from_last_live,
  positioning_stabilize_title_category,
  community_reinforce_momentum,
  debrief_fix_priority_weakness,
  discovery_review_tags_category,
  monetization_review_affiliate_path,
  score_refresh_analysis,
  score_focus_content,
  score_focus_regularite,
  score_focus_positioning,
  score_focus_momentum,
];

export const FALLBACK_ACTION_KEY = "setup_complete_twitch_foundation";
