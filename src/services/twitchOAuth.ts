// Twitch OAuth service — placeholder until live credentials are available

const TWITCH_CLIENT_ID = ""; // Will be set when credentials are available
const REDIRECT_URI = `${window.location.origin}/twitch/callback`;

/**
 * Build the Twitch OAuth authorization URL and redirect the user.
 * Non-functional until TWITCH_CLIENT_ID is configured.
 */
export function initiateTwitchOAuth(): void {
  if (!TWITCH_CLIENT_ID) {
    console.warn("[TwitchOAuth] Client ID not configured — OAuth disabled.");
    return;
  }

  const params = new URLSearchParams({
    client_id: TWITCH_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "user:read:email analytics:read:games",
  });

  window.location.href = `https://id.twitch.tv/oauth2/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens via the backend edge function.
 * Returns the platform_login on success.
 */
export async function completeTwitchCallback(
  _code: string
): Promise<{ success: boolean; platform_login?: string; error?: string }> {
  // TODO: call supabase.functions.invoke("twitch-oauth", { body: { code, redirect_uri } })
  return { success: false, error: "Twitch OAuth not yet configured." };
}
