// youtube-auth-callback
// Called via POST by the Streamnco frontend page /auth/youtube/callback.
// Verifies HMAC state, exchanges the code for Google tokens, encrypts them
// (AES-GCM), and persists the connected account. Tokens never leave the server.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyOAuthState, encryptToken } from "../_shared/youtube-crypto.ts";

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
  if (req.method !== "POST")    return json({ error: "method_not_allowed" }, 405);

  try {
    const stateSecret   = Deno.env.get("OAUTH_STATE_SECRET");
    const encryptionKey = Deno.env.get("TOKEN_ENCRYPTION_KEY");
    const clientId      = Deno.env.get("YOUTUBE_CLIENT_ID");
    const clientSecret  = Deno.env.get("YOUTUBE_CLIENT_SECRET");
    const supabaseUrl   = Deno.env.get("SUPABASE_URL")!;
    const frontendUrl   = Deno.env.get("FRONTEND_URL") ?? "https://streamnco.fr";

    if (!stateSecret || !encryptionKey || !clientId || !clientSecret) {
      return json({ success: false, reason: "server_misconfigured" }, 500);
    }

    let body: { code?: string; state?: string };
    try {
      body = await req.json();
    } catch {
      return json({ success: false, reason: "invalid_body" }, 400);
    }

    const code  = body.code;
    const state = body.state;
    if (!code || !state) {
      return json({ success: false, reason: "missing_params" }, 400);
    }

    const verified = await verifyOAuthState(state, stateSecret);
    if (!verified) {
      return json({ success: false, reason: "invalid_state" }, 400);
    }
    const userId = verified.userId;

    const redirectUri =
      Deno.env.get("YOUTUBE_REDIRECT_URI") ??
      `${frontendUrl}/auth/youtube/callback`;

    // Exchange code → tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id:     clientId,
        client_secret: clientSecret,
        redirect_uri:  redirectUri,
        grant_type:    "authorization_code",
      }),
    });
    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("Token exchange failed", tokenData);
      return json({ success: false, reason: "token_exchange" }, 400);
    }

    const accessToken  = tokenData.access_token as string;
    const refreshToken = (tokenData.refresh_token as string | undefined) ?? null;
    const expiresAt    = new Date(Date.now() + (tokenData.expires_in ?? 3600) * 1000).toISOString();

    // Fetch YouTube channel identity (read-only, server-side only).
    const channelRes = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const channelJson = channelRes.ok ? await channelRes.json() : null;
    const channel     = channelJson?.items?.[0];

    const channelId   = channel?.id ?? null;
    const displayName = channel?.snippet?.title ?? null;
    const username    = channel?.snippet?.customUrl?.replace(/^@/, "") ?? null;
    const avatarUrl   = channel?.snippet?.thumbnails?.default?.url ?? null;
    const profileUrl  = channelId ? `https://www.youtube.com/channel/${channelId}` : null;

    // Encrypt tokens (AES-GCM with TOKEN_ENCRYPTION_KEY) before persisting.
    const encAccess  = await encryptToken(accessToken, encryptionKey);
    const encRefresh = refreshToken ? await encryptToken(refreshToken, encryptionKey) : null;

    const db = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { error: upsertErr } = await db
      .from("creator_connected_accounts")
      .upsert({
        user_id:                 userId,
        platform:                "youtube",
        platform_user_id:        channelId,
        username,
        display_name:            displayName,
        profile_url:             profileUrl,
        avatar_url:              avatarUrl,
        access_token_encrypted:  encAccess,
        refresh_token_encrypted: encRefresh,
        token_expires_at:        expiresAt,
        connection_status:       "connected",
        last_synced_at:          new Date().toISOString(),
      }, { onConflict: "user_id,platform" });

    if (upsertErr) {
      console.error("Upsert failed", upsertErr);
      return json({ success: false, reason: "db_error" }, 500);
    }

    // Never return tokens to the client.
    return json({ success: true });
  } catch (e) {
    console.error("youtube-auth-callback", e);
    return json({ success: false, reason: "internal" }, 500);
  }
});
