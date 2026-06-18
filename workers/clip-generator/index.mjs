// Streamnco Clip Generator Worker — v3.12
// v3.12 — Manual facecam crops are now pre-processed by clip-job-create with
// the canonical "safe crop" (10% padding, snapped to the band ratio
// 1080/576, clamped with shift). The worker still renders facecam strictly
// in cover mode (scale=force_original_aspect_ratio=increase + crop) → no
// letterbox, no blur, no black bars, no stretching, no matter how loose
// the user's selection was.
// Stateless ffmpeg worker. Receives a job from the Lovable Edge Function and
// produces either:
//   - a legacy 16:9 clip (when no layout is provided — backward compatible),
//   - or a vertical 9:16 social clip (1080x1920) with optional facecam-top /
//     gameplay-bottom composition, OpenCV facecam auto-detection and optional
//     burn-in subtitles.
//
// POST /generate
//   Headers: X-Worker-Secret: <WORKER_SHARED_SECRET>
//   Body: {
//     job_id,
//     source_url, source_kind?,                  // "twitch_vod" | "twitch_clip" | "youtube_vod" | "direct"
//     output_upload_url, output_storage_path,
//     start_time_seconds, end_time_seconds,
//     callback_url, callback_secret,
//
//     // Layout — optional. If omitted → legacy 16:9 pipeline.
//     output_format?,                            // "vertical_9_16" | "horizontal_16_9"
//     output_width?, output_height?,             // default 1080x1920 when vertical
//     layout_type?,                              // "facecam_top_gameplay_bottom" | "gameplay_only"
//     facecam_crop?,                             // { x, y, width, height }
//     gameplay_crop?,                            // { x, y, width, height } (optional)
//     source_reference_width?, source_reference_height?  // resolution where crops were defined
//     auto_detect_facecam?, layout_source?,       // true / "auto_detect" by default from clip-job-create
//
//     // Captions — optional, enabled by default by clip-job-create.
//     captions_enabled?, captions_language?,
//     captions_style?,                            // "clean" | "bold_tiktok" | "gaming_neon" | "minimal"
//     transcribe_url?, transcribe_secret?
//   }
//
// Env required: WORKER_SHARED_SECRET. PORT optional (default 8080).

import express from "express";
import { spawn } from "node:child_process";
import { mkdtemp, rm, stat, readFile, writeFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";

const WORKER_VERSION = "3.13";
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
  const [ff, yt, py, cv] = await Promise.all([
    probeBinary("ffmpeg", ["-version"]),
    probeBinary("yt-dlp", ["--version"]),
    probeBinary("python3", ["--version"]),
    probeBinary("python3", ["-c", "import cv2; print(cv2.__version__)"]),
  ]);
  return {
    worker_version: WORKER_VERSION,
    ffmpeg_available: ff.ok,
    ffmpeg_version: ff.version,
    yt_dlp_available: yt.ok,
    yt_dlp_version: yt.version,
    python_available: py.ok,
    opencv_available: cv.ok,
    opencv_version: cv.version,
    supports_vertical_9_16: true,
    supports_facecam_autodetect: cv.ok,
    supports_auto_captions: true,
    supported_layouts: ["facecam_top_gameplay_bottom", "gameplay_only"],
  };
}

// Cache capabilities once at boot. /health MUST be instantaneous, otherwise
// Fly's healthcheck (5s timeout) fails while ffmpeg saturates the CPUs and
// the machine is killed mid-render → callbacks never sent → jobs stuck.
let CACHED_CAPS = {
  worker_version: WORKER_VERSION,
  ffmpeg_available: false,
  yt_dlp_available: false,
  opencv_available: false,
  supports_vertical_9_16: true,
  supports_facecam_autodetect: false,
  supported_layouts: ["facecam_top_gameplay_bottom", "gameplay_only"],
  booting: true,
};

capabilities()
  .then((c) => {
    CACHED_CAPS = { ...c, booting: false };
    console.log("[boot] capabilities", JSON.stringify(CACHED_CAPS));
  })
  .catch(() => {});

const app = express();
app.use(express.json({ limit: "1mb" }));

