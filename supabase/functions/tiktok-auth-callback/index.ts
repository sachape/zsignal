// tiktok-auth-callback
// Called via POST by the Streamnco frontend page /auth/tiktok/callback.
// Verifies HMAC state, exchanges the code for TikTok tokens, encrypts them
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
    const stateSecret   = Deno.env.get("TIKTOK_STATE_SECRET") ?? Deno.env.get("OAUTH_STATE_SECRET");
    const encryptionKey = Deno.env.get("TOKEN_ENCRYPTION_KEY");
    const clientKey     = Deno.env.get("TIKTOK_CLIENT_KEY");
    const clientSecret  = Deno.env.get("TIKTOK_CLIENT_SECRET");
    const supabaseUrl   = Deno.env.get("SUPABASE_URL")!;
    const frontendUrl   = Deno.env.get("FRONTEND_URL") ?? "https://streamnco.fr";

    if (!stateSecret || !encryptionKey || !clientKey || !clientSecret) {
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
      Deno.env.get("TIKTOK_REDIRECT_URI") ??
      `${frontendUrl}/auth/tiktok/callback`;

    // Exchange code → tokens
    const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cache-Control": "no-cache",
      },
      body: new URLSearchParams({
        client_key:    clientKey,
        client_secret: clientSecret,
        code,
        grant_type:    "authorization_code",
        redirect_uri:  redirectUri,
      }),
    });
    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("TikTok token exchange failed", tokenData);
      return json({ success: false, reason: "token_exchange" }, 400);
    }

    const accessToken  = tokenData.access_token as string;
    const refreshToken = (tokenData.refresh_token as string | undefined) ?? null;
    const expiresIn    = (tokenData.expires_in as number | undefined) ?? 3600;
    const expiresAt    = new Date(Date.now() + expiresIn * 1000).toISOString();
    const openId       = (tokenData.open_id as string | undefined) ?? null;

    // Fetch TikTok user identity (read-only, server-side only).
    const userFields = "open_id,union_id,avatar_url,display_name,username,profile_deep_link";
    const userRes = await fetch(
      `https://open.tiktokapis.com/v2/user/info/?fields=${encodeURIComponent(userFields)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const userJson = userRes.ok ? await userRes.json() : null;
    const tkUser   = userJson?.data?.user;

    const platformUserId = tkUser?.open_id ?? openId ?? null;
    const displayName    = tkUser?.display_name ?? null;
    const username       = tkUser?.username ?? null;
    const avatarUrl      = tkUser?.avatar_url ?? null;
    const profileUrl     = tkUser?.profile_deep_link
      ?? (username ? `https://www.tiktok.com/@${username}` : null);

    // Encrypt tokens before persisting.
    const encAccess  = await encryptToken(accessToken, encryptionKey);
    const encRefresh = refreshToken ? await encryptToken(refreshToken, encryptionKey) : null;

    const db = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { error: upsertErr } = await db
      .from("creator_connected_accounts")
      .upsert({
        user_id:                 userId,
        platform:                "tiktok",
        platform_user_id:        platformUserId,
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
      console.error("TikTok upsert failed", upsertErr);
      return json({ success: false, reason: "db_error" }, 500);
    }

    return json({ success: true });
  } catch (e) {
    console.error("tiktok-auth-callback", e);
    return json({ success: false, reason: "internal" }, 500);
  }
});
