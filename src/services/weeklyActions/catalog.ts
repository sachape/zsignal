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
  auto_verifiable: false,
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
  title: "Crée 2 clips à partir de ton dernier live",
  description: "Les clips prolongent la vie du live et nourrissent la découverte.",
  reason: () =>
    "Une session récente existe mais aucun signal de réutilisation de contenu n'est détecté.",
  expected_impact: "Augmenter la découverte hors live.",
  difficulty: "easy",
  confidence: "medium",
  verification_signal: "twitch_clips.count_increase",
  auto_verifiable: false,
  source_type: "content",
  source_ref: (s) => s.last_session?.id ?? null,
  evidence: (s) => ({
    last_session_id: s.last_session?.id ?? null,
    last_session_ended_at: s.last_session?.ended_at ?? null,
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
  auto_verifiable: false,
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
  auto_verifiable: false,
  source_type: "monetization",
  source_ref: () => null,
  evidence: (s) => ({
    facts_available: s.facts_available,
    stream_score: s.stream_score_latest,
  }),
  eligible: (s) => s.maturity_state === "growth",
  score: () => ({ urgency: 1, impact: 3 }),
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
];

export const FALLBACK_ACTION_KEY = "setup_complete_twitch_foundation";
