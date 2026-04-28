// Cockpit slot arbitration — decides which of {milestone, inactivity} owns
// the "what to focus on now" slot. Exclusive by design: never both at once.
//
// Rule:
//   - live in progress           → none
//   - no live ever               → inactivity (rebuild, "premier live")
//   - ≥14 days since last live   → inactivity (paused / rebuild)
//   - 7..13 days since last live → inactivity (soft) takes the slot
//   - <7 days                    → milestone
//
// We centralize the threshold here so the dashboard stays declarative and
// both components keep a single responsibility.

import type { LiveSession } from "@/services/liveSessions";

export type CockpitFocusSlot = "none" | "milestone" | "inactivity";

const SOFT_RELANCE_DAYS = 7;

function daysSince(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function resolveCockpitFocusSlot(
  current: LiveSession | null,
  recentSessions: LiveSession[],
): CockpitFocusSlot {
  if (current) return "none";

  const ended = recentSessions.filter((s) => s.status === "ended");
  if (ended.length === 0) return "inactivity";

  const lastIso = ended
    .map((s) => s.started_at)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

  return daysSince(lastIso) >= SOFT_RELANCE_DAYS ? "inactivity" : "milestone";
}
