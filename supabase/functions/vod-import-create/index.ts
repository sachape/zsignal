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
// Returns: { success, source: "twitch"|"youtube", reason: "vod_manual_timestamp"|"vod_auto_suggestion", items: ContentItem[] }

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MIN_CLIP_SEC = 10;
const MAX_CLIP_SEC = 180;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type Source = "twitch" | "youtube";

function detectSource(rawUrl: string): { source: Source; url: string } | null {
  let u: URL;
  try { u = new URL(rawUrl); } catch { return null; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const host = u.hostname.replace(/^www\./, "");
  if (host === "twitch.tv") {
    if (!/^\/videos\/\d+/.test(u.pathname)) return null;
    return { source: "twitch", url: `https://www.twitch.tv${u.pathname}` };
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
  const base = source === "twitch"
    ? ["#stream", "#twitch", "#gaming"]
    : ["#youtube", "#shorts", "#gaming"];
  if (category) {
    const slug = slugify(category);
    if (slug) base.unshift(`#${slug}`);
  }
  return base.slice(0, 5);
}

interface CandidateRow {
  platform: "youtube_shorts" | "tiktok" | "instagram" | "community";
  format: string;
  title: string;
  description: string;
  hashtags: string[];
  start: number;
  end: number;
  reason_code: "vod_manual_timestamp" | "vod_auto_suggestion";
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
      message: "URL non reconnue. Utilise une VOD Twitch (twitch.tv/videos/…) pour le moment.",
    }, 400);
  }
  const { source, url } = detected;

  // V1: YouTube est désactivé côté produit. On rejette proprement.
  if (source === "youtube") {
    return json({
      success: false,
      reason: "youtube_not_enabled",
      message: "YouTube VOD sera bientôt disponible. Pour le moment, utilise une VOD Twitch ou importe un fichier.",
    }, 400);
  }

  const subject = (typeof body.subject === "string" ? body.subject.trim() : "") || "ta VOD";
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

  if (rawTimestamps.length > 0) {
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
    source_platform: source,
    source_video_url: url,
    source_start_time: c.start,
    source_end_time: c.end,
    source_duration: c.end - c.start,
    opportunity_score: c.confidence,
    opportunity_label:
      c.confidence >= 60 ? "Fort signal" :
      c.confidence >= 40 ? "Signal modéré" : "Suggestion à vérifier",
    opportunity_reason: c.reason_label,
  }));

  // Dedup: skip rows that already exist for the same user/url/start/end/platform/format
  // (active candidates only — ignored/published rows don't block re-creation).
  const { data: existing, error: existingErr } = await admin
    .from("creator_content_items")
    .select("id, source_start_time, source_end_time, platform, format, status, generated_video_storage_path")
    .eq("user_id", userId)
    .eq("source_video_url", url)
    .not("status", "in", "(ignored,published)");
  if (existingErr) {
    console.error("[vod-import-create] dedup lookup error", existingErr);
  }
  const existingKeys = new Set(
    (existing ?? []).map((r) =>
      `${r.source_start_time}|${r.source_end_time}|${r.platform}|${r.format}`,
    ),
  );
  const newRows = rows.filter(
    (r) => !existingKeys.has(`${r.source_start_time}|${r.source_end_time}|${r.platform}|${r.format}`),
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
    count: inserted?.length ?? 0,
    items: inserted ?? [],
  });
});
