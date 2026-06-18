// clip-layout-reference-frame
// Returns a 1920x1080 reference thumbnail (latest Twitch archive VOD) for
// the authenticated user, so the camera placement editor has a real frame
// from the streamer's own content to crop against.

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

function parseTwitchSource(raw: unknown): { kind: "clip" | "vod"; id: string } | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const u = new URL(raw.trim());
    const host = u.hostname.replace(/^www\./, "");
    if (host === "clips.twitch.tv") {
      const slug = u.pathname.replace(/^\//, "").split("/")[0];
      return slug ? { kind: "clip", id: slug } : null;
    }
    if (host === "twitch.tv" || host === "m.twitch.tv") {
      const clipMatch = u.pathname.match(/^\/[^/]+\/clip\/([A-Za-z0-9_-]+)/);
      if (clipMatch) return { kind: "clip", id: clipMatch[1] };
      const vodMatch = u.pathname.match(/^\/videos\/(\d+)/);
      if (vodMatch) return { kind: "vod", id: vodMatch[1] };
    }
  } catch { /* ignore */ }
  return null;
}

function normalizeThumbnailUrl(url: string | null): string | null {
  if (!url) return null;
  return url
    .replace("%{width}", "1920")
    .replace("%{height}", "1080")
    .replace(/-preview-\d+x\d+\.jpg(\?.*)?$/, "-preview-1920x1080.jpg$1");
}

async function getAppToken(clientId: string, clientSecret: string): Promise<string | null> {
  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token ?? null;
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (!claims?.claims) return json({ error: "unauthorized" }, 401);
    const userId = claims.claims.sub as string;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const requestBody = await req.json().catch(() => ({}));
    const requestedSource = parseTwitchSource((requestBody as Record<string, unknown>).source_url);

    const { data: account } = await admin
      .from("connected_accounts")
      .select("platform_user_id, platform_login")
      .eq("user_id", userId)
      .eq("platform", "twitch")
      .not("platform_user_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!account?.platform_user_id) {
      return json({ error: "twitch_not_connected" }, 400);
    }

    const platformUserId = account.platform_user_id as string;

    let thumbnailUrl: string | null = null;
    let vodTitle: string | null = null;

    if (TWITCH_ID && TWITCH_SECRET) {
      const token = await getAppToken(TWITCH_ID, TWITCH_SECRET);
      if (token) {
        const endpoint = requestedSource?.kind === "clip"
          ? `https://api.twitch.tv/helix/clips?id=${encodeURIComponent(requestedSource.id)}`
          : requestedSource?.kind === "vod"
            ? `https://api.twitch.tv/helix/videos?id=${encodeURIComponent(requestedSource.id)}`
            : `https://api.twitch.tv/helix/videos?user_id=${encodeURIComponent(platformUserId)}&type=archive&first=1`;
        const res = await fetch(endpoint, {
          headers: { "Client-ID": TWITCH_ID, Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const body = await res.json();
          const vod = body?.data?.[0];
          if (vod?.thumbnail_url) {
            thumbnailUrl = normalizeThumbnailUrl(String(vod.thumbnail_url));
            vodTitle = vod.title ?? null;
          }
        }
      }
    }

    return json({
      platform: "twitch",
      platform_user_id: platformUserId,
      platform_login: account.platform_login,
      reference_width: 1920,
      reference_height: 1080,
      thumbnail_url: thumbnailUrl,
      vod_title: vodTitle,
    });
  } catch (err) {
    console.error("[clip-layout-reference-frame]", err);
    return json({ error: "internal_server_error" }, 500);
  }
});
