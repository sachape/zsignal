// clip-layout-reference-frame
// Returns REAL source frames extracted from the exact media the worker
// will download for generation. The manual facecam placement modal draws
// the crop box directly on top of these frames so user pixels map 1:1 to
// the worker's source pixels.
//
// Frame extraction is delegated to the Fly worker's `/extract-frames`
// endpoint (same yt-dlp pipeline, same ffprobe geometry). If the worker
// is unreachable, we fall back to the channel's latest VOD thumbnail —
// clearly flagged as a fallback so the client UI can warn the user.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const WORKER_BASE_URL = Deno.env.get("WORKER_BASE_URL") ?? "";
const WORKER_SHARED_SECRET = Deno.env.get("WORKER_SHARED_SECRET") ?? "";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type ParsedSource =
  | { kind: "twitch_clip"; id: string }
  | { kind: "twitch_vod"; id: string };

function parseTwitchSource(raw: unknown): ParsedSource | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const u = new URL(raw.trim());
    const host = u.hostname.replace(/^www\./, "");
    if (host === "clips.twitch.tv") {
      const slug = u.pathname.replace(/^\//, "").split("/")[0];
      return slug ? { kind: "twitch_clip", id: slug } : null;
    }
    if (host === "twitch.tv" || host === "m.twitch.tv") {
      const clipMatch = u.pathname.match(/^\/[^/]+\/clip\/([A-Za-z0-9_-]+)/);
      if (clipMatch) return { kind: "twitch_clip", id: clipMatch[1] };
      const vodMatch = u.pathname.match(/^\/videos\/(\d+)/);
      if (vodMatch) return { kind: "twitch_vod", id: vodMatch[1] };
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

type WorkerFrame = { t: number; image_base64: string; jpeg_bytes?: number };

async function extractFramesViaWorker(args: {
  sourceUrl: string;
  sourceKind: "twitch_clip" | "twitch_vod" | "direct";
  count: number;
  timestamps?: number[];
  startSeconds?: number;
  endSeconds?: number;
}): Promise<{
  source_width: number;
  source_height: number;
  duration: number | null;
  frames: WorkerFrame[];
} | null> {
  if (!WORKER_BASE_URL || !WORKER_SHARED_SECRET) return null;
  try {
    const res = await fetch(`${WORKER_BASE_URL.replace(/\/$/, "")}/extract-frames`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Worker-Secret": WORKER_SHARED_SECRET,
      },
      body: JSON.stringify({
        source_url: args.sourceUrl,
        source_kind: args.sourceKind,
        count: args.count,
        timestamps: args.timestamps,
        start_time_seconds: args.startSeconds,
        end_time_seconds: args.endSeconds,
      }),
    });
    if (!res.ok) {
      console.warn("[clip-layout-reference-frame] worker extract-frames failed", res.status);
      return null;
    }
    const body = await res.json();
    if (!Array.isArray(body?.frames) || body.frames.length === 0) return null;
    return {
      source_width: Number(body.source_width) || 1920,
      source_height: Number(body.source_height) || 1080,
      duration: Number.isFinite(body.duration) ? Number(body.duration) : null,
      frames: body.frames,
    };
  } catch (err) {
    console.warn("[clip-layout-reference-frame] worker call threw", err);
    return null;
  }
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
    const requestBody = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const rawSourceUrl = typeof requestBody.source_url === "string" ? requestBody.source_url.trim() : "";
    const parsed = parseTwitchSource(rawSourceUrl);
    const requestedCount = Math.min(8, Math.max(1, Number(requestBody.count) || 5));
    const explicitTimestamps = Array.isArray(requestBody.timestamps)
      ? (requestBody.timestamps as unknown[])
          .map((t) => Number(t))
          .filter((t) => Number.isFinite(t) && t >= 0)
      : undefined;
    const startSeconds = Number.isFinite(Number(requestBody.start_time_seconds))
      ? Number(requestBody.start_time_seconds)
      : undefined;
    const endSeconds = Number.isFinite(Number(requestBody.end_time_seconds))
      ? Number(requestBody.end_time_seconds)
      : undefined;

    const { data: account } = await admin
      .from("connected_accounts")
      .select("platform_user_id, platform_login")
      .eq("user_id", userId)
      .eq("platform", "twitch")
      .not("platform_user_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const platformUserId = (account?.platform_user_id as string | undefined) ?? null;
    const platformLogin = (account?.platform_login as string | undefined) ?? null;

    // 1) PRIMARY PATH — extract real frames from the exact source media via
    //    the worker. This is the path that guarantees source/displayed pixel
    //    parity. If the request has no source URL but the user has a
    //    connected Twitch account, we still try to pull the latest VOD as
    //    the source so the modal opens with real content.
    let workerSourceUrl = rawSourceUrl || null;
    let workerSourceKind: "twitch_clip" | "twitch_vod" | "direct" | null = parsed?.kind ?? null;
    let vodTitle: string | null = null;
    let thumbnailFallback: string | null = null;

    if (TWITCH_ID && TWITCH_SECRET) {
      const token = await getAppToken(TWITCH_ID, TWITCH_SECRET);
      if (token) {
        let endpoint: string | null = null;
        if (parsed?.kind === "twitch_clip") {
          endpoint = `https://api.twitch.tv/helix/clips?id=${encodeURIComponent(parsed.id)}`;
        } else if (parsed?.kind === "twitch_vod") {
          endpoint = `https://api.twitch.tv/helix/videos?id=${encodeURIComponent(parsed.id)}`;
        } else if (platformUserId) {
          endpoint = `https://api.twitch.tv/helix/videos?user_id=${encodeURIComponent(platformUserId)}&type=archive&first=1`;
        }
        if (endpoint) {
          const res = await fetch(endpoint, {
            headers: { "Client-ID": TWITCH_ID, Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const body = await res.json();
            const item = body?.data?.[0];
            if (item) {
              vodTitle = item.title ?? null;
              thumbnailFallback = normalizeThumbnailUrl(String(item.thumbnail_url ?? ""));
              if (!workerSourceUrl) {
                // No URL passed in — use the latest archive VOD as the source.
                if (item.url) {
                  workerSourceUrl = item.url;
                  workerSourceKind = "twitch_vod";
                }
              }
            }
          }
        }
      }
    }

    let frames: WorkerFrame[] = [];
    let sourceWidth = 1920;
    let sourceHeight = 1080;
    let duration: number | null = null;
    let extractedVia: "worker" | "thumbnail_fallback" | "none" = "none";

    if (workerSourceUrl && workerSourceKind) {
      const result = await extractFramesViaWorker({
        sourceUrl: workerSourceUrl,
        sourceKind: workerSourceKind,
        count: requestedCount,
        timestamps: explicitTimestamps,
        startSeconds,
        endSeconds,
      });
      if (result) {
        frames = result.frames;
        sourceWidth = result.source_width;
        sourceHeight = result.source_height;
        duration = result.duration;
        extractedVia = "worker";
      }
    }

    // 2) FALLBACK — thumbnail only. The client MUST display a warning since
    //    a thumbnail is NOT guaranteed to match the exact source frame.
    if (frames.length === 0 && thumbnailFallback) {
      frames = [{ t: 0, image_base64: "", jpeg_bytes: 0 }];
      extractedVia = "thumbnail_fallback";
    }

    return json({
      platform: "twitch",
      platform_user_id: platformUserId,
      platform_login: platformLogin,
      reference_width: sourceWidth,
      reference_height: sourceHeight,
      duration,
      vod_title: vodTitle,
      extracted_via: extractedVia,
      // Real frames from the source: each carries its own data URL.
      frames: frames.map((f) => ({
        t: f.t,
        image_data_url: f.image_base64
          ? `data:image/jpeg;base64,${f.image_base64}`
          : thumbnailFallback,
      })),
      // Legacy field — kept so older clients keep working until they pick
      // up the `frames` array.
      thumbnail_url: extractedVia === "thumbnail_fallback" ? thumbnailFallback : null,
    });
  } catch (err) {
    console.error("[clip-layout-reference-frame]", err);
    return json({ error: "internal_server_error" }, 500);
  }
});
