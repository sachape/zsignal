// twitch-fetch-last-vod
// After a live session ends, query Helix /videos?type=archive&user_id=X to find
// the matching VOD (archive) and attach its URL to every auto-clip candidate
// associated with that session.
//
// Triggered inline by live-detect after generateDebrief + generateClipCandidates.
// Can also be invoked manually by an authenticated user for retry ("mode":"self").

import { createClient } from "npm:@supabase/supabase-js@2";

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

// ---- Twitch App Token (cached) ----
let cachedToken: { token: string; expiresAt: number } | null = null;
async function getAppToken(id: string, secret: string): Promise<string | null> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt - 60_000 > now) return cachedToken.token;
  try {
    const res = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: id,
        client_secret: secret,
        grant_type: "client_credentials",
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    cachedToken = { token: data.access_token, expiresAt: now + (data.expires_in ?? 3600) * 1000 };
    return cachedToken.token;
  } catch {
    return null;
  }
}

interface HelixVideo {
  id: string;
  user_id: string;
  url: string;
  title: string;
  created_at: string;
  published_at: string;
  duration: string;
  thumbnail_url: string;
}

// deno-lint-ignore no-explicit-any
type AdminClient = any;

/**
 * Core operation: find the archive VOD whose started_at is closest to the
 * session's started_at (±10 min) and attach its URL to all candidates.
 *
 * Returns the URL string when matched, or null otherwise.
 */
export async function attachVodToSession(
  admin: AdminClient,
  sessionId: string,
  headers: Record<string, string>,
): Promise<{ vod_url: string | null; reason: string }> {
  const { data: session } = await admin
    .from("live_sessions")
    .select("id, started_at, platform_user_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session?.platform_user_id) return { vod_url: null, reason: "no_session" };

  let vodUrl: string | null = null;
  try {
    const res = await fetch(
      `https://api.twitch.tv/helix/videos?user_id=${encodeURIComponent(session.platform_user_id)}&type=archive&first=5`,
      { headers },
    );
    if (!res.ok) return { vod_url: null, reason: `helix_${res.status}` };
    const data = await res.json();
    const videos = (data?.data ?? []) as HelixVideo[];
    if (videos.length === 0) return { vod_url: null, reason: "no_vods" };

    const sessionStart = new Date(session.started_at).getTime();
    let best: HelixVideo | null = null;
    let bestDelta = Infinity;
    for (const v of videos) {
      const t = new Date(v.created_at).getTime();
      const delta = Math.abs(t - sessionStart);
      if (delta < bestDelta) {
        bestDelta = delta;
        best = v;
      }
    }
    // Accept match if within 10 minutes.
    if (best && bestDelta <= 10 * 60 * 1000) {
      vodUrl = best.url;
    }
  } catch (err) {
    console.error("[twitch-fetch-last-vod] helix error", err);
    return { vod_url: null, reason: "fetch_error" };
  }

  if (!vodUrl) return { vod_url: null, reason: "no_match" };

  // Attach URL to every candidate of this session that doesn't already have one.
  await admin
    .from("creator_content_items")
    .update({ source_video_url: vodUrl })
    .eq("live_session_id", sessionId)
    .is("source_video_url", null);

  return { vod_url: vodUrl, reason: "matched" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const TWITCH_ID = Deno.env.get("TWITCH_CLIENT_ID");
    const TWITCH_SECRET = Deno.env.get("TWITCH_CLIENT_SECRET");
    if (!TWITCH_ID || !TWITCH_SECRET) return json({ error: "twitch_credentials_missing" }, 500);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const token = await getAppToken(TWITCH_ID, TWITCH_SECRET);
    if (!token) return json({ error: "twitch_app_token_failed" }, 502);
    const headers = { "Client-ID": TWITCH_ID, Authorization: `Bearer ${token}` };

    const body = await req.json().catch(() => ({}));
    const sessionId = String((body as { live_session_id?: string }).live_session_id ?? "");
    if (!sessionId) return json({ error: "missing_live_session_id" }, 400);

    // Auth: user must own the session (RLS check via getClaims).
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const userClient = createClient(SUPABASE_URL, ANON, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claims } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
      if (!claims?.claims) return json({ error: "unauthorized" }, 401);
      const userId = claims.claims.sub as string;
      const { data: owned } = await admin
        .from("live_sessions")
        .select("id")
        .eq("id", sessionId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!owned) return json({ error: "forbidden" }, 403);
    } else {
      // Internal cron / service path requires the eventsub cron secret.
      const tok = (req.headers.get("X-Cron-Secret") ?? "").trim();
      const { data: ok } = await admin.rpc("verify_eventsub_cron_secret", { token: tok });
      if (ok !== true) return json({ error: "unauthorized" }, 401);
    }

    const result = await attachVodToSession(admin, sessionId, headers);
    return json({ success: true, ...result });
  } catch (err) {
    console.error("[twitch-fetch-last-vod]", err);
    return json({ success: false, error: "internal_server_error" }, 500);
  }
});
