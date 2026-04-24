/**
 * Robust client-side flags for the post-Twitch onboarding flow.
 *
 * Three independent flags so the flow stays consistent even if the user
 * refreshes, closes the tab, or skips a step:
 *
 *  - twitch_connected            → set as soon as OAuth callback succeeds
 *  - first_enriched_result_seen  → set when /result?from=onboarding renders
 *  - cockpit_welcome_dismissed   → set when the slim welcome banner is dismissed
 *
 * Stored in localStorage so they persist across sessions on the same device.
 * Server is the source of truth for the actual Twitch connection — these
 * flags only drive the welcome UX.
 */

const KEYS = {
  twitchConnected: "sp_twitch_connected",
  firstEnrichedSeen: "sp_first_enriched_result_seen",
  cockpitWelcomeDismissed: "sp_cockpit_welcome_dismissed",
  pendingTeaserId: "sp_pending_teaser_id",
} as const;

const safeGet = (k: string): string | null => {
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem(k);
  } catch {
    return null;
  }
};
const safeSet = (k: string, v: string) => {
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(k, v);
  } catch {
    /* noop */
  }
};
const safeDel = (k: string) => {
  try {
    if (typeof window !== "undefined") window.localStorage.removeItem(k);
  } catch {
    /* noop */
  }
};

export const onboardingFlags = {
  // twitch_connected
  isTwitchConnected: () => safeGet(KEYS.twitchConnected) === "1",
  markTwitchConnected: () => safeSet(KEYS.twitchConnected, "1"),

  // first_enriched_result_seen
  hasSeenEnrichedResult: () => safeGet(KEYS.firstEnrichedSeen) === "1",
  markEnrichedResultSeen: () => safeSet(KEYS.firstEnrichedSeen, "1"),

  // cockpit_welcome_dismissed
  isCockpitWelcomeDismissed: () => safeGet(KEYS.cockpitWelcomeDismissed) === "1",
  dismissCockpitWelcome: () => safeSet(KEYS.cockpitWelcomeDismissed, "1"),

  // pending teaser id passed across the OAuth round trip
  setPendingTeaserId: (id: string) => safeSet(KEYS.pendingTeaserId, id),
  getPendingTeaserId: () => safeGet(KEYS.pendingTeaserId),
  clearPendingTeaserId: () => safeDel(KEYS.pendingTeaserId),
};
