// V3.7 — Fetch real YouTube public statistics (views/likes/comments) for a
// content item already uploaded/published from Streamnco.
//
// Input  : { content_item_id: string }
// Auth   : user JWT (RLS-scoped ownership re-verified server-side)
// Scopes : none new — videos.list?part=statistics,snippet is callable with
//          any valid YouTube OAuth token (the same one used for upload).
//          We reuse the existing youtube connection.
//
// Behavior:
// - Validates ownership of the content item.
// - Resolves the YouTube video id from youtube_video_id || external_platform_id
//   || a youtu.be/youtube.com URL in published_url.
// - Calls YouTube Data API videos.list.
// - On success: writes post_publish_metrics + last_metrics_sync_at (and
//   external_platform_id if missing). Returns the metrics JSON.
// - On error: NEVER overwrites existing valid metrics. Returns a typed reason.
// - Numeric stats: real number or null. Never 0 for missing data.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptToken, decryptToken } from "../_shared/youtube-crypto.ts";

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

function extractVideoId(input: string | null | undefined): string | null {
  if (!input) return null;
  const s = String(input).trim();
  if (!s) return null;
  // Bare id (11 chars, no separators)
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s);
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace(/^\//, "").split("/")[0];
      if (/^[A-Za-z0-9_-]{11}$/.test(id)) return id;
    }
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;
      // shorts/<id>
      const m = u.pathname.match(/\/shorts\/([A-Za-z0-9_-]{11})/);
      if (m) return m[1];
    }
  } catch {
    // fallthrough
  }
  return null;
}

async function refresh(clientId: string, clientSecret: string, refreshToken: string) {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!r.ok) return null;
  return r.json() as Promise<{ access_token: string; expires_in: number; scope?: string }>;
}

function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(String(v));
  return Number.isFinite(n) ? n : null;
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
    if (!authHeader.startsWith("Bearer ")) return json({ success: false, reason: "unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: authHeader, apikey: anonKey },
    });
    const userData = await userRes.json();
    if (!userData?.id) return json({ success: false, reason: "unauthorized" }, 401);
    const userId = userData.id as string;

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ success: false, reason: "invalid_json" }, 400); }
    const contentItemId = String(body.content_item_id ?? "").trim();
    if (!contentItemId) return json({ success: false, reason: "missing_params" }, 400);

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: item, error: itemErr } = await admin
      .from("creator_content_items")
      .select("*")
      .eq("id", contentItemId)
      .eq("user_id", userId)
      .maybeSingle();
    if (itemErr || !item) return json({ success: false, reason: "item_not_found" }, 404);

    // Resolve YouTube video id from any available signal.
    const videoId =
      extractVideoId(item.youtube_video_id) ??
      extractVideoId(item.external_platform_id) ??
      extractVideoId(item.youtube_url) ??
      extractVideoId(item.published_url);

    if (!videoId) {
      return json({ success: false, reason: "missing_video_id" }, 400);
    }

    // Load YouTube connection.
    const { data: row } = await admin
      .from("creator_connected_accounts")
      .select("*")
      .eq("user_id", userId)
      .eq("platform", "youtube")
      .maybeSingle();
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

    // Call YouTube Data API.
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "statistics,snippet");
    url.searchParams.set("id", videoId);

    const ytRes = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!ytRes.ok) {
      const txt = await ytRes.text().catch(() => "");
      const lower = txt.toLowerCase();
      let reason = "youtube_error";
      if (ytRes.status === 401) reason = "token_expired";
      else if (ytRes.status === 403 && lower.includes("quotaexceeded")) reason = "quota_exceeded";
      else if (ytRes.status === 403) reason = "forbidden";
      else if (ytRes.status === 404) reason = "video_not_found";
      console.error("youtube videos.list failed", ytRes.status, txt.slice(0, 200));
      return json({ success: false, reason, status: ytRes.status }, ytRes.status === 401 ? 401 : 200);
    }

    const payload = await ytRes.json().catch(() => null) as
      | { items?: Array<{ id: string; statistics?: Record<string, string>; snippet?: { publishedAt?: string; title?: string } }> }
      | null;
    const video = payload?.items?.[0];
    if (!video) {
      return json({ success: false, reason: "video_not_found" }, 200);
    }

    const stats = video.statistics ?? {};
    const snippet = video.snippet ?? {};
    const metrics = {
      source: "youtube" as const,
      views: toNumberOrNull(stats.viewCount),
      likes: toNumberOrNull(stats.likeCount),
      comments: toNumberOrNull(stats.commentCount),
      published_at: snippet.publishedAt ?? null,
      youtube_title: snippet.title ?? null,
      synced_at: new Date().toISOString(),
      raw: stats,
    };

    // Persist. We update post_publish_metrics + last_metrics_sync_at.
    // Also backfill external_platform_id if not set.
    const update: Record<string, unknown> = {
      post_publish_metrics: metrics,
      last_metrics_sync_at: metrics.synced_at,
    };
    if (!item.external_platform_id) update.external_platform_id = videoId;
    if (!item.published_platform) update.published_platform = "youtube";

    const { error: upErr } = await admin
      .from("creator_content_items")
      .update(update)
      .eq("id", contentItemId);
    if (upErr) {
      console.error("update item failed", upErr.message);
      // Still return metrics so the UI can show fresh data even if persist fails.
      return json({ success: true, metrics, persisted: false });
    }

    return json({ success: true, metrics, persisted: true });
  } catch (err) {
    console.error("youtube-fetch-public-stats fatal", err instanceof Error ? err.message : "unknown");
    return json({ success: false, reason: "internal_error" }, 500);
  }
});
