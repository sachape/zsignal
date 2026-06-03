// tiktok-auth-start
// Returns a TikTok OAuth URL for Login Kit authorisation.
// Called from the frontend (authenticated); never exposes client_secret.
// State is HMAC-signed (OAUTH_STATE_SECRET) with a 10-minute expiration.
//
// The redirect_uri points to the Streamnco frontend (/auth/tiktok/callback),
// so TikTok's consent screen shows "streamnco.fr".

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
    const clientKey     = Deno.env.get("TIKTOK_CLIENT_KEY");
    const clientSecret  = Deno.env.get("TIKTOK_CLIENT_SECRET");
    const stateSecret   = Deno.env.get("TIKTOK_STATE_SECRET") ?? Deno.env.get("OAUTH_STATE_SECRET");
    const encryptionKey = Deno.env.get("TOKEN_ENCRYPTION_KEY");

    if (!clientKey || !clientSecret) {
      return json({ configured: false, reason: "missing_client_credentials" });
    }
    if (!stateSecret || !encryptionKey) {
      return json({
        configured: false,
        reason: "missing_server_secrets",
        message: "Connexion TikTok non configurée côté serveur.",
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

    const frontendUrl = Deno.env.get("FRONTEND_URL") ?? "https://streamnco.fr";
    const redirectUri =
      Deno.env.get("TIKTOK_REDIRECT_URI") ??
      `${frontendUrl}/auth/tiktok/callback`;

    const params = new URLSearchParams({
      client_key:    clientKey,
      response_type: "code",
      scope:         "user.info.basic,video.list",
      redirect_uri:  redirectUri,
      state,
    });

    return json({
      configured: true,
      url: `https://www.tiktok.com/v2/auth/authorize/?${params}`,
    });
  } catch (e) {
    console.error("tiktok-auth-start", e);
    return json({ error: "Internal server error" }, 500);
  }
});
