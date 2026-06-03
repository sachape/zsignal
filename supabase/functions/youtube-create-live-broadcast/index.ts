// youtube-create-live-broadcast
// Creates a scheduled YouTube liveBroadcast (no liveStream, no stream key).
// Requires the user's YouTube OAuth token to have the `youtube` scope (write).
// Tokens are decrypted server-side only.
//
// Body: { live_session_id, title, description?, scheduled_start_time?, privacy_status?, language? }
// Returns: { success, broadcast_id?, watch_url?, reason? }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptToken, decryptToken } from "../_shared/youtube-crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function refresh(clientId: string, clientSecret: string, refreshToken: string) {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId, client_secret: clientSecret,
      refresh_token: refreshToken, grant_type: "refresh_token",
    }),
  });
  if (!r.ok) return null;
  return r.json() as Promise<{ access_token: string; expires_in: number }>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const clientId = Deno.env.get("YOUTUBE_CLIENT_ID");
    const clientSecret = Deno.env.get("YOUTUBE_CLIENT_SECRET");
    const encryptionKey = Deno.env.get("TOKEN_ENCRYPTION_KEY");
    if (!clientId || !clientSecret || !encryptionKey) {
      return json({ success: false, reason: "server_misconfigured" }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    let body: {
      live_session_id?: string; title?: string; description?: string;
      scheduled_start_time?: string; privacy_status?: string; language?: string;
    };
    try { body = await req.json(); } catch { return json({ success: false, reason: "invalid_body" }, 400); }

    const liveSessionId = body.live_session_id;
    const title = (body.title ?? "").trim().slice(0, 100);
    const description = (body.description ?? "").slice(0, 5000);
    const privacy = ["public", "private", "unlisted"].includes(body.privacy_status ?? "")
      ? body.privacy_status! : "private";
    const scheduledStart = body.scheduled_start_time
      || new Date(Date.now() + 30 * 60_000).toISOString();

    if (!liveSessionId || !title) {
      return json({ success: false, reason: "missing_params" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: authHeader, apikey: anonKey },
    });
    const userData = await userRes.json();
    if (!userData?.id) return json({ error: "Unauthorized" }, 401);
    const userId = userData.id as string;

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: row } = await admin
      .from("creator_connected_accounts")
      .select("*").eq("user_id", userId).eq("platform", "youtube").maybeSingle();
    if (!row) return json({ success: false, reason: "youtube_not_connected" }, 404);

    let accessToken = await decryptToken(row.access_token_encrypted, encryptionKey);
    const refreshToken = await decryptToken(row.refresh_token_encrypted, encryptionKey);
    const expiresAt = row.token_expires_at ? new Date(row.token_expires_at).getTime() : 0;
    const needsRefresh = !accessToken || (expiresAt > 0 && expiresAt - 60_000 < Date.now());

    if (needsRefresh) {
      if (!refreshToken) {
        await admin.from("creator_connected_accounts")
          .update({ connection_status: "expired" }).eq("id", row.id);
        return json({ success: false, reason: "token_expired" }, 401);
      }
      const refreshed = await refresh(clientId, clientSecret, refreshToken);
      if (!refreshed) {
        await admin.from("creator_connected_accounts")
          .update({ connection_status: "expired" }).eq("id", row.id);
        return json({ success: false, reason: "token_expired" }, 401);
      }
      accessToken = refreshed.access_token;
      await admin.from("creator_connected_accounts").update({
        access_token_encrypted: await encryptToken(accessToken, encryptionKey),
        token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        connection_status: "connected",
      }).eq("id", row.id);
    }

    const insertRes = await fetch(
      "https://www.googleapis.com/youtube/v3/liveBroadcasts?part=snippet,status,contentDetails",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          snippet: {
            title,
            description,
            scheduledStartTime: scheduledStart,
            ...(body.language ? { defaultLanguage: body.language } : {}),
          },
          status: {
            privacyStatus: privacy,
            selfDeclaredMadeForKids: false,
          },
          contentDetails: { enableAutoStart: false, enableAutoStop: false },
        }),
      },
    );

    if (insertRes.status === 401) {
      await admin.from("creator_connected_accounts")
        .update({ connection_status: "expired" }).eq("id", row.id);
      return json({ success: false, reason: "token_expired" }, 401);
    }
    if (insertRes.status === 403) {
      return json({ success: false, reason: "missing_scope" }, 403);
    }
    if (!insertRes.ok) {
      const errTxt = await insertRes.text().catch(() => "");
      console.warn("youtube-create-live-broadcast failed", insertRes.status, errTxt.slice(0, 300));
      // Surface livestreamingNotEnabled / liveBroadcast errors cleanly.
      let reason = "youtube_error";
      try {
        const ej = JSON.parse(errTxt);
        const code = ej?.error?.errors?.[0]?.reason as string | undefined;
        if (code === "liveStreamingNotEnabled") reason = "live_not_enabled";
        else if (code === "insufficientPermissions") reason = "missing_scope";
      } catch { /* ignore */ }
      return json({ success: false, reason, status: insertRes.status }, 502);
    }

    const created = await insertRes.json();
    const broadcastId = created?.id as string | undefined;
    const watchUrl = broadcastId ? `https://www.youtube.com/watch?v=${broadcastId}` : null;

    const { data: session } = await admin
      .from("creator_live_sessions").select("generated_metadata")
      .eq("id", liveSessionId).eq("user_id", userId).maybeSingle();
    const meta = (session?.generated_metadata as Record<string, unknown>) ?? {};
    meta.youtube_push = {
      created_at: new Date().toISOString(),
      youtube_broadcast_id: broadcastId,
      youtube_watch_url: watchUrl,
      privacy_status: privacy,
      scheduled_start_time: scheduledStart,
      status: "success",
    };
    await admin.from("creator_live_sessions").update({
      generated_metadata: meta, status: "pushed",
    }).eq("id", liveSessionId).eq("user_id", userId);

    return json({ success: true, broadcast_id: broadcastId, watch_url: watchUrl });
  } catch (e) {
    console.error("youtube-create-live-broadcast", e);
    return json({ success: false, reason: "internal" }, 500);
  }
});
