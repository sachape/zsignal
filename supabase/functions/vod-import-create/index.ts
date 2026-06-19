// Streamnco — VOD Import
// Creates clip candidates from a pasted Twitch / YouTube VOD URL.
// Auth: user JWT. Inserts via service-role (uses RLS-validated user id).
//
// Body:
// {
//   source_url: string,                  // twitch.tv/videos/<id> | youtube.com/watch?v=<id> | youtu.be/<id>
//   subject?: string,                    // optional context for titles
//   category?: string,                   // game / topic
//   target_platform?: "youtube_shorts"|"tiktok"|"instagram"|"community",
//   format?: "short"|"reel"|"tiktok"|"recap",
//   timestamps?: { start_seconds: number; end_seconds: number; title?: string }[]
// }
//
// Returns: { success, source: "twitch"|"youtube", reason: "vod_manual_timestamp"|"vod_auto_suggestion"|"twitch_clip_full", items: ContentItem[] }

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TWITCH_CLIENT_ID = Deno.env.get("TWITCH_CLIENT_ID") ?? "";
const TWITCH_CLIENT_SECRET = Deno.env.get("TWITCH_CLIENT_SECRET") ?? "";

const MIN_CLIP_SEC = 10;
const MAX_CLIP_SEC = 180;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type Source = "twitch" | "twitch_clip" | "youtube";

interface DetectedSource {
  source: Source;
  url: string;
  id?: string;
  channelLogin?: string | null;
}

function detectSource(rawUrl: string): DetectedSource | null {
  let u: URL;
  try { u = new URL(rawUrl); } catch { return null; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const host = u.hostname.replace(/^www\./, "");

  // clips.twitch.tv/<slug>
  if (host === "clips.twitch.tv") {
    const slug = u.pathname.replace(/^\//, "").split("/")[0];
    if (slug && /^[A-Za-z0-9_-]+$/.test(slug)) {
      return { source: "twitch_clip", url: `https://clips.twitch.tv/${slug}`, id: slug };
    }
    return null;
  }
  if (host === "twitch.tv" || host === "m.twitch.tv") {
    const vodMatch = u.pathname.match(/^\/videos\/(\d+)/);
    if (vodMatch) {
      return { source: "twitch", url: `https://www.twitch.tv/videos/${vodMatch[1]}`, id: vodMatch[1] };
    }
    const clipMatch = u.pathname.match(/^\/[^/]+\/clip\/([A-Za-z0-9_-]+)/);
    if (clipMatch) {
      const channelLogin = u.pathname.split("/")[1]?.toLowerCase() ?? null;
      return { source: "twitch_clip", url: `https://clips.twitch.tv/${clipMatch[1]}`, id: clipMatch[1], channelLogin };
    }
  }
  if (host === "youtube.com" || host === "m.youtube.com") {
    const v = u.searchParams.get("v");
    if (!v || !/^[A-Za-z0-9_-]{6,}$/.test(v)) return null;
    return { source: "youtube", url: `https://www.youtube.com/watch?v=${v}` };
  }
  if (host === "youtu.be") {
    const id = u.pathname.replace(/^\//, "");
    if (!/^[A-Za-z0-9_-]{6,}$/.test(id)) return null;
    return { source: "youtube", url: `https://www.youtube.com/watch?v=${id}` };
  }
  return null;
}

function fmtTimestamp(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return h > 0
    ? `${h}h${String(m).padStart(2, "0")}`
    : `${m}min${String(s).padStart(2, "0")}`;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function buildHashtags(category: string | null, source: Source): string[] {
  const base = source === "youtube"
    ? ["#youtube", "#shorts", "#gaming"]
    : ["#stream", "#twitch", "#gaming"];
  if (category) {
    const slug = slugify(category);
    if (slug) base.unshift(`#${slug}`);
  }
  return base.slice(0, 5);
}

async function getTwitchAppToken(): Promise<string | null> {
  if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) return null;
  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: TWITCH_CLIENT_ID,
      client_secret: TWITCH_CLIENT_SECRET,
      grant_type: "client_credentials",
    }),
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null) as { access_token?: string } | null;
  return data?.access_token ?? null;
}