// Synchronous, zero-fork health endpoint — safe under heavy ffmpeg load.
app.get("/health", (_req, res) => {
  res.json({
    ok: CACHED_CAPS.ffmpeg_available && CACHED_CAPS.yt_dlp_available,
    ...CACHED_CAPS,
  });
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
    auto_detect_facecam,
    layout_source,
    captions_enabled,
    captions_language,
    captions_style,
    transcribe_url,
    transcribe_secret,
    gameplay_framing,
    manual_facecam_crop,
    detector_strategy,
  } = req.body ?? {};

  // MVP — Manual facecam placement. The dispatcher already converted the
  // normalized crop to a pixel `facecam_crop`; this block only logs the
  // override so it's traceable end-to-end in Fly logs.
  if (detector_strategy === "manual_override" && manual_facecam_crop) {
    const c = manual_facecam_crop;
    console.log(
      `[manual_override] using manual_facecam_crop x=${c.x} y=${c.y} w=${c.width} h=${c.height} job_id=${job_id}`,
    );
  }

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
      source_kind === "twitch_vod" || source_kind === "youtube_vod" || source_kind === "twitch_clip"
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
    // Hard guard: when the dispatcher says "auto_detect", we ignore any
    // residual facecam_crop / gameplay_crop that might be sitting in the
    // payload from an older client build. Auto-detect must mean auto-detect.
    facecamCrop: (layout_source === "auto_detect" || auto_detect_facecam === true) ? null : (facecam_crop ?? null),
    gameplayCrop: (layout_source === "auto_detect" || auto_detect_facecam === true) ? null : (gameplay_crop ?? null),
    sourceReferenceWidth:
      typeof source_reference_width === "number" ? source_reference_width : null,
    sourceReferenceHeight:
      typeof source_reference_height === "number" ? source_reference_height : null,
    autoDetectFacecam: auto_detect_facecam === true || layout_source === "auto_detect",
    layoutSource: typeof layout_source === "string" ? layout_source : null,
    captionsEnabled: captions_enabled !== false && !!transcribe_url,
    captionsLanguage: typeof captions_language === "string" ? captions_language : "fr",
    captionsStyle: (["clean", "bold_tiktok", "gaming_neon", "minimal"].includes(captions_style)) ? captions_style : "clean",
    transcribeUrl: typeof transcribe_url === "string" ? transcribe_url : null,
    transcribeSecret: typeof transcribe_secret === "string" ? transcribe_secret : WORKER_SHARED_SECRET,
    // Default to "fill_relaxed" — gameplay band gets a bit more height so the
    // 16:9 source covers a less-tall area → ~7% less zoom. Still fully filled,
    // no blur, no bars. Pass "fill_tight" to keep the legacy framing.
    gameplayFraming: gameplay_framing === "fill_tight" ? "fill_tight" : "fill_relaxed",
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


// Given a detected facecam rect in the actual source frame coords,
// derive a sensible gameplay crop = largest rect that excludes the
// facecam band. Falls back to the full frame if shape is ambiguous.
function gameplayCropFromFacecam(face, frameW, frameH) {
  if (!face || !frameW || !frameH) return null;
  const cx = face.x + face.width / 2;
  const cy = face.y + face.height / 2;
  const horizontal = cx < frameW / 2 ? "left" : "right";
  const vertical = cy < frameH / 2 ? "top" : "bottom";
  const touchesLeft = face.x <= frameW * 0.08;
  const touchesRight = face.x + face.width >= frameW * 0.92;
  const touchesTop = face.y <= frameH * 0.08;
  const touchesBottom = face.y + face.height >= frameH * 0.92;

  // If the webcam is a side overlay (common lower-left/lower-right streamer
  // layout), trim that side first. Vertical trimming would remove the gameplay
  // HUD/action band and cause an over-zoomed bottom crop.
  if ((touchesLeft || touchesRight) && !touchesTop && !touchesBottom) {
    if (touchesLeft) {
      const cutX = Math.min(frameW - 2, face.x + face.width + 4);
      const newW = frameW - cutX;
      if (newW / frameW >= 0.55) return { x: cutX, y: 0, width: newW, height: frameH };
    } else {
      const newW = Math.max(2, face.x - 4);
      if (newW / frameW >= 0.55) return { x: 0, y: 0, width: newW, height: frameH };
    }
  }

  // Prefer trimming vertically (most facecams sit in a top or bottom band).
  // Only do it if at least 55% of the frame height remains after the trim.
  if (vertical === "bottom") {
    const newH = Math.max(2, face.y - 4);
    if (newH / frameH >= 0.55) {
      return { x: 0, y: 0, width: frameW, height: newH };
    }
  } else {
    const cutY = Math.min(frameH - 2, face.y + face.height + 4);
    const newH = frameH - cutY;
    if (newH / frameH >= 0.55) {
      return { x: 0, y: cutY, width: frameW, height: newH };
    }
  }

  // Otherwise trim horizontally.
  if (horizontal === "left") {
    const cutX = Math.min(frameW - 2, face.x + face.width + 4);
    const newW = frameW - cutX;
    if (newW / frameW >= 0.55) return { x: cutX, y: 0, width: newW, height: frameH };
  } else {
    const newW = Math.max(2, face.x - 4);
    if (newW / frameW >= 0.55) return { x: 0, y: 0, width: newW, height: frameH };
  }

  // Last resort: full frame (facecam will appear small inside gameplay; acceptable).
  return { x: 0, y: 0, width: frameW, height: frameH };
}

function facecamBandRenderCrop(face, frameW, frameH, outW, outH, gameplayFraming) {
  if (!face || !frameW || !frameH || !outW || !outH) return face;

  let cropW = Math.max(8, face.width);
  let cropH = Math.max(8, face.height);

  // The camera crop must stay tight. FFmpeg then scales this crop with
  // force_original_aspect_ratio=increase and crops it to the full top band,
  // making even a tiny webcam fill the whole upper area instead of staying as a
  // small box inside a larger strip.
  cropW *= 1.04;
  cropH *= 1.04;

  cropW = Math.min(cropW, frameW);
  cropH = Math.min(cropH, frameH);

  const touchesLeft = face.x <= frameW * 0.08;
  const touchesRight = face.x + face.width >= frameW * 0.92;
  const touchesTop = face.y <= frameH * 0.08;
  const touchesBottom = face.y + face.height >= frameH * 0.92;

  let x = face.x + face.width / 2 - cropW / 2;
  let y = face.y + face.height / 2 - cropH / 2;
  if (touchesLeft && !touchesRight) x = face.x;
  if (touchesRight && !touchesLeft) x = face.x + face.width - cropW;
  if (touchesTop && !touchesBottom) y = face.y;
  if (touchesBottom && !touchesTop) y = face.y + face.height - cropH;

  x = Math.max(0, Math.min(frameW - cropW, x));
  y = Math.max(0, Math.min(frameH - cropH, y));

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.max(8, Math.round(cropW)),
    height: Math.max(8, Math.round(cropH)),
  };
}

