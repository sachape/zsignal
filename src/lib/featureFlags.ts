/**
 * Feature flags.
 *
 * IMPORTANT: Meta/Instagram integration is intentionally disabled by default.
 * It will only be turned on after:
 *   1. Meta App Review is approved
 *   2. META_APP_ID / META_APP_SECRET / META_REDIRECT_URI secrets are configured
 *   3. The publishing pipeline + scheduler are validated end-to-end
 *
 * Frontend flags are read from VITE_* env vars (build-time, never secrets).
 * Backend (edge functions) reads its own counterparts via Deno.env.get(...).
 */

function readBoolFlag(value: string | undefined, fallback = false): boolean {
  if (value === undefined) return fallback;
  return value === "true" || value === "1";
}

export const FEATURE_FLAGS = {
  INSTAGRAM_OAUTH_ENABLED: readBoolFlag(import.meta.env.VITE_INSTAGRAM_OAUTH_ENABLED, false),
  INSTAGRAM_PUBLISH_ENABLED: readBoolFlag(import.meta.env.VITE_INSTAGRAM_PUBLISH_ENABLED, false),
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag] === true;
}
