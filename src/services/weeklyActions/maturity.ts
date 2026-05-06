// Deterministic maturity classifier. Pure function.

import type { MaturityState, SignalBundle } from "./types";

export function classifyMaturity(
  s: Omit<SignalBundle, "maturity_state">,
): MaturityState {
  // 1. Setup — not enough sessions/debriefs/signals.
  if (s.sessions_count < 2 || s.debriefs_count === 0) {
    return "setup";
  }
  if (
    s.latest_debrief !== null &&
    s.latest_debrief.has_enough_signal === false &&
    s.debriefs_count < 3
  ) {
    return "setup";
  }

  // 2. Inactive — no recent live or weak inactivity tier.
  if (
    s.inactivity_tier === "soft" ||
    s.inactivity_tier === "paused" ||
    s.inactivity_tier === "rebuild"
  ) {
    return "inactive";
  }

  // 3. Growth — recent sessions plus positive community/score/strength signal.
  const score = s.stream_score_latest?.overall_score ?? null;
  const strongCommunity = s.community_events_count_14d >= 3;
  const strongScore = typeof score === "number" && score >= 60;
  const strongStrength = Boolean(s.latest_debrief?.strength);
  if (
    s.recent_sessions_count >= 2 &&
    (strongCommunity || strongScore || strongStrength)
  ) {
    return "growth";
  }

  // 4. Active fallback.
  return "active";
}
