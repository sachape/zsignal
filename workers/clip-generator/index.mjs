// V3D Clip Generator Worker — stateless.
// Receives everything it needs from the Lovable Edge Function:
//   POST /generate
//   Headers: X-Worker-Secret: <WORKER_SHARED_SECRET>
//   Body: {
//     job_id: string,
//     source_url: string,             // signed read URL (Storage) or public URL
//     output_upload_url: string,      // signed PUT URL (Supabase Storage signed upload)
//     output_storage_path: string,    // path inside the destination bucket (echoed back in callback)
//     start_time_seconds: number,
//     end_time_seconds: number,
//     callback_url: string,           // Lovable edge function URL
//     callback_secret: string         // = WORKER_SHARED_SECRET (echoed back as header)
//   }
//
// The worker has NO Supabase credentials. It cannot list/sign anything itself.
// Env required: WORKER_SHARED_SECRET. PORT optional (default 8080).

import express from "express";
import { spawn } from "node:child_process";
import { mkdtemp, rm, stat, readFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";

const PORT = Number(process.env.PORT || 8080);
const WORKER_SHARED_SECRET = process.env.WORKER_SHARED_SECRET;

if (!WORKER_SHARED_SECRET) {
  console.error("Missing required env: WORKER_SHARED_SECRET");
  process.exit(1);
}

const app = express();
app.use(express.json({ limit: "1mb" }));

// Health check — no secret required, responds immediately.
app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/generate", async (req, res) => {
  const secret = req.header("X-Worker-Secret") ?? "";
  if (secret !== WORKER_SHARED_SECRET) return res.status(403).json({ error: "forbidden" });

  const {
    job_id,
    source_url,
    output_upload_url,
    output_storage_path,
    start_time_seconds,
    end_time_seconds,
    callback_url,
    callback_secret,
  } = req.body ?? {};

  if (
    !job_id ||
    !source_url ||
    !output_upload_url ||
    !output_storage_path ||
    !callback_url ||
    typeof start_time_seconds !== "number" ||
    typeof end_time_seconds !== "number"
  ) {
    return res.status(400).json({ error: "missing_fields" });
  }

  // Ack immediately; process async.
  res.status(202).json({ accepted: true, job_id });

  processJob({
    jobId: job_id,
    sourceUrl: source_url,
    outputUploadUrl: output_upload_url,
    outputStoragePath: output_storage_path,
    startSeconds: start_time_seconds,
    endSeconds: end_time_seconds,
    callbackUrl: callback_url,
    callbackSecret: callback_secret ?? WORKER_SHARED_SECRET,
  }).catch((err) => {
    console.error("processJob error", job_id, err?.message);
  });
});

async function postCallback(callbackUrl, secret, payload) {
  try {
    await fetch(callbackUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Worker-Secret": secret },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("callback failed", err?.message);
  }
}

async function processJob({
  jobId,
  sourceUrl,
  outputUploadUrl,
  outputStoragePath,
  startSeconds,
  endSeconds,
  callbackUrl,
  callbackSecret,
}) {
  const workDir = await mkdtemp(join(tmpdir(), `clip-${jobId}-`));
  const sourcePath = join(workDir, "source.mp4");
  const outputPath = join(workDir, "output.mp4");

  try {
    await postCallback(callbackUrl, callbackSecret, {
      job_id: jobId,
      status: "processing",
      progress: 5,
    });

    // 1) Download source.
    const resp = await fetch(sourceUrl);
    if (!resp.ok || !resp.body) throw new Error(`download_failed_${resp.status}`);
    await pipeline(resp.body, createWriteStream(sourcePath));

    await postCallback(callbackUrl, callbackSecret, {
      job_id: jobId,
      status: "processing",
      progress: 35,
    });

    // 2) FFmpeg cut.
    const duration = Math.max(1, Math.round(endSeconds - startSeconds));
    await runFfmpeg([
      "-y",
      "-ss", String(startSeconds),
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

    await postCallback(callbackUrl, callbackSecret, {
      job_id: jobId,
      status: "processing",
      progress: 80,
    });

    // 3) Upload result via the signed PUT URL provided by the edge function.
    const buf = await readFile(outputPath);
    const upRes = await fetch(outputUploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "video/mp4" },
      body: buf,
    });
    if (!upRes.ok) {
      const detail = await upRes.text().catch(() => "");
      throw new Error(`upload_failed_${upRes.status}:${detail.slice(0, 200)}`);
    }

    // 4) Final callback.
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
