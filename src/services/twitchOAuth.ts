// Twitch OAuth service — live flow via twitch-oauth edge function
import { supabase } from "@/integrations/supabase/client";

const REDIRECT_URI = `${window.location.origin}/twitch/callback`;
const STATE_KEY = "streampulse_twitch_oauth_state";

function generateState(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Build the Twitch authorize URL via the edge function (which holds the client_id),
 * store a CSRF state token, then redirect the browser.
 */
export async function initiateTwitchOAuth(): Promise<void> {
  const state = generateState();
  sessionStorage.setItem(STATE_KEY, state);

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const fnUrl = `https://${projectId}.supabase.co/functions/v1/twitch-oauth?action=authorize-url&redirect_uri=${encodeURIComponent(
    REDIRECT_URI,
  )}&state=${encodeURIComponent(state)}`;

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
