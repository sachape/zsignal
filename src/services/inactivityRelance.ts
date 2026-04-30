// Inactivity relance — gentle in-app block when the streamer hasn't gone
// live for a while. Pure read-side, no persistence, deterministic tiers.
//
// Tiers (based on time since the last started live, current live aside):
//   - active      → no card (handled by milestone)
//   - soft   ≥7d  → gentle reminder
//   - paused ≥14d → progression mise en pause, but base preserved
//   - rebuild ≥30d→ reconstruction tone, prudent and non-judgmental
//
// The block stays SILENT when the user has streamed in the last 7 days OR
// is currently live, so it never overlaps with the weekly milestone.

import type { LiveSession } from "@/services/liveSessions";

export type InactivityTier = "active" | "soft" | "paused" | "rebuild";

export interface InactivityState {
  tier: InactivityTier;
  /** Days since the last started live, null if never streamed. */
  daysSinceLast: number | null;
  title: string;
  description: string;
}

const SOFT_DAYS = 7;
const PAUSED_DAYS = 14;
const REBUILD_DAYS = 30;

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function buildInactivityRelance(
  current: LiveSession | null,
  recentSessions: LiveSession[],
): InactivityState {
  // Currently live → never show this block.
  if (current) {
    return {
      tier: "active",
      daysSinceLast: 0,
      title: "",
      description: "",
    };
  }

  const sortedByStart = [...recentSessions].sort(
    (a, b) =>
      new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
  );
  const last = sortedByStart[0] ?? null;

  // No live ever → reconstruction (rebuild) tone, no fake history.
  if (!last) {
    return {
      tier: "rebuild",
      daysSinceLast: null,
      title: "Lance un premier live pour activer ton suivi.",
      description:
        "Streamnco commencera à lire ta chaîne dès la première session.",
    };
  }

  const days = daysBetween(new Date(last.started_at), new Date());

  if (days >= REBUILD_DAYS) {
    return {
      tier: "rebuild",
      daysSinceLast: days,
      title: "Ça fait un moment depuis ton dernier live.",
      description:
        "Reprends à ton rythme avec une session simple. Pas besoin de viser parfait, juste de relancer.",
    };
  }

  if (days >= PAUSED_DAYS) {
    return {
      tier: "paused",
      daysSinceLast: days,
      title: "Progression en pause.",
      description:
        "Ta base est préservée. Un prochain live suffira à relancer la lecture.",
    };
  }

  if (days >= SOFT_DAYS) {
    return {
      tier: "soft",
      daysSinceLast: days,
      title: "Une semaine sans live.",
      description:
        "Quand tu seras prêt, un prochain stream relancera ton suivi.",
    };
  }

  return {
    tier: "active",
    daysSinceLast: days,
    title: "",
    description: "",
  };
}
