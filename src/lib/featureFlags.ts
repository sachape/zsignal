/**
 * Frontend feature flags.
 *
 * NOTE on Instagram OAuth availability:
 * Lovable Secrets does not accept VITE_ variables, so the OAuth availability
 * is NOT read from a build-time flag here. Instead the frontend asks the
 * backend via the `instagram-oauth-status` edge function (see
 * `useInstagramOAuthStatus`). The single source of truth is the backend env
 * INSTAGRAM_OAUTH_ENABLED + presence of META_APP_ID/SECRET/REDIRECT_URI.
 *
 * INSTAGRAM_PUBLISH_ENABLED stays here as a hard client-side kill switch,
 * defaulting to false until Meta App Review is approved and the publishing
 * pipeline is fully validated end-to-end.
 */

function readBoolFlag(value: string | undefined, fallback = false): boolean {
  if (value === undefined) return fallback;
  return value === "true" || value === "1";
}

export const FEATURE_FLAGS = {
  INSTAGRAM_PUBLISH_ENABLED: readBoolFlag(import.meta.env.VITE_INSTAGRAM_PUBLISH_ENABLED, false),
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag] === true;
}
