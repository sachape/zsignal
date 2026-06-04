// Real OAuth callback for Instagram — flow "Instagram API with Instagram Login".
// Direct Instagram Login (NOT Facebook Login / /me/accounts).
// Steps:
//   1. POST code to https://api.instagram.com/oauth/access_token
//      → returns short-lived IG user access token + user_id
//   2. GET https://graph.instagram.com/access_token?grant_type=ig_exchange_token
//      → long-lived token (~60 days)
//   3. GET https://graph.instagram.com/me?fields=user_id,username,account_type,profile_picture_url
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

const CALLBACK_VERSION = "instagram-callback-profile-best-effort-v5";
const GRAPH_VERSION = "v21.0";

type ProfileVariant =
  | "versioned_me_business_fields"
  | "versioned_me_basic_fields"
  | "user_id_direct"
  | "user_id_minimal";

interface ProfileAttempt {
  variant: ProfileVariant;
  endpoint_host: string;
  endpoint_path: string;
  fields: string;
  http_status?: number;
  meta_error_type?: string;
  meta_error_message?: string;
  ok: boolean;
}

type CallbackStep =
  | "validate_input"
  | "verify_state"
  | "exchange_short_token"
  | "exchange_long_token"
  | "fetch_profile"
  | "encrypt_token"
  | "upsert_connection";

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify({ callback_version: CALLBACK_VERSION, ...body }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const cleanMessage = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  return value.replace(/[\r\n\t]+/g, " ").slice(0, 240);
};

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
  error?: { message?: string; code?: number; type?: string };
}
interface IgMeResp {
  id?: string;
  user_id?: string;
  username?: string;
  account_type?: string;
  profile_picture_url?: string;
  error?: { message?: string; code?: number; type?: string };
}

function extractMetaError(payload: ShortTokenResp | LongTokenResp | IgMeResp) {
  const metaError = payload.error;
  return {
    meta_error_type: cleanMessage("error_type" in payload ? payload.error_type : metaError?.type),
    meta_error_message: cleanMessage("error_message" in payload ? payload.error_message : metaError?.message),
  };
}

