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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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
  if (!["upload", "storage_url", "direct_url", "twitch_vod"].includes(sourceType)) return json({ error: "invalid_source_type" }, 400);
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
    return json({ error: "output_sign_failed", detail: upSignErr?.message }, 500);
  }

  // Dispatch to worker (fire-and-forget).
  const callbackUrl = `${SUPABASE_URL}/functions/v1/clip-job-callback`;
  try {
    await fetch(`${WORKER_BASE_URL.replace(/\/$/, "")}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Worker-Secret": WORKER_SHARED_SECRET,
      },
      body: JSON.stringify({
        job_id: job.id,
        source_url: resolvedSourceUrl,
        source_kind: sourceType === "twitch_vod" ? "twitch_vod" : "direct",
        output_upload_url: upload.signedUrl,
        output_storage_path: outputStoragePath,
        start_time_seconds: Math.round(startTime),
        end_time_seconds: Math.round(endTime),
        callback_url: callbackUrl,
        callback_secret: WORKER_SHARED_SECRET,
      }),
    });
  } catch (e) {
    console.error("worker dispatch failed", e instanceof Error ? e.message : "unknown");
    // Don't fail the request — the job is queued; admin can retry dispatch.
  }

  return json({ success: true, job_id: job.id, status: job.status });
});
