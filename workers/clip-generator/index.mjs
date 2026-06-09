// Streamnco Clip Generator Worker — v2.0
// Stateless ffmpeg worker. Receives a job from the Lovable Edge Function and
// produces either:
//   - a legacy 16:9 clip (when no layout is provided — backward compatible),
//   - or a vertical 9:16 social clip (1080x1920) with optional facecam-top /
//     gameplay-bottom composition.
//
// POST /generate
//   Headers: X-Worker-Secret: <WORKER_SHARED_SECRET>
//   Body: {
//     job_id,
//     source_url, source_kind?,                  // "twitch_vod" | "youtube_vod" | "direct"
//     output_upload_url, output_storage_path,
//     start_time_seconds, end_time_seconds,
//     callback_url, callback_secret,
//
//     // NEW v2.0 — all optional. If omitted → legacy 16:9 pipeline.
//     output_format?,                            // "vertical_9_16" | "horizontal_16_9"
//     output_width?, output_height?,             // default 1080x1920 when vertical
//     layout_type?,                              // "facecam_top_gameplay_bottom" | "gameplay_only"
//     facecam_crop?,                             // { x, y, width, height }
//     gameplay_crop?,                            // { x, y, width, height } (optional)
//     source_reference_width?, source_reference_height?  // resolution where crops were defined
//   }
//
// Env required: WORKER_SHARED_SECRET. PORT optional (default 8080).

import express from "express";
import { spawn } from "node:child_process";
import { mkdtemp, rm, stat, readFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";

const WORKER_VERSION = "2.1";
const PORT = Number(process.env.PORT || 8080);
const WORKER_SHARED_SECRET = process.env.WORKER_SHARED_SECRET;

if (!WORKER_SHARED_SECRET) {
  console.error("Missing required env: WORKER_SHARED_SECRET");
  process.exit(1);
}

// ── Capability probes ────────────────────────────────────────────────────
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
    supports_vertical_9_16: true,
    supported_layouts: ["facecam_top_gameplay_bottom", "gameplay_only"],
  };
}

capabilities()
  .then((c) => console.log("[boot] capabilities", JSON.stringify(c)))
  .catch(() => {});

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
    output_format,
    output_width,
    output_height,
    layout_type,
    facecam_crop,
    gameplay_crop,
    source_reference_width,
    source_reference_height,
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
    outputFormat: output_format ?? null,
    outputWidth: typeof output_width === "number" ? output_width : null,
    outputHeight: typeof output_height === "number" ? output_height : null,
    layoutType: layout_type ?? null,
    facecamCrop: facecam_crop ?? null,
    gameplayCrop: gameplay_crop ?? null,
    sourceReferenceWidth:
      typeof source_reference_width === "number" ? source_reference_width : null,
    sourceReferenceHeight:
      typeof source_reference_height === "number" ? source_reference_height : null,
  }).catch((err) => {
    console.error("processJob error", job_id, err?.message);
  });
});

async function postCallback(callbackUrl, secret, payload) {
  try {
    const startedAt = Date.now();
    const res = await fetch(callbackUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Worker-Secret": secret },
      body: JSON.stringify(payload),
    });
    const text = await res.text().catch(() => "");
    console.log("[callback]", JSON.stringify({
      job_id: payload.job_id,
      status: payload.status,
      stage: payload.stage,
      accepted: res.ok,
      http_status: res.status,
      duration_ms: Date.now() - startedAt,
      body: text.slice(0, 300),
    }));
    return res.ok;
  } catch (err) {
    console.error("[callback_failed]", JSON.stringify({ job_id: payload.job_id, stage: payload.stage, message: err?.message }));
    return false;
  }
}

// ── Filter builders ─────────────────────────────────────────────────────

function scaleCrop(crop, refW, refH, actualW, actualH) {
  if (!crop || !refW || !refH || !actualW || !actualH) return crop;
  const sx = actualW / refW;
  const sy = actualH / refH;
  return {
    x: Math.max(0, Math.round(crop.x * sx)),
    y: Math.max(0, Math.round(crop.y * sy)),
    width: Math.max(2, Math.round(crop.width * sx)),
    height: Math.max(2, Math.round(crop.height * sy)),
  };
}

