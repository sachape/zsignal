// V3D — Create a clip generation job
// Auth: user JWT required. RLS-scoped insert.
// Body: { content_item_id, source_type, source_storage_path|source_url, start_time_seconds, end_time_seconds }
// Behavior: validate ownership, create job (status=queued), update content item (status=generating, generation_status=queued),
// then trigger the external worker. Worker URL + shared secret read from env.

import { createClient } from "npm:@supabase/supabase-js@2";
import { getUserPlanAndUsage, quotaFor } from "../_shared/quotas.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WORKER_BASE_URL = Deno.env.get("WORKER_BASE_URL") ?? "";
const WORKER_SHARED_SECRET = Deno.env.get("WORKER_SHARED_SECRET") ?? "";

const ACTIVE_JOB_MESSAGE = "Une génération est déjà en cours. Attends la fin avant d’en lancer une autre.";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function failJob(
  admin: ReturnType<typeof createClient>,
  jobId: string,
  contentItemId: string,
  errorCode: string,
  errorMessage: string,
) {
  await admin
    .from("creator_video_generation_jobs")
    .update({
      status: "failed",
      generation_stage: "failed",
      progress: 0,
      error_code: errorCode,
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
      worker_completed_at: new Date().toISOString(),
    })
    .eq("id", jobId);
  await admin
    .from("creator_content_items")
    .update({
      status: "to_generate",
      generation_status: "failed",
      generation_error: errorMessage,
    })
    .eq("id", contentItemId);
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

  const contentItemId = String(body.content_item_id ?? "");
  let sourceType = String(body.source_type ?? "");
  let sourceUrl = body.source_url ? String(body.source_url) : null;
  const sourceStoragePath = body.source_storage_path ? String(body.source_storage_path) : null;
  const startTime = Number(body.start_time_seconds);
  const endTime = Number(body.end_time_seconds);

  // Defensive coercion + canonicalization: any Twitch URL MUST flow through
  // its dedicated source_type so the worker uses yt-dlp instead of treating
  // it as a direct MP4 (which fails with "moov atom not found").
  if (sourceUrl && (sourceType === "direct_url" || sourceType === "twitch_vod" || sourceType === "twitch_clip")) {
    try {
      const u = new URL(sourceUrl);
      const host = u.hostname.replace(/^www\./, "");
      if (host === "clips.twitch.tv") {
        const slug = u.pathname.replace(/^\//, "").split("/")[0];
        if (slug && /^[A-Za-z0-9_-]+$/.test(slug)) {
          sourceType = "twitch_clip";
          sourceUrl = `https://clips.twitch.tv/${slug}`;
        }
      } else if (host === "twitch.tv" || host === "m.twitch.tv") {
        const clipMatch = u.pathname.match(/^\/[^/]+\/clip\/([A-Za-z0-9_-]+)/);
        const vodMatch = u.pathname.match(/^\/videos\/(\d+)/);
        if (clipMatch) {
          sourceType = "twitch_clip";
          sourceUrl = `https://clips.twitch.tv/${clipMatch[1]}`;
        } else if (vodMatch) {
          sourceType = "twitch_vod";
          sourceUrl = `https://www.twitch.tv/videos/${vodMatch[1]}`;
        }
      }
    } catch { /* fall through to validation below */ }
  }

  if (!contentItemId) return json({ error: "missing_content_item_id" }, 400);
  if (!["upload", "storage_url", "direct_url", "twitch_vod", "twitch_clip", "youtube_vod"].includes(sourceType)) return json({ error: "invalid_source_type" }, 400);
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) return json({ error: "invalid_timestamps" }, 400);
  if (startTime < 0 || endTime <= startTime) return json({ error: "invalid_range" }, 400);
  const duration = Math.round(endTime - startTime);
  if (duration < 5 || duration > 240) return json({ error: "invalid_duration" }, 400);

  if (sourceType === "upload" || sourceType === "storage_url") {
    if (!sourceStoragePath) return json({ error: "missing_source_storage_path" }, 400);
    // Defense in depth: path must be in user's folder.
    if (!sourceStoragePath.startsWith(`${userId}/`)) return json({ error: "forbidden_path" }, 403);
  } else if (sourceType === "twitch_vod") {
    if (!sourceUrl) return json({ error: "missing_source_url" }, 400);
    try {
      const u = new URL(sourceUrl);
      if (u.hostname !== "www.twitch.tv" && u.hostname !== "twitch.tv") {
        return json({ error: "invalid_twitch_vod_url" }, 400);
      }
      if (!/^\/videos\/\d+/.test(u.pathname)) {
        return json({ error: "invalid_twitch_vod_url" }, 400);
      }
    } catch { return json({ error: "invalid_source_url" }, 400); }
  } else if (sourceType === "twitch_clip") {
    if (!sourceUrl) return json({ error: "missing_source_url" }, 400);
    try {
      const u = new URL(sourceUrl);
      const host = u.hostname.replace(/^www\./, "");
      const isClipsHost = host === "clips.twitch.tv" && /^\/[A-Za-z0-9_-]+/.test(u.pathname);
      const isChannelClip = (host === "twitch.tv" || host === "m.twitch.tv") &&
        /^\/[^/]+\/clip\/[A-Za-z0-9_-]+/.test(u.pathname);
      if (!isClipsHost && !isChannelClip) {
        return json({ error: "invalid_twitch_clip_url" }, 400);
      }
    } catch { return json({ error: "invalid_source_url" }, 400); }
  } else if (sourceType === "youtube_vod") {
    if (!sourceUrl) return json({ error: "missing_source_url" }, 400);
    try {
      const u = new URL(sourceUrl);
      const host = u.hostname.replace(/^www\./, "");
      const isWatch = (host === "youtube.com" || host === "m.youtube.com") &&
        /^[A-Za-z0-9_-]{6,}$/.test(u.searchParams.get("v") ?? "");
      const isShort = host === "youtu.be" &&
        /^[A-Za-z0-9_-]{6,}$/.test(u.pathname.replace(/^\//, ""));
      if (!isWatch && !isShort) return json({ error: "invalid_youtube_vod_url" }, 400);
    } catch { return json({ error: "invalid_source_url" }, 400); }
  } else {
    if (!sourceUrl) return json({ error: "missing_source_url" }, 400);
    try {
      const u = new URL(sourceUrl);
      if (u.protocol !== "https:" && u.protocol !== "http:") return json({ error: "invalid_source_url" }, 400);
    } catch { return json({ error: "invalid_source_url" }, 400); }
  }

  // Verify ownership of content item via RLS.
  const { data: item, error: itemErr } = await userClient
    .from("creator_content_items")
    .select("id, user_id, status")
    .eq("id", contentItemId)
    .maybeSingle();
  if (itemErr || !item) return json({ error: "content_item_not_found" }, 404);

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Monthly per-plan quota — backend source of truth.
  {
    const { plan, clips_used } = await getUserPlanAndUsage(admin, userId);
    const limit = quotaFor(plan, "clip");
    if (clips_used >= limit) {
      return json({
        success: false,
        error: "quota_exceeded",
        feature: "clip",
        plan,
        limit,
        used: clips_used,
        message: "Tu as atteint ta limite de clips générés ce mois-ci.",
      }, 429);
    }
  }

  const { data: activeJob } = await admin
    .from("creator_video_generation_jobs")
    .select("id, content_item_id, status, generation_stage, created_at, updated_at, worker_last_seen_at")
    .eq("user_id", userId)
    .in("status", ["queued", "processing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (activeJob) {
    const lastSeen = new Date(String(activeJob.worker_last_seen_at ?? activeJob.updated_at ?? activeJob.created_at)).getTime();
    const staleAfterMs = 10 * 60 * 1000;
    if (Number.isFinite(lastSeen) && Date.now() - lastSeen > staleAfterMs) {
      await failJob(admin, activeJob.id, activeJob.content_item_id, "worker_timeout", "La génération a pris trop de temps. Réessaie avec un autre moment.");
    } else {
    return json({
      success: false,
      reason: "active_job_exists",
      error: "active_job_exists",
      message: ACTIVE_JOB_MESSAGE,
      active_job_id: activeJob.id,
    }, 409);
    }
  }

  // ── Worker availability check ──
  // If the external FFmpeg worker is not configured, we MUST NOT create a fake
  // job or fake clip. Surface a clear "unavailable" state to the user.
  if (!WORKER_BASE_URL || !WORKER_SHARED_SECRET) {
    await admin
      .from("creator_content_items")
      .update({
        generation_status: "unavailable",
        generation_error: "Worker vidéo non configuré. Contacte l'admin Streamnco.",
      })
      .eq("id", contentItemId);
    return json({
      success: false,
      reason: "worker_not_configured",
      message: "Le worker de génération vidéo n'est pas encore déployé.",
    }, 503);
  }

  const { data: job, error: jobErr } = await admin
    .from("creator_video_generation_jobs")
    .insert({
      user_id: userId,
      content_item_id: contentItemId,
      source_type: sourceType,
      source_url: sourceUrl,
      source_storage_path: sourceStoragePath,
      start_time_seconds: Math.round(startTime),
      end_time_seconds: Math.round(endTime),
      duration_seconds: duration,
      output_format: "vertical_9_16",
      status: "queued",
      progress: 0,
      generation_stage: "queued",
      callback_status: null,
      metadata: {
        create_payload: {
          content_item_id: contentItemId,
          source_type: sourceType,
          start_time_seconds: Math.round(startTime),
          end_time_seconds: Math.round(endTime),
          duration_seconds: duration,
        },
      },
    })
    .select()
    .single();

  if (jobErr || !job) return json({ error: "job_insert_failed", detail: jobErr?.message }, 500);

  await admin
    .from("creator_content_items")
    .update({
      status: "generating",
      generation_status: "queued",
      generation_error: null,
    })
    .eq("id", contentItemId);

  // Resolve source URL (signed for storage, direct otherwise).
  let resolvedSourceUrl: string | null = null;
  if (sourceType === "upload" || sourceType === "storage_url") {
    const { data: signed, error: sErr } = await admin.storage
      .from("creator-source-videos")
      .createSignedUrl(sourceStoragePath!, 60 * 60); // 1h
    if (sErr || !signed?.signedUrl) {
      await failJob(admin, job.id, contentItemId, "source_sign_failed", "Impossible de préparer la source vidéo.");
      return json({ error: "source_sign_failed", detail: sErr?.message }, 500);
    }
    resolvedSourceUrl = signed.signedUrl;
  } else {
    resolvedSourceUrl = sourceUrl;
  }

  // Pre-create signed upload URL for the output clip.
  const outputStoragePath = `${userId}/${contentItemId}/${job.id}.mp4`;
  const { data: upload, error: upSignErr } = await admin.storage
    .from("creator-generated-clips")
    .createSignedUploadUrl(outputStoragePath);
  if (upSignErr || !upload?.signedUrl) {
    await failJob(admin, job.id, contentItemId, "output_sign_failed", "Impossible de préparer l’import du MP4.");
    return json({ error: "output_sign_failed", detail: upSignErr?.message }, 500);
  }

  // ── MVP — Manual facecam crop (normalized 0..1) ──
  // Priority order for facecam source of truth:
  //   1. manual_facecam_crop in this request body
  //   2. saved preset in user_facecam_presets for current twitch channel
  //   3. legacy creator_video_layout_presets (only when use_manual_layout=true)
  //   4. auto-detect on the worker
  const twitchChannelLogin = typeof body.twitch_channel_login === "string"
    ? body.twitch_channel_login.toLowerCase().trim()
    : null;
  const saveFacecamPreset = body.save_facecam_preset === true;
  const ignoreSavedFacecamPreset = body.ignore_saved_facecam_preset === true;
  const detectorStrategyHint = typeof body.detector_strategy === "string"
    ? body.detector_strategy
    : null;
  const FACECAM_PRESET_GEOMETRY_VERSION = 3;
  const manualCropSourceWidth = Number.isFinite(Number(body.manual_crop_source_width))
    ? Number(body.manual_crop_source_width)
    : 1920;
  const manualCropSourceHeight = Number.isFinite(Number(body.manual_crop_source_height))
    ? Number(body.manual_crop_source_height)
    : 1080;

  function parseNormalizedCrop(input: unknown): { x: number; y: number; width: number; height: number } | null {
    if (!input || typeof input !== "object") return null;
    const c = input as Record<string, unknown>;
    const x = Number(c.x);
    const y = Number(c.y);
    const width = Number(c.width);
    const height = Number(c.height);
    if (![x, y, width, height].every((n) => Number.isFinite(n))) return null;
    if (x < 0 || y < 0) return null;
    if (width < 0.04 || height < 0.04) return null;
    if (x + width > 1.0001 || y + height > 1.0001) return null;
    return { x, y, width, height };
  }

  // ── Safe crop algorithm (mirrors src/lib/facecamGeometry.ts) ──
  // Pad the user's raw box by 10% around its center, snap it to the worker's
  // facecam-band ratio (1080/576 ≈ 1.875), then clamp inside [0,1] — shifting
  // the box instead of shrinking it so the ratio is preserved. The worker
  // then renders this crop in pure cover mode → no letterbox / blur / bars,
  // even when the user's selection was a bit too tight, too narrow, too tall
  // or pushed against any edge.
  const FACECAM_TARGET_RATIO = 1080 / 576;
  const SAFE_PAD = 0.10;
  function normalizedRatioForSource(sourceW: number, sourceH: number) {
    const sourceRatio = sourceW > 0 && sourceH > 0 ? sourceW / sourceH : 16 / 9;
    return FACECAM_TARGET_RATIO / sourceRatio;
  }
  function buildSafeFacecamCrop(raw: { x: number; y: number; width: number; height: number }) {
    const targetNormalizedRatio = normalizedRatioForSource(manualCropSourceWidth, manualCropSourceHeight);
    const touchesTop = raw.y <= 0.01;
    const touchesBottom = raw.y + raw.height >= 0.99;
    const cx = raw.x + raw.width / 2;
    const cy = raw.y + raw.height / 2;
    let w = raw.width * (1 + SAFE_PAD);
    let h = raw.height * (1 + SAFE_PAD);
    if (w / h < targetNormalizedRatio) w = h * targetNormalizedRatio;
    else h = w / targetNormalizedRatio;
    if (w > 1) { w = 1; h = w / targetNormalizedRatio; }
    if (h > 1) { h = 1; w = h * targetNormalizedRatio; }
    let x = cx - w / 2;
    let y = touchesTop && !touchesBottom
      ? 0
      : touchesBottom && !touchesTop
        ? raw.y + raw.height - h
        : cy - h / 2;
    if (x < 0) x = 0;
    if (y < 0) y = 0;
    if (x + w > 1) x = 1 - w;
    if (y + h > 1) y = 1 - h;
    return { x, y, width: w, height: h };
  }

  let manualNormalizedCrop = parseNormalizedCrop(body.manual_facecam_crop);

  // Persist the preset when requested.
  if (manualNormalizedCrop && saveFacecamPreset && twitchChannelLogin) {
    const { error: presetErr } = await admin
      .from("user_facecam_presets")
      .upsert(
        {
          user_id: userId,
          twitch_channel_login: twitchChannelLogin,
          crop_x: manualNormalizedCrop.x,
          crop_y: manualNormalizedCrop.y,
          crop_width: manualNormalizedCrop.width,
          crop_height: manualNormalizedCrop.height,
          is_enabled: true,
          last_used_at: new Date().toISOString(),
        },
        { onConflict: "user_id,twitch_channel_login" },
      );
    if (presetErr) {
      console.warn(JSON.stringify({ event: "facecam_preset_upsert_failed", message: presetErr.message }));
    }
  }

  // No inline crop? Fall back to the stored preset for this channel.
  if (!manualNormalizedCrop && twitchChannelLogin) {
    const { data: stored } = await admin
      .from("user_facecam_presets")
      .select("crop_x, crop_y, crop_width, crop_height, is_enabled")
      .eq("user_id", userId)
      .eq("twitch_channel_login", twitchChannelLogin)
      .maybeSingle();
    if (stored?.is_enabled) {
      const parsed = parseNormalizedCrop(stored);
      if (parsed) {
        manualNormalizedCrop = parsed;
        // Refresh last_used_at.
        await admin
          .from("user_facecam_presets")
          .update({ last_used_at: new Date().toISOString() })
          .eq("user_id", userId)
          .eq("twitch_channel_login", twitchChannelLogin);
      }
    }
  }

  // Manual layout (legacy pixel-based preset) is strictly opt-in.
  const useManualLayout = body.use_manual_layout === true && !manualNormalizedCrop;

  let preset: Record<string, unknown> | null = null;
  if (useManualLayout) {
    const { data } = await admin
      .from("creator_video_layout_presets")
      .select("layout_type, facecam_x, facecam_y, facecam_width, facecam_height, gameplay_x, gameplay_y, gameplay_width, gameplay_height, source_reference_width, source_reference_height, output_width, output_height")
      .eq("user_id", userId)
      .eq("platform", "twitch")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    preset = data as Record<string, unknown> | null;
  }

  const hasFacecamCrop =
    !!preset &&
    Number.isFinite(preset.facecam_x) && Number.isFinite(preset.facecam_y) &&
    Number.isFinite(preset.facecam_width) && Number.isFinite(preset.facecam_height) &&
    ((preset.facecam_width as number) ?? 0) > 0 && ((preset.facecam_height as number) ?? 0) > 0;

  // Reference resolution used to convert normalized 0..1 crops to pixel crops.
  // The worker re-scales these to actual probed dimensions at render time.
  const REF_W = 1920;
  const REF_H = 1080;

  // Keep the raw user box (already saved as-is in the preset) AND derive the
  // safe crop sent to the worker. We do NOT persist the safe crop — the raw
  // user box stays editable, and the safe crop is always recomputed from it.
  const safeNormalizedCrop = manualNormalizedCrop
    ? buildSafeFacecamCrop(manualNormalizedCrop)
    : null;
  if (manualNormalizedCrop && safeNormalizedCrop) {
    const convertedPixelCrop = {
      x: Math.round(safeNormalizedCrop.x * REF_W),
      y: Math.round(safeNormalizedCrop.y * REF_H),
      width: Math.round(safeNormalizedCrop.width * REF_W),
      height: Math.round(safeNormalizedCrop.height * REF_H),
    };
    console.info(JSON.stringify({
      event: "facecam_safe_crop_applied",
      raw: manualNormalizedCrop,
      safe: safeNormalizedCrop,
      target_ratio: FACECAM_TARGET_RATIO,
      pad: SAFE_PAD,
    }));
    console.info(JSON.stringify({
      event: "manual_crop_debug",
      raw_crop: manualNormalizedCrop,
      safe_crop: safeNormalizedCrop,
      source_width: REF_W,
      source_height: REF_H,
      converted_pixel_crop: convertedPixelCrop,
      twitch_channel_login: twitchChannelLogin,
    }));
  }

  const layoutPayload = (manualNormalizedCrop && safeNormalizedCrop)
    ? {
        output_format: "vertical_9_16",
        layout_type: "facecam_top_gameplay_bottom",
        output_width: 1080,
        output_height: 1920,
        facecam_crop: {
          x: Math.round(safeNormalizedCrop.x * REF_W),
          y: Math.round(safeNormalizedCrop.y * REF_H),
          width: Math.round(safeNormalizedCrop.width * REF_W),
          height: Math.round(safeNormalizedCrop.height * REF_H),
        },
        gameplay_crop: null,
        source_reference_width: REF_W,
        source_reference_height: REF_H,
        auto_detect_facecam: false,
        layout_source: "manual_override",
        // Echo both the raw and safe crops + strategy hint for worker logs.
        manual_facecam_crop: safeNormalizedCrop,
        manual_facecam_crop_raw: manualNormalizedCrop,
        detector_strategy: "manual_override",
      }
    : (useManualLayout && hasFacecamCrop)
    ? {
        output_format: "vertical_9_16",
        layout_type: "facecam_top_gameplay_bottom",
        output_width: (preset!.output_width as number) ?? 1080,
        output_height: (preset!.output_height as number) ?? 1920,
        facecam_crop: {
          x: preset!.facecam_x, y: preset!.facecam_y,
          width: preset!.facecam_width, height: preset!.facecam_height,
        },
        gameplay_crop:
          Number.isFinite(preset!.gameplay_width) && ((preset!.gameplay_width as number) ?? 0) > 0
            ? {
                x: preset!.gameplay_x, y: preset!.gameplay_y,
                width: preset!.gameplay_width, height: preset!.gameplay_height,
              }
            : undefined,
        source_reference_width: (preset!.source_reference_width as number) ?? undefined,
        source_reference_height: (preset!.source_reference_height as number) ?? undefined,
        auto_detect_facecam: false,
        layout_source: "user_preset",
      }
    : {
        output_format: "vertical_9_16",
        layout_type: "facecam_top_gameplay_bottom",
        output_width: 1080,
        output_height: 1920,
        // Explicit nulls so the worker ignores any residual fields and uses OpenCV.
        facecam_crop: null,
        gameplay_crop: null,
        manual_preset: null,
        auto_detect_facecam: true,
        layout_source: "auto_detect",
      };

  console.info(JSON.stringify({
    event: "clip_job_layout_decision",
    job_id: undefined, // not yet known
    layout_source: layoutPayload.layout_source,
    has_manual_override: !!manualNormalizedCrop,
    twitch_channel_login: twitchChannelLogin,
    detector_strategy_hint: detectorStrategyHint,
  }));

  // Captions: opt-out, ON by default. Worker calls back to clip-transcribe-audio.
  const captionsEnabled = body.captions_enabled !== false;
  const captionsLanguage = typeof body.captions_language === "string" ? body.captions_language : "fr";
  const ALLOWED_CAPTION_STYLES = ["clean", "bold_tiktok", "gaming_neon", "minimal"] as const;
  const rawStyle = typeof body.captions_style === "string" ? body.captions_style : "clean";
  const captionsStyle = (ALLOWED_CAPTION_STYLES as readonly string[]).includes(rawStyle) ? rawStyle : "clean";
  const transcribeUrl = `${SUPABASE_URL}/functions/v1/clip-transcribe-audio`;

  // Dispatch to worker (fire-and-forget).
  const callbackUrl = `${SUPABASE_URL}/functions/v1/clip-job-callback`;
  try {
    const workerRes = await fetch(`${WORKER_BASE_URL.replace(/\/$/, "")}/generate`, {
      method: "POST",
      signal: AbortSignal.timeout(20_000),
      headers: {
        "Content-Type": "application/json",
        "X-Worker-Secret": WORKER_SHARED_SECRET,
      },
      body: JSON.stringify({
        job_id: job.id,
        source_url: resolvedSourceUrl,
        source_kind:
          sourceType === "twitch_vod" ? "twitch_vod" :
          sourceType === "twitch_clip" ? "twitch_clip" :
          sourceType === "youtube_vod" ? "youtube_vod" : "direct",
        output_upload_url: upload.signedUrl,
        output_storage_path: outputStoragePath,
        start_time_seconds: Math.round(startTime),
        end_time_seconds: Math.round(endTime),
        callback_url: callbackUrl,
        callback_secret: WORKER_SHARED_SECRET,
        captions_enabled: captionsEnabled,
        captions_language: captionsLanguage,
        captions_style: captionsStyle,
        transcribe_url: transcribeUrl,
        transcribe_secret: WORKER_SHARED_SECRET,
        ...layoutPayload,
      }),
    });
    const workerBody = await workerRes.text().catch(() => "");
    await admin
      .from("creator_video_generation_jobs")
      .update({
        metadata: {
          create_payload: {
            content_item_id: contentItemId,
            source_type: sourceType,
            start_time_seconds: Math.round(startTime),
            end_time_seconds: Math.round(endTime),
            duration_seconds: duration,
          },
          worker_dispatch: {
            status: workerRes.status,
            ok: workerRes.ok,
            body: workerBody.slice(0, 500),
            at: new Date().toISOString(),
          },
        },
      })
      .eq("id", job.id);
    console.info(JSON.stringify({ event: "clip_job_worker_dispatch", job_id: job.id, status: workerRes.status, ok: workerRes.ok }));
    if (!workerRes.ok) {
      await failJob(admin, job.id, contentItemId, "worker_no_callback", "Le worker vidéo n’a pas répondu.");
      return json({ success: false, reason: "worker_no_callback", message: "Le worker vidéo n’a pas répondu." }, 502);
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown";
    console.error(JSON.stringify({ event: "clip_job_worker_dispatch_failed", job_id: job.id, message }));
    await failJob(admin, job.id, contentItemId, "worker_no_callback", "Le worker vidéo n’a pas répondu.");
    return json({ success: false, reason: "worker_no_callback", message: "Le worker vidéo n’a pas répondu." }, 502);
  }

  return json({ success: true, job_id: job.id, status: job.status });
});