function fallbackTopFacecamCrop(frameW, frameH, corner) {
  if (!frameW || !frameH) return null;
  const width = frameW * 0.36;
  const height = Math.min(frameH * 0.32, width * 0.75);
  const left = corner === "top_left" || corner === "bottom_left";
  return {
    x: left ? 0 : Math.round(frameW - width),
    y: 0,
    width: Math.round(width),
    height: Math.round(height),
  };
}

// Build a complex filter for the vertical 9:16 layout.
//   - facecam_top_gameplay_bottom : facecam scaled to outW x (outH*camRatio),
//     gameplay scaled+cropped to outW x (outH*(1-camRatio)), then vstack.
//     A taller gameplay band (smaller camRatio) zooms IN more on the source;
//     a shorter gameplay band (larger camRatio) zooms OUT — because the
//     16:9 source has to cover a less-tall area when the band shrinks.
//   - gameplay_only : center-crop+scale to outW x outH (minimum cover).
//
// gameplayFraming:
//   - "fill_tight"   → camRatio 0.25 (legacy, gameplay band 0.75 of height)
//   - "fill_relaxed" → camRatio 0.30 (gameplay band 0.70 → ~7% less zoom on
//                       16:9 sources, still fully filled, no blur/bars)
function buildVerticalFilterComplex({
  layoutType,
  outW,
  outH,
  facecamCrop,
  gameplayCrop,
  gameplayFraming,
}) {
  if (layoutType === "facecam_top_gameplay_bottom" && facecamCrop) {
    const camRatio = gameplayFraming === "fill_tight" ? 0.25 : 0.30;
    const camH = Math.round(outH * camRatio);
    const gameH = outH - camH;

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

  // gameplay_only or fallback when no facecam crop.
  // Already minimum-cover (no extra zoom applied) — cannot relax further
  // without introducing letterbox or blur, which the product rules forbid.
  const filter = `[0:v]scale=${outW}:${outH}:force_original_aspect_ratio=increase,crop=${outW}:${outH}[v]`;
  return { filterComplex: filter, mapVideo: "[v]" };
}

// Run the OpenCV-based facecam detector on the downloaded source.
// Returns { detected, confidence, facecam, source_width, source_height, corner } or null.
function detectFacecam(sourcePath, startSeconds, duration) {
  return new Promise((resolve) => {
    const p = spawn("python3", ["/app/detect_facecam.py", sourcePath, String(startSeconds), String(duration)], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    let err = "";
    const timer = setTimeout(() => { p.kill("SIGTERM"); resolve(null); }, 60_000);
    p.stdout.on("data", (d) => { out += d.toString(); });
    p.stderr.on("data", (d) => { err += d.toString(); });
    p.on("error", () => { clearTimeout(timer); resolve(null); });
    p.on("close", () => {
      clearTimeout(timer);
      // Forward python ranking traces so they land in Fly logs:
      //   [candidate] / [selected_facecam] / [rejected_candidate] / [runner_up]
      if (err.trim()) {
        for (const line of err.trim().split("\n")) {
          console.log("[detect_facecam]", line);
        }
      }
      try {
        const lines = out.trim().split("\n").filter(Boolean);
        const last = lines[lines.length - 1] ?? "{}";
        resolve(JSON.parse(last));
      } catch {
        resolve(null);
      }
    });
  });
}


// ── Captions (burn-in subtitles) ─────────────────────────────────────────

// Extract a compact mono MP3 from the composed clip. We send THIS file to
// the transcription proxy — never the original source — so STT cost stays
// bounded by clip duration.
function extractAudioForTranscription(videoPath, outAudioPath) {
  return runCommand("ffmpeg", [
    "-y", "-i", videoPath,
    "-vn",
    "-ac", "1",
    "-ar", "16000",
    "-b:a", "64k",
    "-f", "mp3",
    outAudioPath,
  ], 3 * 60 * 1000);
}

// Group word-level timestamps into short caption chunks (TikTok-style).
// Target: 1-3 words, max ~1.4s, max 16 chars per cue.
function groupWordsIntoCues(words) {
  const cues = [];
  let cur = null;
  const MAX_WORDS = 3;
  const MAX_DURATION = 1.4;
  const MAX_CHARS = 18;
  for (const w of words) {
    const text = String(w.text ?? "").trim();
    if (!text) continue;
    if (!cur) {
      cur = { start: w.start, end: w.end, words: [text] };
      continue;
    }
    const tentativeText = (cur.words.join(" ") + " " + text).length;
    const tentativeDuration = w.end - cur.start;
    const gap = w.start - cur.end;
    if (
      cur.words.length >= MAX_WORDS ||
      tentativeDuration > MAX_DURATION ||
      tentativeText > MAX_CHARS ||
      gap > 0.6
    ) {
      cues.push(cur);
      cur = { start: w.start, end: w.end, words: [text] };
    } else {
      cur.words.push(text);
      cur.end = w.end;
    }
  }
  if (cur) cues.push(cur);
  // Ensure no zero-length cues, clamp min duration to 0.45s for readability.
  return cues.map((c) => ({
    start: c.start,
    end: Math.max(c.end, c.start + 0.45),
    text: c.words.join(" "),
  }));
}

function secondsToAssTime(s) {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s - h * 3600 - m * 60;
  const secInt = Math.floor(sec);
  const cs = Math.floor((sec - secInt) * 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(secInt).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function escapeAssText(t) {
  return String(t)
    .replace(/\\/g, "\\\\")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/\r?\n/g, "\\N");
}

// Style presets. Each returns the ASS Style line params + per-cue text wrap.
// All keep subs inside the gameplay zone (Alignment=2, bottom-anchored,
// MarginV ≈ 22% of outH → ~y=78% of frame which is well below the facecam
// band that occupies the top 25%).
// ASS colors use &HAABBGGRR& (alpha-blue-green-red).
function getCaptionStyleParams(stylePreset, outW, outH) {
  // Base sizes scale with output height.
  const baseFont = Math.round(outH * 0.052); // ~100px on 1920

  if (stylePreset === "minimal") {
    return {
      name: "minimal",
      fontName: "DejaVu Sans",
      fontSize: Math.round(baseFont * 0.85),
      bold: 0,
      primary: "&H00F2F2F2",       // off-white
      outlineColor: "&H00101010",
      backColor: "&H50000000",
      outline: Math.max(2, Math.round(baseFont * 0.05)),
      shadow: 1,
      wrapText: (t) => t,
    };
  }
  if (stylePreset === "bold_tiktok") {
    const fs = Math.round(baseFont * 1.18);
    // Punchy accent (Streamnco yellow-green vibe). Short cues get highlighted,
    // longer ones stay white for readability.
    const accent = "&H0029E1FF"; // bright yellow-orange in BGR
    return {
      name: "bold_tiktok",
      fontName: "DejaVu Sans",
      fontSize: fs,
      bold: -1,
      primary: "&H00FFFFFF",
      outlineColor: "&H00000000",
      backColor: "&H80000000",
      outline: Math.max(6, Math.round(fs * 0.14)),
      shadow: 2,
      wrapText: (t) => {
        const wc = t.trim().split(/\s+/).length;
        // Short, punchy cues get the accent color via inline override.
        if (wc <= 2) return `{\\c${accent}}${t}{\\c&H00FFFFFF&}`;
        return t;
      },
    };
  }
  if (stylePreset === "gaming_neon") {
    const fs = Math.round(baseFont * 1.05);
    // Streamnco green #89FD3A → BGR &H003AFD89
    const neon = "&H003AFD89";
    return {
      name: "gaming_neon",
      fontName: "DejaVu Sans",
      fontSize: fs,
      bold: -1,
      primary: "&H00FFFFFF",
      outlineColor: neon,            // green glow ring
      backColor: "&H40000000",
      outline: Math.max(5, Math.round(fs * 0.11)),
      shadow: 4,                     // larger soft shadow → glow feel
      wrapText: (t) => t,
    };
  }
  // "clean" — default: white bold + thick black outline, premium readable.
  return {
    name: "clean",
    fontName: "DejaVu Sans",
    fontSize: baseFont,
    bold: -1,
    primary: "&H00FFFFFF",
    outlineColor: "&H00000000",
    backColor: "&H64000000",
    outline: Math.max(4, Math.round(baseFont * 0.10)),
    shadow: 2,
    wrapText: (t) => t,
  };
}

// Build an .ass subtitle file with selectable style preset.
// All presets share: centered (Alignment=2), bottom-anchored, MarginV in
// the gameplay zone, WrapStyle=2 (max 2 lines via line-break).
function buildAssFile(cues, outW, outH, stylePreset) {
  const s = getCaptionStyleParams(stylePreset, outW, outH);
  // Vertical placement: bottom-anchored. We want the line around y = outH*0.78
  // from top → MarginV ≈ outH * 0.22. Safely below facecam band (top 25%).
  const marginV = Math.round(outH * 0.22);
  const marginLR = Math.round(outW * 0.08);

  const header = [
    "[Script Info]",
    "ScriptType: v4.00+",
    `PlayResX: ${outW}`,
    `PlayResY: ${outH}`,
    "ScaledBorderAndShadow: yes",
    "WrapStyle: 2",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    `Style: TT,${s.fontName},${s.fontSize},${s.primary},&H000000FF,${s.outlineColor},${s.backColor},${s.bold},0,0,0,100,100,0,0,1,${s.outline},${s.shadow},2,${marginLR},${marginLR},${marginV},1`,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ];

  const events = cues.map((c) => {
    const wrapped = s.wrapText(escapeAssText(c.text));
    return `Dialogue: 0,${secondsToAssTime(c.start)},${secondsToAssTime(c.end)},TT,,0,0,0,,${wrapped}`;
  });

  return header.concat(events).join("\n") + "\n";
}

async function transcribeAudioViaProxy({ jobId, audioPath, transcribeUrl, transcribeSecret, language }) {
  const audioBuf = await readFile(audioPath);
  const form = new FormData();
  const blob = new Blob([audioBuf], { type: "audio/mpeg" });
  form.append("audio", blob, "clip-audio.mp3");
  if (language) form.append("language", language);
  const t0 = Date.now();
  const res = await fetch(transcribeUrl, {
    method: "POST",
    headers: { "X-Worker-Secret": transcribeSecret },
    body: form,
    signal: AbortSignal.timeout(120_000),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`transcribe_http_${res.status}:${text.slice(0, 200)}`);
  }
  let parsed;
  try { parsed = JSON.parse(text); } catch {
    throw new Error("transcribe_bad_json");
  }
  console.log("[captions_transcription]", JSON.stringify({
    job_id: jobId,
    duration_ms: Date.now() - t0,
    word_count: Array.isArray(parsed?.words) ? parsed.words.length : 0,
    text_len: (parsed?.text ?? "").length,
  }));
  return Array.isArray(parsed?.words) ? parsed.words : [];
}

async function maybeBurnCaptions({
  jobId,
  workDir,
  composedPath,
  transcribeUrl,
  transcribeSecret,
  captionsLanguage,
  captionsStyle,
  outW,
  outH,
  callbackUrl,
  callbackSecret,
}) {
  const audioPath = join(workDir, "audio.mp3");
  const assPath = join(workDir, "subs.ass");
  const finalPath = join(workDir, "final.mp4");

  console.log("[captions_started]", JSON.stringify({ job_id: jobId, language: captionsLanguage }));
  console.log("[captions_style_selected]", JSON.stringify({ job_id: jobId, style: captionsStyle }));

  try {
    await postCallback(callbackUrl, callbackSecret, {
      job_id: jobId, status: "processing", stage: "transcribing_audio", progress: 75,
    });

    await extractAudioForTranscription(composedPath, audioPath);

    const words = await transcribeAudioViaProxy({
      jobId, audioPath, transcribeUrl, transcribeSecret, language: captionsLanguage,
    });

    if (!words.length) {
      console.log("[captions_skipped]", JSON.stringify({ job_id: jobId, reason: "no_speech_detected" }));
      return { finalPath: composedPath };
    }

    const cues = groupWordsIntoCues(words);
    if (!cues.length) {
      console.log("[captions_skipped]", JSON.stringify({ job_id: jobId, reason: "no_cues_generated" }));
      return { finalPath: composedPath };
    }

    const ass = buildAssFile(cues, outW, outH, captionsStyle);
    await writeFile(assPath, ass, "utf8");
    console.log("[captions_generated]", JSON.stringify({
      job_id: jobId, cue_count: cues.length, ass_bytes: ass.length,
    }));

    await postCallback(callbackUrl, callbackSecret, {
      job_id: jobId, status: "processing", stage: "rendering_subtitles", progress: 82,
    });

    // Escape ass path for ffmpeg filter syntax.
    const ffEscaped = assPath.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'");
    await runCommand("ffmpeg", [
      "-y", "-i", composedPath,
      "-vf", `ass=${ffEscaped}`,
      "-c:v", "libx264", "-preset", "ultrafast", "-crf", "23",
      "-pix_fmt", "yuv420p",
      "-c:a", "copy",
      "-movflags", "+faststart",
      finalPath,
    ], 5 * 60 * 1000);

    const st = await stat(finalPath);
    if (st.size === 0) throw new Error("captions_empty_output");
    console.log("[captions_burned]", JSON.stringify({ job_id: jobId, size_bytes: st.size }));
    return { finalPath };
  } catch (err) {
    const message = err?.message ?? "unknown_error";
    console.error("[captions_failed]", JSON.stringify({ job_id: jobId, message: message.slice(0, 300) }));
    // Silent fallback to the un-captioned clip — never fail the job.
    return { finalPath: composedPath };
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
  outputFormat,
  outputWidth,
  outputHeight,
  layoutType,
  facecamCrop,
  gameplayCrop,
  sourceReferenceWidth,
  sourceReferenceHeight,
  autoDetectFacecam,
  layoutSource,
  captionsEnabled,
  captionsLanguage,
  captionsStyle,
  transcribeUrl,
  transcribeSecret,
  gameplayFraming,
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
      auto_detect_facecam: autoDetectFacecam === true,
      layout_source: layoutSource ?? null,
      has_facecam_crop: !!facecamCrop,
      has_gameplay_crop: !!gameplayCrop,
      has_manual_preset: !!facecamCrop,
      captions_enabled: !!captionsEnabled,
      captions_language: captionsLanguage ?? null,
      captions_style: captionsStyle ?? null,
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
    const downloadStartedAt = Date.now();
    if (sourceKind === "twitch_clip") {
      // Twitch Clip: download the entire clip (already short), no section trim.
      await postCallback(callbackUrl, callbackSecret, {
        job_id: jobId, status: "processing", stage: "downloading", progress: 15,
      });
      // Prefer a single mp4 rendition to skip the merge step (faster).
      await runCommand("yt-dlp", [
        "--no-warnings", "--no-playlist", "--no-part", "--force-overwrites",
        "--retries", "3", "--fragment-retries", "5",
        "-f", "best[ext=mp4]/best",
        "-o", sourcePath,
        sourceUrl,
      ], 5 * 60 * 1000);
    } else if (sourceKind === "twitch_vod" || sourceKind === "youtube_vod") {
      await postCallback(callbackUrl, callbackSecret, {
        job_id: jobId, status: "processing", stage: "downloading", progress: 15,
      });
      // Download ONLY the useful window (saves minutes on long VODs).
      const sectionStart = Math.max(0, Math.floor(startSeconds) - 2);
      const sectionEnd = Math.ceil(endSeconds) + 1;
      const section = `*${sectionStart}-${sectionEnd}`;
      const ytFormat = sourceKind === "youtube_vod"
        ? "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/best"
        : "best[ext=mp4]/best";
      await runCommand("yt-dlp", [
        "--no-warnings", "--no-playlist", "--no-part", "--force-overwrites",
        "--retries", "3", "--fragment-retries", "5",
        "--download-sections", section,
        "--force-keyframes-at-cuts",
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
    const downloadMs = Date.now() - downloadStartedAt;
    console.log("[download_timing]", JSON.stringify({ job_id: jobId, download_ms: downloadMs }));

    const sourceStat = await stat(sourcePath);
    console.log("[download_completed]", JSON.stringify({ job_id: jobId, size_bytes: sourceStat.size, duration_ms: Date.now() - startedAt }));

    await postCallback(callbackUrl, callbackSecret, {
      job_id: jobId, status: "processing", stage: "cutting", progress: 40,
    });

    // 2) Build ffmpeg command.
    // For twitch_clip: use the full downloaded clip (no -ss / no -t trim).
    const useFullSource = sourceKind === "twitch_clip";
    const trimmedAlready = sourceKind === "twitch_vod" || sourceKind === "youtube_vod";

    let ffArgs;
    let detectionMeta = null;
    let effectiveLayout = layoutType ?? "gameplay_only";
    if (isVertical) {
      // Probe actual dimensions so we can scale crops from the preset reference.
      let probed = null;
      try {
        probed = await probeVideoDimensions(sourcePath);
      } catch (probeErr) {
        console.log("[probe_failed]", JSON.stringify({ job_id: jobId, message: probeErr?.message }));
      }
      const actualW = probed?.width ?? sourceReferenceWidth ?? null;
      const actualH = probed?.height ?? sourceReferenceHeight ?? null;
      const actualDuration = typeof probed?.duration === "number" && Number.isFinite(probed.duration)
        ? probed.duration
        : null;

      let scaledFacecam = scaleCrop(facecamCrop, sourceReferenceWidth, sourceReferenceHeight, actualW, actualH);
      let scaledGameplay = scaleCrop(gameplayCrop, sourceReferenceWidth, sourceReferenceHeight, actualW, actualH);

      // SAFETY: auto-detect facecam whenever the target layout requires it and
      // the user has NOT pinned a manual crop. This must run even if the edge
      // function forgets to set auto_detect_facecam (defense in depth).
      const shouldDetect = !scaledFacecam && (
        autoDetectFacecam === true ||
        layoutType === "facecam_top_gameplay_bottom"
      );

      const strategy = scaledFacecam
        ? "manual_preset"
        : shouldDetect
        ? "auto_detect"
        : "gameplay_only_default";

      if (shouldDetect) {
        await postCallback(callbackUrl, callbackSecret, {
          job_id: jobId, status: "processing", stage: "detecting_facecam", progress: 50,
        });

        // Twitch clip URLs are already short. The UI may still send a generic
        // 60s range, but using that for sampling makes the detector extract only
        // ~1 frame from a 6s clip. Use the real downloaded duration when known.
        const detectionDuration = sourceKind === "twitch_clip" && actualDuration
          ? Math.max(1, Math.min(duration, actualDuration))
          : duration;

        const detection = await detectFacecam(
          sourcePath,
          sourceKind === "twitch_clip" ? 0 : (trimmedAlready ? 0 : startSeconds),
          detectionDuration,
        );
        detectionMeta = detection;

        console.log("[facecam_detection]", JSON.stringify({
          job_id: jobId,
          strategy,
          detected: !!detection?.detected,
          confidence: detection?.confidence ?? null,
          corner: detection?.corner ?? null,
          facecam: detection?.facecam ?? null,
          source_width: detection?.source_width ?? null,
          source_height: detection?.source_height ?? null,
          fallback_reason: detection?.detected ? null : (detection?.reason ?? "no_detection"),
          actual_width: actualW,
          actual_height: actualH,
          requested_duration: duration,
          detection_duration: detectionDuration,
        }));

        if (detection?.detected && detection.facecam && detection.source_width && actualW && actualH) {
          scaledFacecam = scaleCrop(
            detection.facecam,
            detection.source_width,
            detection.source_height,
            actualW,
            actualH,
          );
          const detectedFacecam = scaledFacecam;
          scaledFacecam = facecamBandRenderCrop(scaledFacecam, actualW, actualH, outW ?? 1080, outH ?? 1920, gameplayFraming);
          if (!scaledGameplay) {
            scaledGameplay = gameplayCropFromFacecam(detectedFacecam, actualW, actualH);
          }
          effectiveLayout = "facecam_top_gameplay_bottom";
        } else {
          // If the user asked for camera + gameplay, never remove the camera
          // band entirely. When OpenCV misses a tiny webcam, keep a conservative
          // top-edge crop so the render still has a full-screen top band instead
          // of regressing to gameplay-only.
          const fallbackFace = fallbackTopFacecamCrop(actualW, actualH, detection?.corner ?? null);
          if (fallbackFace) {
            scaledFacecam = facecamBandRenderCrop(fallbackFace, actualW, actualH, outW ?? 1080, outH ?? 1920, gameplayFraming);
            if (!scaledGameplay) {
              scaledGameplay = gameplayCropFromFacecam(fallbackFace, actualW, actualH);
            }
            effectiveLayout = "facecam_top_gameplay_bottom";
          } else {
            effectiveLayout = "gameplay_only";
          }
        }
      } else {
        console.log("[facecam_detection]", JSON.stringify({
          job_id: jobId,
          strategy,
          detected: !!scaledFacecam,
          fallback_reason: scaledFacecam ? null : "detection_not_requested",
        }));
        if (scaledFacecam) {
          scaledFacecam = facecamBandRenderCrop(scaledFacecam, actualW, actualH, outW ?? 1080, outH ?? 1920, gameplayFraming);
          effectiveLayout = "facecam_top_gameplay_bottom";
        }
      }


      await postCallback(callbackUrl, callbackSecret, {
        job_id: jobId, status: "processing", stage: "compositing", progress: 60,
      });

      const { filterComplex, mapVideo } = buildVerticalFilterComplex({
        layoutType: effectiveLayout,
        outW: outW ?? 1080,
        outH: outH ?? 1920,
        facecamCrop: scaledFacecam,
        gameplayCrop: scaledGameplay,
        gameplayFraming,
      });
      console.log("[vertical_framing]", JSON.stringify({
        job_id: jobId,
        layout: effectiveLayout,
        gameplay_framing: gameplayFraming,
        cam_ratio: effectiveLayout === "facecam_top_gameplay_bottom"
          ? (gameplayFraming === "fill_tight" ? 0.25 : 0.30)
          : null,
      }));

      const trimArgs = useFullSource
        ? ["-i", sourcePath]
        : trimmedAlready
        ? ["-i", sourcePath, "-t", String(duration)]
        : ["-ss", String(startSeconds), "-i", sourcePath, "-t", String(duration)];

      ffArgs = [
        "-y",
        ...trimArgs,
        "-filter_complex", filterComplex,
        "-map", mapVideo,
        "-map", "0:a?",
        "-c:v", "libx264", "-preset", "ultrafast", "-crf", "23",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "128k", "-ar", "48000",
        "-movflags", "+faststart",
        outputPath,
      ];
    } else {
      // Legacy 16:9 pipeline — backward compatible.
      ffArgs = useFullSource
        ? [
            "-y", "-i", sourcePath,
            "-vf", "scale='min(1920,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
            "-c:a", "aac", "-b:a", "128k",
            "-movflags", "+faststart",
            outputPath,
          ]
        : trimmedAlready
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

    // 2.5) Optional auto-captions. Burn-in subtitles on top of the composed
    //      vertical clip. Failures here NEVER fail the job — clip ships
    //      without captions and a [captions_failed] / [captions_skipped]
    //      log is emitted.
    let finalOutputPath = outputPath;
    if (captionsEnabled && transcribeUrl && isVertical) {
      const captionsResult = await maybeBurnCaptions({
        jobId,
        workDir,
        composedPath: outputPath,
        transcribeUrl,
        transcribeSecret,
        captionsLanguage,
        captionsStyle,
        outW: outW ?? 1080,
        outH: outH ?? 1920,
        callbackUrl,
        callbackSecret,
      });
      if (captionsResult?.finalPath) {
        finalOutputPath = captionsResult.finalPath;
      }
    } else {
      console.log("[captions_skipped]", JSON.stringify({
        job_id: jobId,
        reason: !captionsEnabled ? "disabled_by_user"
          : !transcribeUrl ? "no_transcribe_url"
          : "legacy_horizontal_pipeline",
      }));
    }

    await postCallback(callbackUrl, callbackSecret, {
      job_id: jobId, status: "processing", stage: "uploading", progress: 90,
    });

    // 3) Upload.
    const buf = await readFile(finalOutputPath);
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
      "-show_entries", "stream=width,height:format=duration",
      "-of", "json",
      path,
    ], { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    p.stdout.on("data", (d) => { out += d.toString(); });
    p.on("error", reject);
    p.on("close", (code) => {
      if (code !== 0) return reject(new Error(`ffprobe_exit_${code}`));
      let parsed;
      try {
        parsed = JSON.parse(out || "{}");
      } catch {
        return reject(new Error("ffprobe_bad_json"));
      }
      const stream = Array.isArray(parsed?.streams) ? parsed.streams[0] : null;
      const w = Number(stream?.width);
      const h = Number(stream?.height);
      if (!w || !h) return reject(new Error("ffprobe_no_dims"));
      const duration = Number(parsed?.format?.duration);
      resolve({
        width: w,
        height: h,
        duration: Number.isFinite(duration) && duration > 0 ? duration : null,
      });
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
  console.log(`Streamnco Clip Generator Worker — v${WORKER_VERSION} listening on :${PORT}`);
});
