// V3D — Worker callback: updates job + content item with generation result.
// Auth: X-Worker-Secret header must match WORKER_SHARED_SECRET. NOT a user-facing endpoint.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-worker-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WORKER_SHARED_SECRET = Deno.env.get("WORKER_SHARED_SECRET") ?? "";

const VALID_STAGES = new Set([
  "queued",
  "worker_started",
  "downloading",
  "analyzing_layout",
  "detecting_facecam",
  "cutting",
  "compositing",
  "transcribing_audio",
  "rendering_subtitles",
  "uploading",
  "completed",
  "failed",
  "cancelled",
]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const secret = req.headers.get("X-Worker-Secret") ?? "";
  if (!WORKER_SHARED_SECRET || secret !== WORKER_SHARED_SECRET) {
    return json({ error: "forbidden" }, 403);
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }

  const jobId = String(body.job_id ?? "");
  const status = String(body.status ?? "");
  if (!jobId) return json({ error: "missing_job_id" }, 400);
  if (!["processing", "completed", "failed"].includes(status)) return json({ error: "invalid_status" }, 400);
  const rawStage = body.stage ? String(body.stage) : null;
  const stage = rawStage && VALID_STAGES.has(rawStage) ? rawStage : null;

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: job, error: jobErr } = await admin
    .from("creator_video_generation_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();
  if (jobErr || !job) return json({ error: "job_not_found" }, 404);

  if (status === "processing") {
    const progress = typeof body.progress === "number" ? Math.max(0, Math.min(100, Math.round(body.progress))) : null;
    const generationStage = stage ?? (progress !== null && progress >= 80 ? "uploading" : progress !== null && progress >= 45 ? "cutting" : progress !== null && progress >= 5 ? "downloading" : "worker_started");
    await admin
      .from("creator_video_generation_jobs")
      .update({
        status: "processing",
        progress,
        generation_stage: generationStage,
        callback_status: "accepted",
        worker_started_at: job.worker_started_at ?? new Date().toISOString(),
        worker_last_seen_at: new Date().toISOString(),
      })
      .eq("id", jobId);
    await admin
      .from("creator_content_items")
      .update({ generation_status: "processing", generation_error: null })
      .eq("id", job.content_item_id);
    console.info(JSON.stringify({ event: "clip_job_callback_processing", job_id: jobId, stage: generationStage, progress }));
    return json({ success: true });
  }

  if (status === "completed") {
    const outputStoragePath = body.output_storage_path ? String(body.output_storage_path) : null;
    if (!outputStoragePath) return json({ error: "missing_output_storage_path" }, 400);

    // Generate a long-lived signed URL (7 days). Worker writes to private bucket.
    const { data: signed, error: signErr } = await admin.storage
      .from("creator-generated-clips")
      .createSignedUrl(outputStoragePath, 60 * 60 * 24 * 7);

    if (signErr || !signed?.signedUrl) {
      return json({ error: "sign_url_failed", detail: signErr?.message }, 500);
    }

    await admin
      .from("creator_video_generation_jobs")
      .update({
        status: "completed",
        progress: 100,
        generation_stage: "completed",
        callback_status: "accepted",
        worker_last_seen_at: new Date().toISOString(),
        worker_completed_at: new Date().toISOString(),
        output_storage_path: outputStoragePath,
        output_url: signed.signedUrl,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    await admin
      .from("creator_content_items")
      .update({
        status: "draft_ready",
        generation_status: "succeeded",
        generation_error: null,
        generated_video_url: signed.signedUrl,
        generated_video_storage_bucket: "creator-generated-clips",
        generated_video_storage_path: outputStoragePath,
      })
      .eq("id", job.content_item_id);

    console.info(JSON.stringify({ event: "clip_job_callback_completed", job_id: jobId, output_storage_path: outputStoragePath }));
    return json({ success: true });
  }

  // failed
  const errorCode = body.error_code ? String(body.error_code) : "worker_error";
  const rawMessage = body.error_message ? String(body.error_message).slice(0, 500) : "";
  // Translate worker error codes to user-friendly French messages.
  // The raw English message is kept in the job row for debugging.
  const errorMessage = (() => {
    switch (errorCode) {
      case "twitch_vod_unavailable":
      case "vod_unavailable":
        return "Cette VOD n'est pas accessible. Utilise une vidéo publique ou importe un fichier.";
      case "ffmpeg_error":
        return "Le découpage vidéo a échoué. Réessaie avec un autre moment.";
      case "worker_timeout":
        return "La génération a pris trop de temps. Réessaie avec un autre moment.";
      case "worker_no_callback":
        return "Le worker vidéo n’a pas répondu. Réessaie avec un autre moment.";
      case "worker_error":
      default:
        return "Réessaie avec un autre moment.";
    }
  })();

  await admin
    .from("creator_video_generation_jobs")
    .update({
      status: "failed",
      generation_stage: "failed",
      callback_status: "accepted",
      error_code: errorCode,
      error_message: rawMessage || errorMessage,
      completed_at: new Date().toISOString(),
      worker_last_seen_at: new Date().toISOString(),
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
    .eq("id", job.content_item_id);

  console.info(JSON.stringify({ event: "clip_job_callback_failed", job_id: jobId, error_code: errorCode }));
  return json({ success: true });
});
