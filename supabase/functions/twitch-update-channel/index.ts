// twitch-update-channel
// Pushes title / category / language to the user's Twitch channel via Helix.
// Requires the user's Twitch OAuth token to have `channel:manage:broadcast`.
// Token decryption is server-side only — never exposed to frontend.
//
// Body: { live_session_id: string, title?: string, category?: string, language?: string }
// Returns: { success, game_id?, game_name?, reason? }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const REQUIRED_SCOPE = "channel:manage:broadcast";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const clientId = Deno.env.get("TWITCH_CLIENT_ID");
    const clientSecret = Deno.env.get("TWITCH_CLIENT_SECRET");
    if (!clientId || !clientSecret) {
      return json({ success: false, reason: "server_misconfigured" }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    let body: { live_session_id?: string; title?: string; category?: string; language?: string };
    try { body = await req.json(); } catch { return json({ success: false, reason: "invalid_body" }, 400); }

    const liveSessionId = body.live_session_id;
    const title = (body.title ?? "").trim().slice(0, 140);
    const category = (body.category ?? "").trim();
    const language = (body.language ?? "").trim().slice(0, 2) || null;

    if (!liveSessionId) return json({ success: false, reason: "missing_session" }, 400);
    if (!title && !category) return json({ success: false, reason: "nothing_to_update" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: account } = await admin
      .from("connected_accounts")
      .select("id, platform_user_id, access_token_encrypted, refresh_token_encrypted, scope, expires_at")
      .eq("user_id", user.id)
      .eq("platform", "twitch")
      .maybeSingle();

    if (!account?.platform_user_id) {
      return json({ success: false, reason: "twitch_not_connected" }, 404);
    }

    const scope = (account.scope as string) ?? "";
    if (!scope.split(/\s+/).includes(REQUIRED_SCOPE)) {
      return json({ success: false, reason: "missing_scope", required_scope: REQUIRED_SCOPE }, 403);
    }

    const { encryptToken, decryptToken } = await import("../_shared/tokenCrypto.ts");
    let accessToken = await decryptToken(account.access_token_encrypted as string | null);
    const refreshTokenPlain = await decryptToken(account.refresh_token_encrypted as string | null);

    const expiresAt = account.expires_at ? new Date(account.expires_at).getTime() : 0;
    const needsRefresh = !accessToken || (expiresAt && expiresAt - Date.now() < 60_000);

    if (needsRefresh && refreshTokenPlain) {
      const r = await fetch("https://id.twitch.tv/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId, client_secret: clientSecret,
          grant_type: "refresh_token", refresh_token: refreshTokenPlain,
        }),
      });
      const rd = await r.json();
      if (r.ok && rd.access_token) {
        accessToken = rd.access_token;
        await admin.from("connected_accounts").update({
          access_token_encrypted: await encryptToken(accessToken),
          refresh_token_encrypted: await encryptToken(rd.refresh_token ?? refreshTokenPlain),
          expires_at: new Date(Date.now() + (rd.expires_in ?? 3600) * 1000).toISOString(),
          scope: Array.isArray(rd.scope) ? rd.scope.join(" ") : (rd.scope ?? scope),
        }).eq("id", account.id);
      }
    }
    if (!accessToken) return json({ success: false, reason: "token_unavailable" }, 401);

    const helixHeaders = {
      Authorization: `Bearer ${accessToken}`,
      "Client-Id": clientId,
      "Content-Type": "application/json",
    };

    // Resolve game_id from category text (if any).
    let gameId: string | null = null;
    let gameName: string | null = null;
    if (category) {
      const g = await fetch(
        `https://api.twitch.tv/helix/games?name=${encodeURIComponent(category)}`,
        { headers: helixHeaders },
      );
      const gj = await g.json();
      const found = gj?.data?.[0];
      if (found) { gameId = found.id; gameName = found.name; }
      else return json({ success: false, reason: "category_not_found", category }, 404);
    }

    const payload: Record<string, unknown> = {};
    if (title) payload.title = title;
    if (gameId) payload.game_id = gameId;
    if (language) payload.broadcaster_language = language;

    const patch = await fetch(
      `https://api.twitch.tv/helix/channels?broadcaster_id=${encodeURIComponent(account.platform_user_id)}`,
      { method: "PATCH", headers: helixHeaders, body: JSON.stringify(payload) },
    );

    if (patch.status === 401) return json({ success: false, reason: "token_expired" }, 401);
    if (patch.status === 403) return json({ success: false, reason: "missing_scope", required_scope: REQUIRED_SCOPE }, 403);
    if (!patch.ok) {
      const err = await patch.text().catch(() => "");
      console.warn("twitch-update-channel patch failed", patch.status, err.slice(0, 200));
      return json({ success: false, reason: "twitch_error", status: patch.status }, 502);
    }

    // Persist push result inside generated_metadata.twitch_push
    const { data: session } = await admin
      .from("creator_live_sessions")
      .select("generated_metadata")
      .eq("id", liveSessionId).eq("user_id", user.id).maybeSingle();

    const meta = (session?.generated_metadata as Record<string, unknown>) ?? {};
    meta.twitch_push = {
      pushed_at: new Date().toISOString(),
      title, game_id: gameId, game_name: gameName, language,
      status: "success",
    };
    await admin.from("creator_live_sessions").update({
      generated_metadata: meta, status: "pushed",
    }).eq("id", liveSessionId).eq("user_id", user.id);

    return json({ success: true, game_id: gameId, game_name: gameName });
  } catch (e) {
    console.error("twitch-update-channel", e);
    return json({ success: false, reason: "internal" }, 500);
  }
});
