// V3D — Create a clip generation job
// Auth: user JWT required. RLS-scoped insert.
// Body: { content_item_id, source_type, source_storage_path|source_url, start_time_seconds, end_time_seconds }
// Behavior: validate ownership, create job (status=queued), update content item (status=generating, generation_status=queued),
// then trigger the external worker. Worker URL + shared secret read from env.

import { createClient } from "npm:@supabase/supabase-js@2";

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
  const sourceType = String(body.source_type ?? "");
  const sourceUrl = body.source_url ? String(body.source_url) : null;
  const sourceStoragePath = body.source_storage_path ? String(body.source_storage_path) : null;
  const startTime = Number(body.start_time_seconds);
  const endTime = Number(body.end_time_seconds);

  if (!contentItemId) return json({ error: "missing_content_item_id" }, 400);
  if (!["upload", "storage_url", "direct_url", "twitch_vod", "twitch_clip", "youtube_vod"].includes(sourceType)) return json({ error: "invalid_source_type" }, 400);
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) return json({ error: "invalid_timestamps" }, 400);
  if (startTime < 0 || endTime <= startTime) return json({ error: "invalid_range" }, 400);
  const duration = Math.round(endTime - startTime);
  if (duration < 5 || duration > 180) return json({ error: "invalid_duration" }, 400);

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
      const parts = u.pathname.split("/").filter(Boolean);
      const isClipsHost = host === "clips.twitch.tv" && /^[A-Za-z0-9_-]{4,}$/.test(parts[0] ?? "");
      const isChannelClip = host === "twitch.tv" && parts[1] === "clip" && /^[A-Za-z0-9_-]{4,}$/.test(parts[2] ?? "");
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
      output_format: "mp4_16_9",
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