async function resolveTwitchChannelLogin(detected: DetectedSource): Promise<string | null> {
  if (detected.channelLogin) return detected.channelLogin;
  if (!detected.id || (detected.source !== "twitch_clip" && detected.source !== "twitch")) return null;
  const token = await getTwitchAppToken();
  if (!token) return null;
  const endpoint = detected.source === "twitch_clip"
    ? `https://api.twitch.tv/helix/clips?id=${encodeURIComponent(detected.id)}`
    : `https://api.twitch.tv/helix/videos?id=${encodeURIComponent(detected.id)}`;
  const res = await fetch(endpoint, {
    headers: { "Client-ID": TWITCH_CLIENT_ID, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null) as { data?: Array<Record<string, unknown>> } | null;
  const item = data?.data?.[0];
  const login = typeof item?.broadcaster_login === "string"
    ? item.broadcaster_login
    : typeof item?.user_login === "string"
      ? item.user_login
      : null;
  return login ? login.toLowerCase() : null;
}

interface CandidateRow {
  platform: "youtube_shorts" | "tiktok" | "instagram" | "community";
  format: string;
  title: string;
  description: string;
  hashtags: string[];
  start: number;
  end: number;
  reason_code: "vod_manual_timestamp" | "vod_auto_suggestion" | "twitch_clip_full";
  reason_label: string;
  confidence: number;
}

function rotateTarget(idx: number, preferred?: string, preferredFormat?: string) {
  const opts: Array<{ platform: CandidateRow["platform"]; format: string }> = [
    { platform: "youtube_shorts", format: "short" },
    { platform: "instagram", format: "reel" },
    { platform: "tiktok", format: "tiktok" },
  ];
  if (preferred) {
    const found = opts.find((o) => o.platform === preferred);
    if (found) return { platform: found.platform, format: preferredFormat ?? found.format };
  }
  const pick = opts[idx % opts.length];
  return { platform: pick.platform, format: preferredFormat ?? pick.format };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claims?.claims) return json({ error: "unauthorized" }, 401);
  const userId = claims.claims.sub as string;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }

  const rawUrl = String(body.source_url ?? "").trim();
  if (!rawUrl) return json({ error: "missing_source_url" }, 400);
  const detected = detectSource(rawUrl);
  if (!detected) {
    return json({
      success: false,
      reason: "invalid_url",
      message: "Colle un lien de VOD Twitch ou de Clip Twitch valide.",
    }, 400);
  }
  const { source, url } = detected;
  const sourceChannelLogin = await resolveTwitchChannelLogin(detected);

  // V1: YouTube est désactivé côté produit. On rejette proprement.
  if (source === "youtube") {
    return json({
      success: false,
      reason: "youtube_not_enabled",
      message: "YouTube arrive bientôt. Utilise une VOD Twitch, un Clip Twitch ou importe une vidéo.",
    }, 400);
  }

  const subjectFallback = source === "twitch_clip" ? "ton Clip Twitch" : "ta VOD";
  const userSubject = (typeof body.subject === "string" ? body.subject.trim() : "");
  const subject = userSubject || subjectFallback;
  // Clean title used to persist the row (no auto "Clip Twitch — " prefix).
  const cleanTitle = userSubject || "Nouveau clip";
  const category = typeof body.category === "string" && body.category.trim()
    ? body.category.trim()
    : null;
  const targetPlatform = typeof body.target_platform === "string"
    ? body.target_platform.trim()
    : undefined;
  const preferredFormat = typeof body.format === "string" && body.format.trim()
    ? body.format.trim()
    : undefined;

  const rawTimestamps = Array.isArray(body.timestamps) ? body.timestamps : [];

  // Build candidates
  const candidates: CandidateRow[] = [];
  const tags = buildHashtags(category, source);

  if (source === "twitch_clip") {
    // Twitch Clip: pas de start/end requis. Durée par défaut (60s).
    // Le worker téléchargera le clip complet et utilisera la vraie durée.
    const target = rotateTarget(0, targetPlatform, preferredFormat);
    candidates.push({
      platform: target.platform,
      format: target.format,
      title: cleanTitle.slice(0, 200),
      description: `Clip Twitch transformé en format vertical${category ? ` (${category})` : ""}.`,
      hashtags: tags,
      start: 0,
      end: 60,
      reason_code: "twitch_clip_full",
      reason_label: "Clip Twitch complet",
      confidence: 80,
    });
  } else if (rawTimestamps.length > 0) {
    for (let i = 0; i < rawTimestamps.length && i < 10; i++) {
      const t = rawTimestamps[i] as Record<string, unknown>;
      const start = Math.round(Number(t.start_seconds));
      const end = Math.round(Number(t.end_seconds));
      if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
      if (start < 0 || end <= start) continue;
      const duration = end - start;
      if (duration < MIN_CLIP_SEC || duration > MAX_CLIP_SEC) continue;
      const titleHint = typeof t.title === "string" && t.title.trim() ? t.title.trim() : null;
      const target = rotateTarget(i, targetPlatform, preferredFormat);
      candidates.push({
        platform: target.platform,
        format: target.format,
        title: (titleHint ?? `Moment ${i + 1} — ${subject}`).slice(0, 200),
        description: `Extrait de ${subject}${category ? ` (${category})` : ""}. Moment à ${fmtTimestamp(start)}.`,
        hashtags: tags,
        start,
        end,
        reason_code: "vod_manual_timestamp",
        reason_label: titleHint ?? `Moment indiqué à ${fmtTimestamp(start)}`,
        confidence: 70,
      });
    }
    if (candidates.length === 0) {
      return json({
        success: false,
        reason: "invalid_timestamps",
        message: "Aucun timestamp valide. Durée requise entre 10 et 180 secondes.",
      }, 400);
    }
  } else {
    // Auto suggestions: 3 spread windows. Low confidence.
    // We cannot probe VOD duration reliably here; use safe defaults that the
    // user can edit before generating. Microcopy on the UI explains this.
    const spreads = [
      { offset: 60, label: "Début de VOD" },
      { offset: 600, label: "Milieu de VOD" },
      { offset: 1500, label: "Fin de VOD" },
    ];
    for (let i = 0; i < spreads.length; i++) {
      const s = spreads[i];
      const start = s.offset;
      const end = start + 30;
      const target = rotateTarget(i, targetPlatform, preferredFormat);
      candidates.push({
        platform: target.platform,
        format: target.format,
        title: `${s.label} — ${subject}`.slice(0, 200),
        description: `Suggestion à vérifier. Ajuste le moment avant génération. Extrait de ${subject}${category ? ` (${category})` : ""}.`,
        hashtags: tags,
        start,
        end,
        reason_code: "vod_auto_suggestion",
        reason_label: `${s.label} (suggestion à vérifier)`,
        confidence: 25,
      });
    }
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const rows = candidates.map((c) => ({
    user_id: userId,
    live_session_id: null,
    platform: c.platform,
    title: c.title,
    description: c.description,
    hashtags: c.hashtags,
    status: "to_generate",
    priority: c.confidence >= 60 ? "high" : c.confidence >= 40 ? "medium" : "low",
    format: c.format,
    reason: c.reason_code,
    source_platform: source === "twitch_clip" ? "twitch" : source,
    source_video_url: url,
    source_channel_login: sourceChannelLogin,
    source_start_time: c.start,
    source_end_time: c.end,
    source_duration: c.end - c.start,
    opportunity_score: c.confidence,
    opportunity_label:
      c.confidence >= 60 ? "Fort signal" :
      c.confidence >= 40 ? "Signal modéré" : "Suggestion à vérifier",
    opportunity_reason: c.reason_label,
  }));

  // Anti-spam guard: only block when the EXACT same payload was just sent
  // (same user/url/start/end/platform/format) within the last 60 seconds AND
  // the existing item has not started generating yet. This prevents accidental
  // double-clicks while still allowing the same Twitch link to be re-imported
  // to create new versions (different captions/font/layout, etc).
  const sixtySecAgo = new Date(Date.now() - 60_000).toISOString();
  const { data: recentDup } = await admin
    .from("creator_content_items")
    .select("id, source_start_time, source_end_time, platform, format, generation_status, created_at")
    .eq("user_id", userId)
    .eq("source_video_url", url)
    .in("generation_status", ["idle", "queued"])
    .gte("created_at", sixtySecAgo);
  const recentKeys = new Set(
    (recentDup ?? []).map((r) =>
      `${r.source_start_time}|${r.source_end_time}|${r.platform}|${r.format}`,
    ),
  );
  const newRows = rows.filter(
    (r) => !recentKeys.has(`${r.source_start_time}|${r.source_end_time}|${r.platform}|${r.format}`),
  );

  let inserted: unknown[] = [];
  if (newRows.length > 0) {
    const { data, error } = await admin
      .from("creator_content_items")
      .insert(newRows)
      .select();
    if (error) {
      console.error("[vod-import-create] insert error", error);
      return json({ error: "insert_failed", detail: error.message }, 500);
    }
    inserted = data ?? [];
  }
  const skipped = rows.length - newRows.length;


  return json({
    success: true,
    source,
    reason: candidates[0].reason_code,
    count: (inserted as unknown[]).length,
    skipped,
    items: inserted,
  });
});
