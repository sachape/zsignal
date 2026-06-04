// V3D Clip Generator Worker — stateless.
// Receives everything it needs from the Lovable Edge Function:
//   POST /generate
//   Headers: X-Worker-Secret: <WORKER_SHARED_SECRET>
//   Body: {
//     job_id, source_url, source_kind?,        // source_kind: "twitch_vod" | "direct"
//     output_upload_url, output_storage_path,
//     start_time_seconds, end_time_seconds,
//     callback_url, callback_secret
//   }
//
// Source kinds:
//   - "direct"     → fetch(source_url) and pipe to ffmpeg (existing behavior).
//   - "twitch_vod" → use yt-dlp to download just the requested section from a
//                    https://www.twitch.tv/videos/<id> URL, then ffmpeg-trim.
//
// Env required: WORKER_SHARED_SECRET. PORT optional (default 8080).

import express from "express";
import { spawn } from "node:child_process";
import { mkdtemp, rm, stat, readFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";

const WORKER_VERSION = "1.2.0";
const PORT = Number(process.env.PORT || 8080);
const WORKER_SHARED_SECRET = process.env.WORKER_SHARED_SECRET;

if (!WORKER_SHARED_SECRET) {
  console.error("Missing required env: WORKER_SHARED_SECRET");
  process.exit(1);
}

// ── Capability probes (run at boot, refreshed on /health) ─────────────────
async function probeBinary(cmd, args) {
  try {
    const out = await new Promise((resolve) => {
      const p = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
      let buf = "";
      p.stdout.on("data", (d) => { buf += d.toString(); });
      p.stderr.on("data", (d) => { buf += d.toString(); });
      p.on("error", () => resolve({ ok: false, version: null }));
      p.on("close", (code) => {
        if (code !== 0) resolve({ ok: false, version: null });
        else resolve({ ok: true, version: buf.split("\n")[0].trim().slice(0, 120) });
      });
    });
    return out;
  } catch {
    return { ok: false, version: null };
  }
}

async function capabilities() {
  const [ff, yt] = await Promise.all([
    probeBinary("ffmpeg", ["-version"]),
    probeBinary("yt-dlp", ["--version"]),
  ]);
  return {
    worker_version: WORKER_VERSION,
    ffmpeg_available: ff.ok,
    ffmpeg_version: ff.version,
    yt_dlp_available: yt.ok,
    yt_dlp_version: yt.version,
  };
}

// Boot-time log so a `fly logs` after deploy immediately shows capabilities.
capabilities().then((c) => {
  console.log("[boot] capabilities", JSON.stringify(c));
}).catch(() => {});

const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/health", async (_req, res) => {
  const caps = await capabilities();
  res.json({ ok: caps.ffmpeg_available && caps.yt_dlp_available, ...caps });
});

app.post("/generate", async (req, res) => {
  const secret = req.header("X-Worker-Secret") ?? "";
  if (secret !== WORKER_SHARED_SECRET) return res.status(403).json({ error: "forbidden" });

  const {
    job_id,
    source_url,
    source_kind,
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

  res.status(202).json({ accepted: true, job_id });

  processJob({
    jobId: job_id,
    sourceUrl: source_url,
    sourceKind:
      source_kind === "twitch_vod" || source_kind === "youtube_vod"
        ? source_kind
        : "direct",
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
  sourceKind,
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

    const duration = Math.max(1, Math.round(endSeconds - startSeconds));

    // 1) Acquire source segment.
    if (sourceKind === "twitch_vod" || sourceKind === "youtube_vod") {
      // yt-dlp pulls only the requested section from the VOD HLS / formats.
      // --download-sections accepts "*START-END" in seconds.
      const section = `*${Math.max(0, Math.floor(startSeconds))}-${Math.ceil(endSeconds)}`;
      const ytFormat = sourceKind === "youtube_vod"
        ? "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/best"
        : "best";
      await runCommand("yt-dlp", [
        "--no-warnings",
        "--no-playlist",
        "--no-part",
        "--force-overwrites",
        "--retries", "3",
        "--fragment-retries", "5",
        "--download-sections", section,
        "-f", ytFormat,
        "--merge-output-format", "mp4",
        "-o", sourcePath,
        sourceUrl,
      ]);
    } else {
      const resp = await fetch(sourceUrl);
      if (!resp.ok || !resp.body) throw new Error(`download_failed_${resp.status}`);
      await pipeline(resp.body, createWriteStream(sourcePath));
    }

    await postCallback(callbackUrl, callbackSecret, {
      job_id: jobId,
      status: "processing",
      progress: 45,
    });

    // 2) FFmpeg cut + scale + re-encode for clean Shorts/Reels output.
    // For twitch_vod / youtube_vod, yt-dlp already trimmed roughly; we still
    // re-cut to be exact and to normalize the codec.
    const ffArgs = (sourceKind === "twitch_vod" || sourceKind === "youtube_vod")
      ? [
          "-y",
          "-i", sourcePath,
          "-t", String(duration),
          "-vf", "scale='min(1920,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease",
          "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
          "-c:a", "aac", "-b:a", "128k",
          "-movflags", "+faststart",
          outputPath,
        ]
      : [
          "-y",
          "-ss", String(startSeconds),
          "-i", sourcePath,
          "-t", String(duration),
          "-vf", "scale='min(1920,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease",
          "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
          "-c:a", "aac", "-b:a", "128k",
          "-movflags", "+faststart",
          outputPath,
        ];
    await runCommand("ffmpeg", ffArgs);

    const outStat = await stat(outputPath);
    if (outStat.size === 0) throw new Error("empty_output");

    await postCallback(callbackUrl, callbackSecret, {
      job_id: jobId,
      status: "processing",
      progress: 80,
    });

    // 3) Upload via signed PUT URL.
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
    const code = message.startsWith("yt-dlp")
      ? "twitch_vod_unavailable"
      : message.startsWith("ffmpeg")
        ? "ffmpeg_error"
        : "worker_error";
    await postCallback(callbackUrl, callbackSecret, {
      job_id: jobId,
      status: "failed",
      error_code: code,
      error_message: message.slice(0, 500),
    });
  } finally {
    rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

function runCommand(cmd, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", (d) => { stderr += d.toString(); });
    proc.on("error", (err) => reject(new Error(`${cmd}_spawn_error: ${err.message}`)));
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd}_exit_${code}: ${stderr.slice(-400)}`));
    });
  });
}

app.listen(PORT, () => {
  console.log(`Clip generator worker v${WORKER_VERSION} listening on :${PORT}`);
});
