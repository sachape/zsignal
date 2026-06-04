// Real OAuth callback for Instagram Business via Meta (Facebook) Login.
// Exchanges code → short-lived token → long-lived token, discovers the IG
// Business Account, encrypts the access token, and upserts the row.
// No token value ever leaves the server.
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

interface FbTokenResp { access_token?: string; expires_in?: number; error?: { message: string; code?: number } }
interface FbAccountsResp {
  data?: Array<{ id: string; name: string; access_token?: string; instagram_business_account?: { id: string } }>;
  error?: { message: string; code?: number };
}
interface IgAccountResp {
  id?: string;
  username?: string;
  account_type?: string;
  profile_picture_url?: string;
  error?: { message: string; code?: number };
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

    // Verify HMAC-signed state & user match
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

    const base = `https://graph.facebook.com/${cfg.graphApiVersion}`;

    // 1. Exchange code → short-lived token
    const shortUrl = new URL(`${base}/oauth/access_token`);
    shortUrl.searchParams.set("client_id", cfg.appId);
    shortUrl.searchParams.set("client_secret", cfg.appSecret);
    shortUrl.searchParams.set("redirect_uri", cfg.redirectUri);
    shortUrl.searchParams.set("code", code);
    const shortResp = await fetch(shortUrl.toString());
    const shortJson = (await shortResp.json()) as FbTokenResp;
    if (!shortResp.ok || !shortJson.access_token) {
      const msg = shortJson.error?.message ?? "token_exchange_failed";
      await upsertError(admin, user.id, "error", "token_exchange_failed", msg);
      return json(400, { error: "token_exchange_failed", message: msg });
    }

    // 2. Exchange short-lived → long-lived (~60d)
    const longUrl = new URL(`${base}/oauth/access_token`);
    longUrl.searchParams.set("grant_type", "fb_exchange_token");
    longUrl.searchParams.set("client_id", cfg.appId);
    longUrl.searchParams.set("client_secret", cfg.appSecret);
    longUrl.searchParams.set("fb_exchange_token", shortJson.access_token);
    const longResp = await fetch(longUrl.toString());
    const longJson = (await longResp.json()) as FbTokenResp;
    const accessToken = longJson.access_token ?? shortJson.access_token;
    const expiresIn = longJson.expires_in ?? shortJson.expires_in ?? null;
    const tokenExpiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;

    // 3. Resolve IG Business Account via /me/accounts
    const pagesUrl = new URL(`${base}/me/accounts`);
    pagesUrl.searchParams.set("fields", "id,name,instagram_business_account,access_token");
    pagesUrl.searchParams.set("access_token", accessToken);
    const pagesResp = await fetch(pagesUrl.toString());
    const pagesJson = (await pagesResp.json()) as FbAccountsResp;
    if (!pagesResp.ok || !pagesJson.data) {
      const msg = pagesJson.error?.message ?? "pages_lookup_failed";
      await upsertError(admin, user.id, "error", "pages_lookup_failed", msg);
      return json(400, { error: "pages_lookup_failed", message: msg });
    }

    const pageWithIg = pagesJson.data.find((p) => p.instagram_business_account?.id);
    if (!pageWithIg || !pageWithIg.instagram_business_account) {
      await upsertError(
        admin,
        user.id,
        "error",
        "no_ig_business_account",
        "Aucun compte Instagram professionnel (Business/Creator) lié à une Page Facebook n'a été trouvé.",
      );
      return json(400, {
        error: "no_ig_business_account",
        message: "Compte Instagram professionnel requis.",
      });
    }

    const igId = pageWithIg.instagram_business_account.id;

    // 4. Fetch IG account info
    const igUrl = new URL(`${base}/${igId}`);
    igUrl.searchParams.set("fields", "id,username,account_type,profile_picture_url");
    igUrl.searchParams.set("access_token", accessToken);
    const igResp = await fetch(igUrl.toString());
    const igJson = (await igResp.json()) as IgAccountResp;
    if (!igResp.ok || !igJson.id) {
      const msg = igJson.error?.message ?? "ig_account_fetch_failed";
      await upsertError(admin, user.id, "error", "ig_account_fetch_failed", msg);
      return json(400, { error: "ig_account_fetch_failed", message: msg });
    }

    // 5. Encrypt token & upsert
    const encrypted = await encryptToken(accessToken);

    const { error: upsertErr } = await admin.from("creator_meta_connections").upsert({
      user_id: user.id,
      platform: "instagram",
      connection_status: "connected",
      meta_user_id: null, // can be fetched via /me if needed
      instagram_account_id: igJson.id,
      instagram_username: igJson.username ?? null,
      instagram_profile_picture_url: igJson.profile_picture_url ?? null,
      account_type: igJson.account_type ?? null,
      page_id: pageWithIg.id,
      page_name: pageWithIg.name,
      scopes_granted: [
        "instagram_basic",
        "instagram_content_publish",
        "pages_show_list",
        "pages_read_engagement",
        "business_management",
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
      instagram_username: igJson.username,
      account_type: igJson.account_type,
    });
  } catch (e) {
    return json(500, { error: "internal_error", message: e instanceof Error ? e.message : "unknown" });
  }
});
