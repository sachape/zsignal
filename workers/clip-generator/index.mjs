// Clip Generator Worker — stateless.
// Backward compatible:
//   POST /generate
//   Headers: X-Worker-Secret: <WORKER_SHARED_SECRET>
//   Body: {
//     job_id, source_url, source_kind?,        // "twitch_vod" | "youtube_vod" | "direct"
//     output_upload_url, output_storage_path,
//     start_time_seconds, end_time_seconds,
//     callback_url, callback_secret,
//     // NEW (optional) — vertical social layout:
//     layout?: {
//       type: "facecam_top_gameplay_bottom" | "gameplay_only",
//       output_width: 1080, output_height: 1920,
//       facecam?:  { x, y, w, h },
//       gameplay?: { x, y, w, h },
//       reference_width?: number, reference_height?: number,
//     }
//   }
//
// When `layout` is absent, the worker preserves the original 16:9 behaviour.

import express from "express";
import { spawn } from "node:child_process";
import { mkdtemp, rm, stat, readFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";

const WORKER_VERSION = "2.0.0";
const PORT = Number(process.env.PORT || 8080);
const WORKER_SHARED_SECRET = process.env.WORKER_SHARED_SECRET;

if (!WORKER_SHARED_SECRET) {
  console.error("Missing required env: WORKER_SHARED_SECRET");
  process.exit(1);
}

async function probeBinary(cmd, args) {
  try {
    return await new Promise((resolve) => {
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
  } catch {
    return { ok: false, version: null };
  }
}

async function capabilities() {
  const [ff, yt, ffprobe] = await Promise.all([
    probeBinary("ffmpeg", ["-version"]),
    probeBinary("yt-dlp", ["--version"]),
    probeBinary("ffprobe", ["-version"]),
  ]);
  return {
    worker_version: WORKER_VERSION,
    ffmpeg_available: ff.ok,
    ffmpeg_version: ff.version,
    yt_dlp_available: yt.ok,
    yt_dlp_version: yt.version,
    ffprobe_available: ffprobe.ok,
  };
}

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
    job_id, source_url, source_kind,
    output_upload_url, output_storage_path,
    start_time_seconds, end_time_seconds,
    callback_url, callback_secret,
    layout,
  } = req.body ?? {};

  if (
    !job_id || !source_url || !output_upload_url || !output_storage_path || !callback_url ||
    typeof start_time_seconds !== "number" || typeof end_time_seconds !== "number"
  ) return res.status(400).json({ error: "missing_fields" });

  res.status(202).json({ accepted: true, job_id });

  processJob({
    jobId: job_id,
    sourceUrl: source_url,
    sourceKind: source_kind === "twitch_vod" || source_kind === "youtube_vod" ? source_kind : "direct",
    outputUploadUrl: output_upload_url,
    outputStoragePath: output_storage_path,
    startSeconds: start_time_seconds,
    endSeconds: end_time_seconds,
    callbackUrl: callback_url,
    callbackSecret: callback_secret ?? WORKER_SHARED_SECRET,
    layout: layout && typeof layout === "object" ? layout : null,
  }).catch((err) => console.error("processJob error", job_id, err?.message));
});

