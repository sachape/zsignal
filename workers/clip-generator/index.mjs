// V3D Clip Generator Worker
// POST /generate { job_id, callback_url, callback_secret }
// - Loads the job from Supabase (service role)
// - Downloads the source video (signed URL for Storage, direct fetch otherwise)
// - Cuts [start, end] with FFmpeg (re-encode H.264 + AAC, max 1080p)
// - Uploads the result to creator-generated-clips/{user_id}/{content_item_id}/{job_id}.mp4
// - Calls back the Supabase edge function with status=completed|failed
//
// Env required:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   WORKER_SHARED_SECRET
//   PORT (optional, default 8080)

import express from "express";
import { createClient } from "@supabase/supabase-js";
import { spawn } from "node:child_process";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { createReadStream, createWriteStream } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";

const PORT = Number(process.env.PORT || 8080);
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WORKER_SHARED_SECRET = process.env.WORKER_SHARED_SECRET;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !WORKER_SHARED_SECRET) {
  console.error("Missing required env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, WORKER_SHARED_SECRET");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/generate", async (req, res) => {
  const secret = req.header("X-Worker-Secret") ?? "";
  if (secret !== WORKER_SHARED_SECRET) return res.status(403).json({ error: "forbidden" });

  const { job_id, callback_url, callback_secret } = req.body ?? {};
  if (!job_id || !callback_url) return res.status(400).json({ error: "missing_fields" });

  // Ack immediately; do the actual work async.
  res.status(202).json({ accepted: true, job_id });

  processJob(job_id, callback_url, callback_secret).catch((err) => {
    console.error("processJob error", job_id, err?.message);
  });
});

async function postCallback(callbackUrl, secret, payload) {
  try {
    await fetch(callbackUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Worker-Secret": secret ?? "" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("callback failed", err?.message);
  }
}

async function processJob(jobId, callbackUrl, callbackSecret) {
  const workDir = await mkdtemp(join(tmpdir(), `clip-${jobId}-`));
  const sourcePath = join(workDir, "source.mp4");
  const outputPath = join(workDir, "output.mp4");

  try {
    const { data: job, error: jobErr } = await supabase
      .from("creator_video_generation_jobs")
      .select("*")
      .eq("id", jobId)
      .maybeSingle();
    if (jobErr || !job) throw new Error("job_not_found");

    await postCallback(callbackUrl, callbackSecret, { job_id: jobId, status: "processing", progress: 5 });

    // 1) Get source download URL.
    let downloadUrl;
    if (job.source_type === "upload" || job.source_type === "storage_url") {
      if (!job.source_storage_path) throw new Error("missing_source_storage_path");
      const { data: signed, error: signErr } = await supabase.storage
        .from("creator-source-videos")
        .createSignedUrl(job.source_storage_path, 60 * 30);
      if (signErr || !signed?.signedUrl) throw new Error("source_sign_failed");
      downloadUrl = signed.signedUrl;
    } else if (job.source_type === "direct_url") {
      if (!job.source_url) throw new Error("missing_source_url");
      downloadUrl = job.source_url;
    } else {
      throw new Error("unsupported_source_type");
    }

    // 2) Download.
    const resp = await fetch(downloadUrl);
    if (!resp.ok || !resp.body) throw new Error(`download_failed_${resp.status}`);
    await pipeline(resp.body, createWriteStream(sourcePath));

    await postCallback(callbackUrl, callbackSecret, { job_id: jobId, status: "processing", progress: 35 });

    // 3) FFmpeg cut.
    const start = job.start_time_seconds;
    const duration = job.duration_seconds;
    await runFfmpeg([
      "-y",
      "-ss", String(start),
      "-i", sourcePath,
      "-t", String(duration),
      "-vf", "scale='min(1920,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease",
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-crf", "23",
      "-c:a", "aac",
      "-b:a", "128k",
      "-movflags", "+faststart",
      outputPath,
    ]);

    const outStat = await stat(outputPath);
    if (outStat.size === 0) throw new Error("empty_output");

    await postCallback(callbackUrl, callbackSecret, { job_id: jobId, status: "processing", progress: 80 });

    // 4) Upload result to private bucket.
    const outputStoragePath = `${job.user_id}/${job.content_item_id}/${jobId}.mp4`;
    const { error: upErr } = await supabase.storage
      .from("creator-generated-clips")
      .upload(outputStoragePath, createReadStream(outputPath), {
        contentType: "video/mp4",
        upsert: true,
        duplex: "half",
      });
    if (upErr) throw new Error(`upload_failed:${upErr.message}`);

    // 5) Final callback.
    await postCallback(callbackUrl, callbackSecret, {
      job_id: jobId,
      status: "completed",
      output_storage_path: outputStoragePath,
    });
  } catch (err) {
    const message = err?.message ?? "unknown_error";
    console.error("job failed", jobId, message);
    await postCallback(callbackUrl, callbackSecret, {
      job_id: jobId,
      status: "failed",
      error_code: "ffmpeg_or_io_error",
      error_message: message.slice(0, 500),
    });
  } finally {
    rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", (d) => { stderr += d.toString(); });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg_exit_${code}: ${stderr.slice(-300)}`));
    });
  });
}

app.listen(PORT, () => {
  console.log(`Clip generator worker listening on :${PORT}`);
});
