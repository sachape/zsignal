// Twitch OAuth service — live flow via twitch-oauth edge function
import { supabase } from "@/integrations/supabase/client";
import { onboardingFlags } from "@/services/onboardingFlags";

const REDIRECT_URI = `${window.location.origin}/twitch/callback`;
const STATE_KEY = "streampulse_twitch_oauth_state";
const STATE_TEASER_KEY = "streampulse_twitch_oauth_teaser_id";

function generateNonce(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Build the Twitch authorize URL via the edge function (which holds the client_id),
 * store a CSRF state token, then redirect the browser.
 *
 * If the user comes from a teaser diagnostic, we persist the `teaserId` so we
 * can reconcile the gratuit diagnostic with the enriched data after callback,
 * without re-running an analysis from scratch.
 */
export async function initiateTwitchOAuth(options?: { teaserId?: string | null }): Promise<void> {
  const nonce = generateNonce();
  sessionStorage.setItem(STATE_KEY, nonce);

  if (options?.teaserId) {
    // Persist locally (sessionStorage) AND in the durable flags store so
    // the callback can still recover it if the tab is restored.
    sessionStorage.setItem(STATE_TEASER_KEY, options.teaserId);
    onboardingFlags.setPendingTeaserId(options.teaserId);
  }

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const fnUrl = `https://${projectId}.supabase.co/functions/v1/twitch-oauth?action=authorize-url&redirect_uri=${encodeURIComponent(
    REDIRECT_URI,
  )}&state=${encodeURIComponent(nonce)}`;

  const res = await fetch(fnUrl, {
    headers: {
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
  });
  const data = await res.json();
  if (!res.ok || !data.url) {
    console.error("[TwitchOAuth] authorize-url failed", data);
    throw new Error(data.error || "Impossible d'initier la connexion Twitch.");
  }
  window.location.href = data.url;
}

/**
 * Returns the `teaserId` that was associated with the OAuth round-trip, or null.
 * Reads sessionStorage first (fresh tab), falls back to the durable flag.
 */
export function consumePendingTeaserId(): string | null {
  const fromSession = sessionStorage.getItem(STATE_TEASER_KEY);
  sessionStorage.removeItem(STATE_TEASER_KEY);
  const fromFlags = onboardingFlags.getPendingTeaserId();
  onboardingFlags.clearPendingTeaserId();
  return fromSession || fromFlags || null;
}

/**
 * Exchange authorization code for tokens via the backend edge function.
 * Validates the CSRF state, then calls twitch-oauth POST.
 */
export async function completeTwitchCallback(
  code: string,
  state: string,
): Promise<{ success: boolean; platform_login?: string; error?: string }> {
  const expectedState = sessionStorage.getItem(STATE_KEY);
  sessionStorage.removeItem(STATE_KEY);
  if (!expectedState || expectedState !== state) {
    return { success: false, error: "État OAuth invalide. Réessaie." };
  }

  const { data, error } = await supabase.functions.invoke("twitch-oauth", {
    body: { code, redirect_uri: REDIRECT_URI },
  });

  if (error) {
    return { success: false, error: error.message };
  }
  if (!data?.success) {
    return { success: false, error: data?.error || "Échec de la connexion Twitch." };
  }
  return { success: true, platform_login: data.platform_login };
}
