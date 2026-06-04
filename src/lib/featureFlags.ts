/**
 * Frontend feature flags + admin/dev mode.
 *
 * Publish flags are HARD client-side kill switches: when false, the UI must
 * never expose an active "Publier automatiquement" / "Planifier" action — only
 * the manual workflow (download / copy / mark as published).
 *
 * Admin/dev mode unlocks technical actions (OAuth retry, debug panels) that
 * may still be useful for testing while waiting for platform validation. It is
 * triggered by:
 *   - URL flag  ?admin=1   (sticky, stored in localStorage)
 *   - localStorage key `streamnco_admin` = "1"
 */

function readBoolFlag(value: string | undefined, fallback = false): boolean {
  if (value === undefined) return fallback;
  return value === "true" || value === "1";
}

export const FEATURE_FLAGS = {
  INSTAGRAM_PUBLISH_ENABLED: readBoolFlag(import.meta.env.VITE_INSTAGRAM_PUBLISH_ENABLED, false),
  YOUTUBE_PUBLISH_ENABLED: readBoolFlag(import.meta.env.VITE_YOUTUBE_PUBLISH_ENABLED, false),
  TIKTOK_PUBLISH_ENABLED: readBoolFlag(import.meta.env.VITE_TIKTOK_PUBLISH_ENABLED, false),
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag] === true;
}

const ADMIN_LS_KEY = "streamnco_admin";

/**
 * Returns true when the current browser session is in admin/dev mode.
 * Safe to call during SSR — returns false when window is undefined.
 */
export function isAdminMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("admin");
    if (fromUrl === "1" || fromUrl === "true") {
      window.localStorage.setItem(ADMIN_LS_KEY, "1");
      return true;
    }
    if (fromUrl === "0" || fromUrl === "false") {
      window.localStorage.removeItem(ADMIN_LS_KEY);
      return false;
    }
    return window.localStorage.getItem(ADMIN_LS_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Platform validation status surfaced to end-users (FR copy).
 * Used by Réseaux / Composer / Content Queue to display calm "Bientôt"
 * messaging instead of raw OAuth or API errors.
 */
export const PLATFORM_VALIDATION = {
  instagram: {
    badge: "En validation Meta",
    short: "Connexion officielle Instagram en cours de validation.",
    long: "Tu peux déjà préparer tes contenus dans Streamnco et les publier manuellement. La publication automatique sera activée une fois la validation Meta approuvée.",
  },
  youtube: {
    badge: "En validation Google",
    short: "Connexion YouTube limitée pendant la validation Google.",
    long: "Le workflow manuel reste disponible : prépare titre, description et tags dans Streamnco, puis publie via YouTube Studio.",
  },
  tiktok: {
    badge: "Bientôt",
    short: "Connexion TikTok prévue après validation de l’intégration officielle.",
    long: "Prépare tes contenus dès maintenant et publie-les manuellement sur TikTok. La connexion automatique arrive bientôt.",
  },
} as const;