async function postCallback(callbackUrl, secret, payload) {
  try {
    const res = await fetch(callbackUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Worker-Secret": secret },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (err) {
    console.error("[callback_failed]", JSON.stringify({ job_id: payload.job_id, message: err?.message }));
    return false;
  }
}

async function probeDimensions(filePath) {
  try {
    const out = await new Promise((resolve, reject) => {
      const p = spawn("ffprobe", [
        "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height",
        "-of", "csv=p=0",
        filePath,
      ], { stdio: ["ignore", "pipe", "pipe"] });
      let buf = "";
      p.stdout.on("data", (d) => { buf += d.toString(); });
      p.on("error", reject);
      p.on("close", () => resolve(buf.trim()));
    });
    const [w, h] = out.split(",").map((n) => Number(n));
    if (Number.isFinite(w) && Number.isFinite(h)) return { width: w, height: h };
  } catch {}
  return null;
}

/** Build ffmpeg args for the vertical 1080x1920 social layout. */
function buildVerticalFilterComplex(layout, sourceWidth, sourceHeight) {
  const outW = layout.output_width || 1080;
  const outH = layout.output_height || 1920;
  const camH = Math.round(outH * 0.25); // 480
  const gameH = outH - camH;            // 1440

  // Scale facecam coords from reference resolution → real source resolution.
  const refW = layout.reference_width || sourceWidth;
  const refH = layout.reference_height || sourceHeight;
  const sx = sourceWidth / refW;
  const sy = sourceHeight / refH;

  const type = layout.type || "facecam_top_gameplay_bottom";

  if (type === "gameplay_only") {
    // Fill 1080x1920 with cropped gameplay (whole source).
    return {
      filter: `scale=${outW}:${outH}:force_original_aspect_ratio=increase,crop=${outW}:${outH}`,
      complex: false,
    };
  }

  // Facecam coords (required for vertical layout).
  if (!layout.facecam) return null;
  const fx = Math.max(0, Math.round(layout.facecam.x * sx));
  const fy = Math.max(0, Math.round(layout.facecam.y * sy));
  const fw = Math.max(2, Math.round(layout.facecam.w * sx));
  const fh = Math.max(2, Math.round(layout.facecam.h * sy));

  // Gameplay zone — fall back to whole frame if not provided.
  const g = layout.gameplay;
  const gx = g ? Math.max(0, Math.round(g.x * sx)) : 0;
  const gy = g ? Math.max(0, Math.round(g.y * sy)) : 0;
  const gw = g ? Math.max(2, Math.round(g.w * sx)) : sourceWidth;
  const gh = g ? Math.max(2, Math.round(g.h * sy)) : sourceHeight;

  const complex = [
    `[0:v]split=2[v0][v1]`,
    `[v0]crop=${fw}:${fh}:${fx}:${fy},scale=${outW}:${camH}:force_original_aspect_ratio=increase,crop=${outW}:${camH}[cam]`,
    `[v1]crop=${gw}:${gh}:${gx}:${gy},scale=${outW}:${gameH}:force_original_aspect_ratio=increase,crop=${outW}:${gameH}[game]`,
    `[cam][game]vstack=inputs=2[v]`,
  ].join(";");

  return { filter: complex, complex: true };
}

async function processJob({
  jobId, sourceUrl, sourceKind, outputUploadUrl, outputStoragePath,
  startSeconds, endSeconds, callbackUrl, callbackSecret, layout,
}) {
  const workDir = await mkdtemp(join(tmpdir(), `clip-${jobId}-`));
  const sourcePath = join(workDir, "source.mp4");
  const outputPath = join(workDir, "output.mp4");
  const startedAt = Date.now();

  try {
    await postCallback(callbackUrl, callbackSecret, {
      job_id: jobId, status: "processing", stage: "worker_started", progress: 5,
    });

    const duration = Math.max(1, Math.round(endSeconds - startSeconds));

    // 1) Download source segment.
    await postCallback(callbackUrl, callbackSecret, {
      job_id: jobId, status: "processing", stage: "downloading", progress: 15,
    });

    if (sourceKind === "twitch_vod" || sourceKind === "youtube_vod") {
      const section = `*${Math.max(0, Math.floor(startSeconds))}-${Math.ceil(endSeconds)}`;
      const ytFormat = sourceKind === "youtube_vod"
        ? "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/best"
        : "best";
      await runCommand("yt-dlp", [
        "--no-warnings", "--no-playlist", "--no-part", "--force-overwrites",
        "--retries", "3", "--fragment-retries", "5",
        "--download-sections", section,
        "-f", ytFormat, "--merge-output-format", "mp4",
        "-o", sourcePath, sourceUrl,
      ], 8 * 60 * 1000);
    } else {
      const resp = await fetch(sourceUrl);
      if (!resp.ok || !resp.body) throw new Error(`download_failed_${resp.status}`);
      await pipeline(resp.body, createWriteStream(sourcePath));
    }

    // 2) Cut + (optionally) compose vertical layout.
    await postCallback(callbackUrl, callbackSecret, {
      job_id: jobId, status: "processing", stage: "cutting", progress: 40,
    });

    const isVertical = layout && (layout.type === "facecam_top_gameplay_bottom" || layout.type === "gameplay_only");

    let ffArgs;
    if (isVertical) {
      const dims = await probeDimensions(sourcePath);
      const srcW = dims?.width || layout.reference_width || 1920;
      const srcH = dims?.height || layout.reference_height || 1080;
      const built = buildVerticalFilterComplex(layout, srcW, srcH);
      if (!built) throw new Error("invalid_layout");

      await postCallback(callbackUrl, callbackSecret, {
        job_id: jobId, status: "processing", stage: "compositing", progress: 60,
      });

      const ssArgs = (sourceKind === "twitch_vod" || sourceKind === "youtube_vod")
        ? [] // yt-dlp already trimmed
        : ["-ss", String(startSeconds)];

      ffArgs = [
        "-y",
        ...ssArgs,
        "-i", sourcePath,
        "-t", String(duration),
        ...(built.complex ? ["-filter_complex", built.filter, "-map", "[v]", "-map", "0:a?"] : ["-vf", built.filter]),
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
        "-c:a", "aac", "-b:a", "128k", "-ar", "48000",
        "-movflags", "+faststart",
        outputPath,
      ];
    } else {
      // Legacy 16:9 path.
      const ssArgs = (sourceKind === "twitch_vod" || sourceKind === "youtube_vod")
        ? []
        : ["-ss", String(startSeconds)];
      ffArgs = [
        "-y",
        ...ssArgs,
        "-i", sourcePath,
        "-t", String(duration),
        "-vf", "scale='min(1920,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
        "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart",
        outputPath,
      ];
    }

    await runCommand("ffmpeg", ffArgs, 5 * 60 * 1000);

    const outStat = await stat(outputPath);
    if (outStat.size === 0) throw new Error("empty_output");

    // 3) Upload MP4 via signed PUT.
    await postCallback(callbackUrl, callbackSecret, {
      job_id: jobId, status: "processing", stage: "uploading", progress: 85,
    });
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

    await postCallback(callbackUrl, callbackSecret, {
      job_id: jobId, status: "completed", stage: "completed",
      output_storage_path: outputStoragePath,
    });
    console.log("[job_completed]", JSON.stringify({ job_id: jobId, duration_ms: Date.now() - startedAt }));
  } catch (err) {
    const message = err?.message ?? "unknown_error";
    console.error("[job_failed]", JSON.stringify({ job_id: jobId, message }));
    const code = message.includes("_timeout") ? "worker_timeout"
      : message.startsWith("yt-dlp") ? "vod_unavailable"
      : message.startsWith("ffmpeg") ? "ffmpeg_error"
      : "worker_error";
    await postCallback(callbackUrl, callbackSecret, {
      job_id: jobId, status: "failed", stage: "failed",
      error_code: code, error_message: message.slice(0, 500),
    });
  } finally {
    rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

function runCommand(cmd, args, timeoutMs = 10 * 60 * 1000) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    const timer = setTimeout(() => {
      proc.kill("SIGTERM");
      reject(new Error(`${cmd}_timeout`));
    }, timeoutMs);
    proc.stderr.on("data", (d) => { stderr += d.toString(); });
    proc.on("error", (err) => reject(new Error(`${cmd}_spawn_error: ${err.message}`)));
    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`${cmd}_exit_${code}: ${stderr.slice(-400)}`));
    });
  });
}

app.listen(PORT, () => {
  console.log(`Clip generator worker v${WORKER_VERSION} listening on :${PORT}`);
});
