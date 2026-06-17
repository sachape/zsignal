#!/usr/bin/env python3
# Streamnco — Facecam auto-detection.
#
# Sample N frames across the segment, run Haar cascade face detection,
# cluster the detections, and emit a facecam overlay rect + confidence.
#
# Output JSON on stdout:
#   { detected: bool, confidence: 0..1, facecam: {x,y,width,height},
#     source_width, source_height, corner, frames, detections, reason? }
#
# Usage: detect_facecam.py <video_path> <start_seconds> <duration_seconds>
import sys
import os
import json
import glob
import tempfile
import subprocess
import statistics

import cv2  # type: ignore


def main() -> int:
    if len(sys.argv) < 4:
        print(json.dumps({"detected": False, "reason": "bad_args"}))
        return 0

    src = sys.argv[1]
    start = max(0.0, float(sys.argv[2]))
    duration = max(1.0, float(sys.argv[3]))

    n_frames = 8
    tmp = tempfile.mkdtemp(prefix="facecam-")

    # Use a constant fps that yields ~n_frames over the clip duration.
    # For very short clips, sample at 1 fps minimum.
    step = max(0.5, duration / n_frames)
    fps_filter = f"fps=1/{step:.3f}"

    cmd = [
        "ffmpeg", "-y",
        "-ss", str(start),
        "-i", src,
        "-t", str(duration),
        # Sample at higher resolution — facecams in gaming clips are often tiny
        # (~120-180px wide on a 1080p source). 960px was too aggressive a
        # downscale; 1280px keeps detail without blowing up Haar cost.
        "-vf", f"{fps_filter},scale=1280:-2",
        "-frames:v", str(n_frames),
        "-loglevel", "error",
        os.path.join(tmp, "f%03d.jpg"),
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)

    frames = sorted(glob.glob(os.path.join(tmp, "f*.jpg")))
    if not frames:
        print(json.dumps({"detected": False, "reason": "no_frames"}))
        return 0

    frontal = cv2.CascadeClassifier(
        os.path.join(cv2.data.haarcascades, "haarcascade_frontalface_default.xml")
    )
    profile = cv2.CascadeClassifier(
        os.path.join(cv2.data.haarcascades, "haarcascade_profileface.xml")
    )

    def detect_in(gray_img):
        # Two passes: looser frontal + profile (catches head-turn streamers).
        out = []
        for casc in (frontal, profile):
            faces = casc.detectMultiScale(
                gray_img,
                scaleFactor=1.10,
                minNeighbors=3,
                minSize=(24, 24),
                flags=cv2.CASCADE_SCALE_IMAGE,
            )
            for (x, y, w, h) in faces:
                out.append((int(x), int(y), int(w), int(h)))
        return out

    detections: list[tuple[int, int, int, int]] = []
    sample_w = sample_h = 0

    for fp in frames:
        img = cv2.imread(fp)
        if img is None:
            continue
        sample_h, sample_w = img.shape[:2]
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        gray = cv2.equalizeHist(gray)

        # 1) Full-frame pass.
        for d in detect_in(gray):
            detections.append(d)

        # 2) Corner-zoom passes. Streamer facecams live in a corner ≈25-35% of
        # the frame. Crop each corner, upsample 1.6x, detect, then translate
        # coords back into full-frame space. Catches small webcams the
        # full-frame pass misses (Haar struggles below ~36px faces).
        cw = int(sample_w * 0.40)
        ch = int(sample_h * 0.40)
        corners = [
            (0, 0),
            (sample_w - cw, 0),
            (0, sample_h - ch),
            (sample_w - cw, sample_h - ch),
        ]
        for (ox, oy) in corners:
            crop = gray[oy:oy + ch, ox:ox + cw]
            if crop.size == 0:
                continue
            up = cv2.resize(crop, None, fx=1.6, fy=1.6, interpolation=cv2.INTER_LINEAR)
            for (x, y, w, h) in detect_in(up):
                detections.append((
                    int(ox + x / 1.6),
                    int(oy + y / 1.6),
                    int(w / 1.6),
                    int(h / 1.6),
                ))

    if not detections or sample_w == 0:
        print(json.dumps({
            "detected": False,
            "reason": "no_faces",
            "frames": len(frames),
        }))
        return 0

    xs = [d[0] + d[2] / 2 for d in detections]
    ys = [d[1] + d[3] / 2 for d in detections]
    ws = [d[2] for d in detections]
    hs = [d[3] for d in detections]

    cx = statistics.median(xs)
    cy = statistics.median(ys)
    mw = statistics.median(ws)
    mh = statistics.median(hs)

    # Stability: how many detections sit close to the median position.
    tol_x = sample_w * 0.15
    tol_y = sample_h * 0.15
    stable = sum(1 for x, y in zip(xs, ys) if abs(x - cx) < tol_x and abs(y - cy) < tol_y)
    # Normalize over frames (not raw detections) so multi-pass noise doesn't
    # inflate the score. Two stable hits across ~8 frames ≈ 0.17 → accepted
    # by the lowered floor below.
    confidence = round(min(1.0, stable / max(1, len(frames) * 1.5)), 2)

    # Lower floor: with corner-zoom + dual-cascade we accept stable >= 2.
    if confidence < 0.15 or stable < 2:
        print(json.dumps({
            "detected": False,
            "reason": "low_stability",
            "confidence": confidence,
            "stable": stable,
            "frames": len(frames),
            "detections": len(detections),
        }))
        return 0

    # Expand the face bbox into a plausible webcam overlay (≈4:3, face in upper third).
    overlay_h = mh * 2.8
    overlay_w = overlay_h * 4.0 / 3.0
    ox = cx - overlay_w / 2.0
    oy = cy - overlay_h * 0.40

    # Snap to frame bounds (in the sampled coordinate space).
    ox = max(0.0, min(sample_w - overlay_w, ox))
    oy = max(0.0, min(sample_h - overlay_h, oy))
    overlay_w = max(8.0, min(overlay_w, sample_w - ox))
    overlay_h = max(8.0, min(overlay_h, sample_h - oy))

    horiz = "left" if (ox + overlay_w / 2) < sample_w / 2 else "right"
    vert = "top" if (oy + overlay_h / 2) < sample_h / 2 else "bottom"

    result = {
        "detected": True,
        "confidence": confidence,
        "frames": len(frames),
        "detections": len(detections),
        "source_width": sample_w,   # coordinates are in the sampled (scaled) space
        "source_height": sample_h,
        "facecam": {
            "x": int(round(ox)),
            "y": int(round(oy)),
            "width": int(round(overlay_w)),
            "height": int(round(overlay_h)),
        },
        "corner": f"{vert}_{horiz}",
    }
    print(json.dumps(result))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:  # noqa: BLE001 — never crash; let worker fallback to gameplay_only.
        print(json.dumps({"detected": False, "reason": "exception", "message": str(exc)[:200]}))
        sys.exit(0)
