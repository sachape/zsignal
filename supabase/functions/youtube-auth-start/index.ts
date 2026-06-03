// youtube-auth-start
// Returns a Google OAuth URL for YouTube authorisation.
// Called from the frontend (authenticated); never exposes client_secret.
// State is HMAC-signed (OAUTH_STATE_SECRET) with a 10-minute expiration.
//
// The redirect_uri points to the Streamnco frontend (/auth/youtube/callback),
// not directly to the Supabase function — Google's consent screen then
// displays "streamnco.fr" instead of the raw Supabase project domain.

import { signOAuthState } from "../_shared/youtube-crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const clientId      = Deno.env.get("YOUTUBE_CLIENT_ID");
    const clientSecret  = Deno.env.get("YOUTUBE_CLIENT_SECRET");
    const stateSecret   = Deno.env.get("OAUTH_STATE_SECRET");
    const encryptionKey = Deno.env.get("TOKEN_ENCRYPTION_KEY");

    if (!clientId || !clientSecret) {
      return json({ configured: false, reason: "missing_client_credentials" });
    }
    if (!stateSecret || !encryptionKey) {
      return json({
        configured: false,
        reason: "missing_server_secrets",
        message: "Connexion YouTube non configurée côté serveur.",
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey     = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: authHeader, apikey: anonKey },
    });
    const userData = await userRes.json();
    if (!userData?.id) return json({ error: "Unauthorized" }, 401);

    const state = await signOAuthState(userData.id, stateSecret);

    // Frontend-hosted redirect (so Google shows "streamnco.fr" on consent screen).
    const frontendUrl = Deno.env.get("FRONTEND_URL") ?? "https://streamnco.fr";
    const redirectUri =
      Deno.env.get("YOUTUBE_REDIRECT_URI") ??
      `${frontendUrl}/auth/youtube/callback`;

    const params = new URLSearchParams({
      client_id:     clientId,
      redirect_uri:  redirectUri,
      response_type: "code",
      scope: [
        "https://www.googleapis.com/auth/youtube.readonly",
        "https://www.googleapis.com/auth/youtube",
        "https://www.googleapis.com/auth/youtube.upload",
      ].join(" "),
      access_type:   "offline",
      prompt:        "consent",
      state,
    });

    return json({
      configured: true,
      url: `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
    });
  } catch (e) {
    console.error("youtube-auth-start", e);
    return json({ error: "Internal server error" }, 500);
  }
});