function fail(
  status: number,
  errorCode: string,
  errorStep: CallbackStep,
  details: {
    message?: string;
    httpStatus?: number;
    metaErrorType?: string;
    metaErrorMessage?: string;
  } = {},
) {
  return json(status, {
    error: errorCode,
    error_code: errorCode,
    error_step: errorStep,
    ...(details.httpStatus ? { http_status: details.httpStatus } : {}),
    ...(details.message ? { message: cleanMessage(details.message) } : {}),
    ...(details.metaErrorType ? { meta_error_type: cleanMessage(details.metaErrorType) } : {}),
    ...(details.metaErrorMessage ? { meta_error_message: cleanMessage(details.metaErrorMessage) } : {}),
  });
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
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,platform" });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const log = (step: string, extra: Record<string, unknown> = {}) =>
    console.log(JSON.stringify({ callback_version: CALLBACK_VERSION, step, ...extra }));

  try {
    log("start");
    if (!isOAuthEnabled()) {
      log("oauth_disabled");
      return fail(503, "instagram_oauth_disabled", "validate_input", { message: "Connexion Meta non activée." });
    }
    const cfg = getMetaConfig();
    if (!cfg) {
      log("meta_not_configured");
      return fail(503, "meta_not_configured", "validate_input", { message: "Configuration Meta incomplète." });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      log("unauthorized", { has_auth_header: authHeader.length > 0 });
      return fail(401, "unauthorized", "validate_input");
    }
    log("authenticated", { user_id: user.id });

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const code = typeof body.code === "string" ? body.code : null;
    const state = typeof body.state === "string" ? body.state : null;
    if (!code) { log("missing_code"); return fail(400, "missing_code", "validate_input"); }
    if (!state) { log("missing_state"); return fail(400, "missing_state", "validate_input"); }

    let statePayload;
    try {
      statePayload = await verifyState(state, "instagram");
    } catch (e) {
      log("state_invalid", { reason: e instanceof Error ? e.message : "unknown" });
      return fail(400, "invalid_state", "verify_state", { message: e instanceof Error ? e.message : "unknown" });
    }
    if (statePayload.u !== user.id) {
      log("state_user_mismatch", { state_user: statePayload.u, current_user: user.id });
      return fail(403, "state_user_mismatch", "verify_state");
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
    log("short_token_request", {
      endpoint: "https://api.instagram.com/oauth/access_token",
      method: "POST",
      redirect_uri: cfg.redirectUri,
    });
    const shortResp = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formBody.toString(),
      redirect: "manual",
    });
    log("short_token_response", {
      http_status: shortResp.status,
      redirected: shortResp.redirected,
      type: shortResp.type,
      location: shortResp.headers.get("location"),
    });
    const shortJson = (await shortResp.json().catch(() => ({}))) as ShortTokenResp;
    if (!shortResp.ok || !shortJson.access_token) {
      const msg = shortJson.error_message ?? shortJson.error?.message ?? "token_exchange_failed";
      const metaError = extractMetaError(shortJson);
      log("short_token_failed", { http_status: shortResp.status, meta_error_type: metaError.meta_error_type, meta_error_message: metaError.meta_error_message });
      await upsertError(admin, user.id, "error", "token_exchange_failed", msg);
      return fail(400, "token_exchange_failed", "exchange_short_token", {
        message: msg,
        httpStatus: shortResp.status,
        metaErrorType: metaError.meta_error_type,
        metaErrorMessage: metaError.meta_error_message,
      });
    }
    const shortToken = shortJson.access_token;
    const igUserIdFromToken = shortJson.user_id ? String(shortJson.user_id) : null;
    log("short_token_ok", { has_user_id: !!igUserIdFromToken });

    // 2. Fetch IG profile — cascade of variants. Minimum success: id/user_id + username.
    const tryProfile = async (variant: ProfileVariant, path: string, fields: string): Promise<{ attempt: ProfileAttempt; data: IgMeResp }> => {
      const url = new URL(`https://graph.instagram.com${path}`);
      url.searchParams.set("fields", fields);
      url.searchParams.set("access_token", shortToken);
      log("me_request", { profile_variant: variant, endpoint_host: "graph.instagram.com", endpoint_path: path, method: "GET", fields });
      const resp = await fetch(url.toString(), { method: "GET", redirect: "manual" });
      const data = (await resp.json().catch(() => ({}))) as IgMeResp;
      const metaError = extractMetaError(data);
      const attempt: ProfileAttempt = {
        variant,
        endpoint_host: "graph.instagram.com",
        endpoint_path: path,
        fields,
        http_status: resp.status,
        meta_error_type: metaError.meta_error_type,
        meta_error_message: metaError.meta_error_message,
        ok: resp.ok && !!(data.id ?? data.user_id ?? igUserIdFromToken) && !!data.username,
      };
      log("me_response", attempt);
      return { attempt, data };
    };

    const attempts: ProfileAttempt[] = [];
    let profileData: IgMeResp = {};
    let successVariant: ProfileVariant | null = null;

    const variants: Array<{ v: ProfileVariant; path: string; fields: string }> = [
      { v: "versioned_me_business_fields", path: `/${GRAPH_VERSION}/me`, fields: "user_id,username,account_type,profile_picture_url" },
      { v: "versioned_me_basic_fields", path: `/${GRAPH_VERSION}/me`, fields: "id,username,account_type" },
    ];
    if (igUserIdFromToken) {
      variants.push({ v: "user_id_direct", path: `/${igUserIdFromToken}`, fields: "username,account_type,profile_picture_url" });
      variants.push({ v: "user_id_minimal", path: `/${igUserIdFromToken}`, fields: "username" });
    }

    for (const { v, path, fields } of variants) {
      const { attempt, data } = await tryProfile(v, path, fields);
      attempts.push(attempt);
      if (attempt.ok) {
        profileData = data;
        successVariant = v;
        break;
      }
      if (data.username && !profileData.username) profileData.username = data.username;
      if ((data.id || data.user_id) && !(profileData.id || profileData.user_id)) {
        profileData.id = data.id;
        profileData.user_id = data.user_id;
      }
    }

    const igAccountId = profileData.user_id ?? profileData.id ?? igUserIdFromToken;
    const igUsername = profileData.username ?? null;

    // Profile fetch is BEST-EFFORT. Connection requires only short-lived token + user_id.
    let profileWarningCode: string | null = null;
    let profileWarningMessage: string | null = null;
    if (!igAccountId) {
      // This should never happen because short_token_ok guarantees igUserIdFromToken,
      // but guard anyway: without any account id we genuinely cannot persist a row.
      const last = attempts[attempts.length - 1];
      log("no_account_id_available", { attempts });
      await upsertError(admin, user.id, "error", "ig_account_id_missing", "user_id manquant après échange short-lived");
      return fail(400, "ig_account_id_missing", "fetch_profile", {
        message: "user_id Instagram manquant.",
        httpStatus: last?.http_status,
        metaErrorType: last?.meta_error_type,
        metaErrorMessage: last?.meta_error_message,
      });
    }
    if (!successVariant || !igUsername) {
      const last = attempts[attempts.length - 1];
      profileWarningCode = "profile_fetch_failed";
      profileWarningMessage = `Profil Instagram détaillé indisponible (${last?.meta_error_message ?? "raison inconnue"}).`;
      log("profile_fetch_failed_non_blocking", { attempts, ig_account_id: igAccountId });
    } else {
      log("me_ok", { profile_variant: successVariant, has_account_type: !!profileData.account_type });
    }

    const accountType = profileData.account_type ?? "unknown";

    // 3. Best-effort: exchange short-lived → long-lived (~60d) via graph.instagram.com
    //    Endpoint: GET https://graph.instagram.com/access_token (unversioned)
    //    Query: grant_type=ig_exchange_token, client_secret=..., access_token=<short_lived>
    //    NO client_id, NO redirect_uri, NO code.
    const longUrl = new URL("https://graph.instagram.com/access_token");
    longUrl.searchParams.set("grant_type", "ig_exchange_token");
    longUrl.searchParams.set("client_secret", cfg.appSecret);
    longUrl.searchParams.set("access_token", shortToken);
    log("long_token_request", {
      endpoint_host: "graph.instagram.com",
      endpoint_path: "/access_token",
      method: "GET",
      grant_type: "ig_exchange_token",
      has_access_token: !!shortToken,
      access_token_prefix: shortToken ? shortToken.slice(0, 6) : null,
      has_client_secret: !!cfg.appSecret,
    });
    let accessToken = shortToken;
    let tokenExpiresAt: string | null = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // short-lived ~1h fallback
    let warningCode: string | null = null;
    let warningMessage: string | null = null;
    try {
      const longResp = await fetch(longUrl.toString(), { method: "GET", redirect: "manual" });
      const longText = await longResp.text();
      let longJson: LongTokenResp = {};
      try { longJson = JSON.parse(longText) as LongTokenResp; } catch { /* not JSON */ }
      log("long_token_response", {
        http_status: longResp.status,
        redirected: longResp.redirected,
        type: longResp.type,
        meta_error_message: longJson.error?.message ?? null,
      });
      if (longResp.ok && longJson.access_token) {
        accessToken = longJson.access_token;
        const expiresIn = longJson.expires_in ?? null;
        tokenExpiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;
        log("long_token_ok", { expires_in: expiresIn });
      } else {
        warningCode = "token_long_lived_exchange_failed";
        warningMessage = `Token court utilisé temporairement — échange long-lived à corriger (${longJson.error?.message ?? `HTTP ${longResp.status}`}).`;
        log("long_token_fallback_short", { http_status: longResp.status, meta_error_message: longJson.error?.message ?? null });
      }
    } catch (e) {
      warningCode = "token_long_lived_exchange_failed";
      warningMessage = `Token court utilisé temporairement — échange long-lived a planté (${e instanceof Error ? e.message : "unknown"}).`;
      log("long_token_throw", { reason: e instanceof Error ? e.message : "unknown" });
    }

    // 4. Encrypt token (long-lived if we got one, otherwise short-lived) & upsert.
    let encrypted: string;
    try {
      encrypted = await encryptToken(accessToken);
    } catch {
      const msg = "Échec du chiffrement du token Instagram.";
      await upsertError(admin, user.id, "error", "token_encryption_failed", msg);
      return fail(500, "token_encryption_failed", "encrypt_token", { message: msg });
    }

    const { error: upsertErr } = await admin.from("creator_meta_connections").upsert({
      user_id: user.id,
      platform: "instagram",
      connection_status: "connected",
      meta_user_id: null,
      instagram_account_id: igAccountId,
      instagram_username: igUsername,
      instagram_profile_picture_url: profileData.profile_picture_url ?? null,
      account_type: accountType,
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
      error_code: profileWarningCode ?? warningCode,
      error_message: [profileWarningMessage, warningMessage].filter(Boolean).join(" | ") || null,
    }, { onConflict: "user_id,platform" });

    if (upsertErr) {
      return fail(500, "db_upsert_failed", "upsert_connection", { message: upsertErr.message });
    }

    return json(200, {
      success: true,
      instagram_account_id: igAccountId,
      instagram_username: igUsername,
      account_type: accountType,
      profile_variant: successVariant,
      warning_code: profileWarningCode ?? warningCode,
      warning_message: [profileWarningMessage, warningMessage].filter(Boolean).join(" | ") || null,
    });
  } catch (e) {
    return fail(500, "internal_error", "validate_input", { message: e instanceof Error ? e.message : "unknown" });
  }
});
