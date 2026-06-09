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
        "-vf", f"{fps_filter},scale=960:-2",
        "-frames:v", str(n_frames),
        "-loglevel", "error",
        os.path.join(tmp, "f%03d.jpg"),
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)

    frames = sorted(glob.glob(os.path.join(tmp, "f*.jpg")))
    if not frames:
        print(json.dumps({"detected": False, "reason": "no_frames"}))
        return 0

    cascade_path = os.path.join(cv2.data.haarcascades, "haarcascade_frontalface_default.xml")
    cascade = cv2.CascadeClassifier(cascade_path)

    detections: list[tuple[int, int, int, int]] = []
    sample_w = sample_h = 0

    for fp in frames:
        img = cv2.imread(fp)
        if img is None:
            continue
        sample_h, sample_w = img.shape[:2]
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        gray = cv2.equalizeHist(gray)
        faces = cascade.detectMultiScale(
            gray,
            scaleFactor=1.15,
            minNeighbors=5,
            minSize=(36, 36),
            flags=cv2.CASCADE_SCALE_IMAGE,
        )
        for (x, y, w, h) in faces:
            detections.append((int(x), int(y), int(w), int(h)))

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

    # Stability: how many faces sit close to the median position.
    tol_x = sample_w * 0.20
    tol_y = sample_h * 0.20
    stable = sum(1 for x, y in zip(xs, ys) if abs(x - cx) < tol_x and abs(y - cy) < tol_y)
    confidence = round(stable / max(1, len(frames)), 2)

    if confidence < 0.4 or stable < 2:
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
