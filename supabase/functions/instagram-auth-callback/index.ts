// Real OAuth callback for Instagram — flow "Instagram API with Instagram Login".
// Direct Instagram Login (NOT Facebook Login / /me/accounts).
// Steps:
//   1. POST code to https://api.instagram.com/oauth/access_token
//      → returns short-lived IG user access token + user_id
//   2. GET https://graph.instagram.com/access_token?grant_type=ig_exchange_token
//      → long-lived token (~60 days)
//   3. GET https://graph.instagram.com/v{ver}/me?fields=user_id,username,account_type,profile_picture_url
//   4. Encrypt token & upsert row in creator_meta_connections.
// No token value ever leaves the server. No Facebook Page required.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { isOAuthEnabled, getMetaConfig } from "../_shared/metaFlags.ts";
import { verifyState } from "../_shared/oauthState.ts";
import { encryptToken } from "../_shared/tokenCrypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface ShortTokenResp {
  access_token?: string;
  user_id?: number | string;
  permissions?: string[];
  error_type?: string;
  error_message?: string;
  error?: { message?: string; code?: number; type?: string };
}
interface LongTokenResp {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: { message?: string; code?: number };
}
interface IgMeResp {
  id?: string;
  user_id?: string;
  username?: string;
  account_type?: string;
  profile_picture_url?: string;
  error?: { message?: string; code?: number };
}

async function upsertError(
  admin: ReturnType<typeof createClient>,
  userId: string,
  status: string,
  code: string,
  message: string,
) {
  await admin.from("creator_meta_connections").upsert({
    user_id: userId,
    platform: "instagram",
    connection_status: status,
    error_code: code,
    error_message: message,
  }, { onConflict: "user_id,platform" });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!isOAuthEnabled()) {
      return json(503, { error: "instagram_oauth_disabled", message: "Connexion Meta non activée." });
    }
    const cfg = getMetaConfig();
    if (!cfg) return json(503, { error: "meta_not_configured" });

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json(401, { error: "unauthorized" });

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const code = typeof body.code === "string" ? body.code : null;
    const state = typeof body.state === "string" ? body.state : null;
    if (!code) return json(400, { error: "missing_code" });
    if (!state) return json(400, { error: "missing_state" });

    let statePayload;
    try {
      statePayload = await verifyState(state, "instagram");
    } catch (e) {
      return json(400, { error: "invalid_state", message: e instanceof Error ? e.message : "unknown" });
    }
    if (statePayload.u !== user.id) {
      return json(403, { error: "state_user_mismatch" });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Exchange code → short-lived IG user access token via Instagram OAuth endpoint.
    //    NOTE: this is api.instagram.com (Instagram Login), NOT graph.facebook.com.
    const formBody = new URLSearchParams({
      client_id: cfg.appId,
      client_secret: cfg.appSecret,
      grant_type: "authorization_code",
      redirect_uri: cfg.redirectUri,
      code,
    });
    const shortResp = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formBody.toString(),
    });
    const shortJson = (await shortResp.json()) as ShortTokenResp;
    if (!shortResp.ok || !shortJson.access_token) {
      const msg = shortJson.error_message ?? shortJson.error?.message ?? "token_exchange_failed";
      await upsertError(admin, user.id, "error", "token_exchange_failed", msg);
      return json(400, { error: "token_exchange_failed", message: msg });
    }
    const shortToken = shortJson.access_token;
    const igUserIdFromToken = shortJson.user_id ? String(shortJson.user_id) : null;

    // 2. Exchange short-lived → long-lived (~60d) via graph.instagram.com.
    const longUrl = new URL("https://graph.instagram.com/access_token");
    longUrl.searchParams.set("grant_type", "ig_exchange_token");
    longUrl.searchParams.set("client_secret", cfg.appSecret);
    longUrl.searchParams.set("access_token", shortToken);
    const longResp = await fetch(longUrl.toString());
    const longJson = (await longResp.json()) as LongTokenResp;
    const accessToken = longJson.access_token ?? shortToken;
    const expiresIn = longJson.expires_in ?? null;
    const tokenExpiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;

    // 3. Fetch IG account info via graph.instagram.com /me (no Facebook Page lookup).
    const meUrl = new URL(`https://graph.instagram.com/${cfg.graphApiVersion}/me`);
    meUrl.searchParams.set("fields", "user_id,username,account_type,profile_picture_url");
    meUrl.searchParams.set("access_token", accessToken);
    const meResp = await fetch(meUrl.toString());
    const meJson = (await meResp.json()) as IgMeResp;
    if (!meResp.ok) {
      const msg = meJson.error?.message ?? "ig_me_fetch_failed";
      await upsertError(admin, user.id, "error", "ig_me_fetch_failed", msg);
      return json(400, { error: "ig_me_fetch_failed", message: msg });
    }
    const igAccountId = meJson.user_id ?? meJson.id ?? igUserIdFromToken;
    if (!igAccountId) {
      await upsertError(admin, user.id, "error", "ig_account_id_missing", "ID Instagram introuvable.");
      return json(400, { error: "ig_account_id_missing" });
    }

    // Optional sanity check: account_type must be BUSINESS or MEDIA_CREATOR / CREATOR.
    const acctType = (meJson.account_type ?? "").toUpperCase();
    if (acctType && acctType !== "BUSINESS" && acctType !== "CREATOR" && acctType !== "MEDIA_CREATOR") {
      await upsertError(
        admin,
        user.id,
        "error",
        "ig_account_not_professional",
        "Compte Instagram professionnel (Business ou Creator) requis.",
      );
      return json(400, {
        error: "ig_account_not_professional",
        message: "Compte Instagram professionnel requis.",
      });
    }

    // 4. Encrypt token & upsert. page_id / page_name intentionally left null
    //    (legacy columns kept for backward compat; Instagram Login flow does not use them).
    const encrypted = await encryptToken(accessToken);

    const { error: upsertErr } = await admin.from("creator_meta_connections").upsert({
      user_id: user.id,
      platform: "instagram",
      connection_status: "connected",
      meta_user_id: null,
      instagram_account_id: igAccountId,
      instagram_username: meJson.username ?? null,
      instagram_profile_picture_url: meJson.profile_picture_url ?? null,
      account_type: meJson.account_type ?? null,
      page_id: null,
      page_name: null,
      scopes_granted: [
        "instagram_business_basic",
        "instagram_business_content_publish",
      ],
      access_token_encrypted: encrypted,
      refresh_token_encrypted: null,
      token_expires_at: tokenExpiresAt,
      last_sync_at: new Date().toISOString(),
      error_code: null,
      error_message: null,
    }, { onConflict: "user_id,platform" });

    if (upsertErr) {
      return json(500, { error: "db_upsert_failed", message: upsertErr.message });
    }

    return json(200, {
      success: true,
      instagram_username: meJson.username,
      account_type: meJson.account_type,
    });
  } catch (e) {
    return json(500, { error: "internal_error", message: e instanceof Error ? e.message : "unknown" });
  }
});