// Build a complex filter for the vertical 9:16 layout.
//   - facecam_top_gameplay_bottom : facecam scaled to outW x (outH*0.25),
//     gameplay scaled+cropped to outW x (outH*0.75), then vstack.
//   - gameplay_only : center-crop+scale to outW x outH.
function buildVerticalFilterComplex({
  layoutType,
  outW,
  outH,
  facecamCrop,
  gameplayCrop,
}) {
  if (layoutType === "facecam_top_gameplay_bottom" && facecamCrop) {
    const camH = Math.round(outH * 0.25); // 480 for 1920
    const gameH = outH - camH;            // 1440 for 1920

    const camCrop = `crop=${facecamCrop.width}:${facecamCrop.height}:${facecamCrop.x}:${facecamCrop.y}`;
    const camScale = `scale=${outW}:${camH}:force_original_aspect_ratio=increase,crop=${outW}:${camH}`;

    let gameBranch;
    if (gameplayCrop) {
      const gCrop = `crop=${gameplayCrop.width}:${gameplayCrop.height}:${gameplayCrop.x}:${gameplayCrop.y}`;
      gameBranch = `[b]${gCrop},scale=${outW}:${gameH}:force_original_aspect_ratio=increase,crop=${outW}:${gameH}[game]`;
    } else {
      gameBranch = `[b]scale=${outW}:${gameH}:force_original_aspect_ratio=increase,crop=${outW}:${gameH}[game]`;
    }

    const filter = [
      `[0:v]split=2[a][b]`,
      `[a]${camCrop},${camScale}[cam]`,
      gameBranch,
      `[cam][game]vstack=inputs=2[v]`,
    ].join(";");

    return { filterComplex: filter, mapVideo: "[v]" };
  }

  // gameplay_only or fallback when no facecam crop
  const filter = `[0:v]scale=${outW}:${outH}:force_original_aspect_ratio=increase,crop=${outW}:${outH}[v]`;
  return { filterComplex: filter, mapVideo: "[v]" };
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
  outputFormat,
  outputWidth,
  outputHeight,
  layoutType,
  facecamCrop,
  gameplayCrop,
  sourceReferenceWidth,
  sourceReferenceHeight,
}) {
  const workDir = await mkdtemp(join(tmpdir(), `clip-${jobId}-`));
  const sourcePath = join(workDir, "source.mp4");
  const outputPath = join(workDir, "output.mp4");
  const startedAt = Date.now();

  const isVertical = outputFormat === "vertical_9_16" || layoutType != null;
  const outW = outputWidth ?? (isVertical ? 1080 : null);
  const outH = outputHeight ?? (isVertical ? 1920 : null);

  try {
    console.log("[job_started]", JSON.stringify({
      job_id: jobId,
      source_kind: sourceKind,
      start_seconds: startSeconds,
      end_seconds: endSeconds,
      output_format: outputFormat ?? "legacy_16_9",
      layout_type: layoutType ?? null,
      worker_version: WORKER_VERSION,
    }));

    await postCallback(callbackUrl, callbackSecret, {
      job_id: jobId,
      status: "processing",
      stage: "worker_started",
      progress: 5,
    });

    const duration = Math.max(1, Math.round(endSeconds - startSeconds));

    // 1) Acquire source segment.
    if (sourceKind === "twitch_vod" || sourceKind === "youtube_vod") {
      await postCallback(callbackUrl, callbackSecret, {
        job_id: jobId, status: "processing", stage: "downloading", progress: 15,
      });
      const section = `*${Math.max(0, Math.floor(startSeconds))}-${Math.ceil(endSeconds)}`;
      const ytFormat = sourceKind === "youtube_vod"
        ? "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/best"
        : "best";
      await runCommand("yt-dlp", [
        "--no-warnings", "--no-playlist", "--no-part", "--force-overwrites",
        "--retries", "3", "--fragment-retries", "5",
        "--download-sections", section,
        "-f", ytFormat,
        "--merge-output-format", "mp4",
        "-o", sourcePath,
        sourceUrl,
      ], 8 * 60 * 1000);
    } else {
      await postCallback(callbackUrl, callbackSecret, {
        job_id: jobId, status: "processing", stage: "downloading", progress: 15,
      });
      const resp = await fetch(sourceUrl);
      if (!resp.ok || !resp.body) throw new Error(`download_failed_${resp.status}`);
      await pipeline(resp.body, createWriteStream(sourcePath));
    }

    const sourceStat = await stat(sourcePath);
    console.log("[download_completed]", JSON.stringify({ job_id: jobId, size_bytes: sourceStat.size, duration_ms: Date.now() - startedAt }));

    await postCallback(callbackUrl, callbackSecret, {
      job_id: jobId, status: "processing", stage: "cutting", progress: 40,
    });

    // 2) Build ffmpeg command.
    const trimmedAlready = sourceKind === "twitch_vod" || sourceKind === "youtube_vod";

    let ffArgs;
    if (isVertical) {
      // Probe actual dimensions so we can scale crops from the preset reference.
      const probed = await probeVideoDimensions(sourcePath).catch(() => null);
      const actualW = probed?.width ?? sourceReferenceWidth ?? null;
      const actualH = probed?.height ?? sourceReferenceHeight ?? null;

      const scaledFacecam = scaleCrop(facecamCrop, sourceReferenceWidth, sourceReferenceHeight, actualW, actualH);
      const scaledGameplay = scaleCrop(gameplayCrop, sourceReferenceWidth, sourceReferenceHeight, actualW, actualH);

      await postCallback(callbackUrl, callbackSecret, {
        job_id: jobId, status: "processing", stage: "compositing", progress: 60,
      });

      const { filterComplex, mapVideo } = buildVerticalFilterComplex({
        layoutType: layoutType ?? "gameplay_only",
        outW: outW ?? 1080,
        outH: outH ?? 1920,
        facecamCrop: scaledFacecam,
        gameplayCrop: scaledGameplay,
      });

      const trimArgs = trimmedAlready
        ? ["-i", sourcePath, "-t", String(duration)]
        : ["-ss", String(startSeconds), "-i", sourcePath, "-t", String(duration)];

      ffArgs = [
        "-y",
        ...trimArgs,
        "-filter_complex", filterComplex,
        "-map", mapVideo,
        "-map", "0:a?",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "128k", "-ar", "48000",
        "-movflags", "+faststart",
        outputPath,
      ];
    } else {
      // Legacy 16:9 pipeline — backward compatible.
      ffArgs = trimmedAlready
        ? [
            "-y", "-i", sourcePath, "-t", String(duration),
            "-vf", "scale='min(1920,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
            "-c:a", "aac", "-b:a", "128k",
            "-movflags", "+faststart",
            outputPath,
          ]
        : [
            "-y", "-ss", String(startSeconds), "-i", sourcePath, "-t", String(duration),
            "-vf", "scale='min(1920,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
            "-c:a", "aac", "-b:a", "128k",
            "-movflags", "+faststart",
            outputPath,
          ];
    }

    console.log("[ffmpeg_started]", JSON.stringify({ job_id: jobId, vertical: isVertical, duration }));
    await runCommand("ffmpeg", ffArgs, 5 * 60 * 1000);

    const outStat = await stat(outputPath);
    if (outStat.size === 0) throw new Error("empty_output");
    console.log("[ffmpeg_completed]", JSON.stringify({ job_id: jobId, size_bytes: outStat.size, duration_ms: Date.now() - startedAt }));

    await postCallback(callbackUrl, callbackSecret, {
      job_id: jobId, status: "processing", stage: "uploading", progress: 85,
    });

    // 3) Upload.
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
    console.log("[upload_completed]", JSON.stringify({ job_id: jobId, duration_ms: Date.now() - startedAt }));

    const callbackAccepted = await postCallback(callbackUrl, callbackSecret, {
      job_id: jobId,
      status: "completed",
      stage: "completed",
      output_storage_path: outputStoragePath,
    });
    console.log("[job_completed]", JSON.stringify({ job_id: jobId, callback_accepted: callbackAccepted, duration_ms: Date.now() - startedAt }));
  } catch (err) {
    const message = err?.message ?? "unknown_error";
    console.error("[job_failed]", JSON.stringify({ job_id: jobId, message, duration_ms: Date.now() - startedAt }));
    const code = message.includes("_timeout")
      ? "worker_timeout"
      : message.startsWith("yt-dlp")
      ? "vod_unavailable"
      : message.startsWith("ffmpeg")
      ? "ffmpeg_error"
      : "worker_error";
    await postCallback(callbackUrl, callbackSecret, {
      job_id: jobId, status: "failed", stage: "failed",
      error_code: code, error_message: message.slice(0, 500),
    });
  } finally {
    rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

function probeVideoDimensions(path) {
  return new Promise((resolve, reject) => {
    const p = spawn("ffprobe", [
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "stream=width,height",
      "-of", "csv=p=0",
      path,
    ], { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    p.stdout.on("data", (d) => { out += d.toString(); });
    p.on("error", reject);
    p.on("close", (code) => {
      if (code !== 0) return reject(new Error(`ffprobe_exit_${code}`));
      const [w, h] = out.trim().split(",").map((n) => Number(n));
      if (!w || !h) return reject(new Error("ffprobe_no_dims"));
      resolve({ width: w, height: h });
    });
  });
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
  console.log(`Streamnco clip generator worker v${WORKER_VERSION} listening on :${PORT}`);
});
