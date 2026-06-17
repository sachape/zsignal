#!/usr/bin/env python3
# Streamnco — Facecam auto-detection (v3.7).
#
# Sample N frames across the segment, detect candidate webcam regions
# (Haar faces + edge-bounded overlay rectangles), score them, and emit the
# best one as the facecam crop.
#
# Output JSON on stdout (single line, last one wins):
#   { detected: bool, confidence: 0..1, facecam: {x,y,width,height},
#     source_width, source_height, corner, frames, candidates: [...],
#     selected: {...}|null, rejected: [...], selection_reason: str, reason?: str }
#
# Detailed ranking traces are written to stderr — the Node worker forwards
# them so they show up in Fly logs:
#   [candidate] bbox=... score=... reason=...
#   [selected_facecam] bbox=... score=... source=...
#   [rejected_candidate] bbox=... reason=...
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


# ── Tunables ──────────────────────────────────────────────────────────────
# Coordinates throughout this file are in the SAMPLED frame space
# (we downscale to ~1280px wide before detection).
SAMPLE_TARGET_WIDTH = 1280
N_FRAMES = 8

# Hard floors for a candidate to be considered a real webcam overlay.
# A streamer webcam at 1080p source ≈ 240-400px wide; downscaled to 1280
# that's ≈ 200-320px. We accept anything ≥ 110px wide / 90px tall — below
# that we are looking at HUD icons / scoreboard avatars / lion stickers.
MIN_OVERLAY_WIDTH_PX = 110
MIN_OVERLAY_HEIGHT_PX = 90
# Also enforce as a ratio so it scales if ffmpeg samples at a different size.
MIN_OVERLAY_WIDTH_RATIO = 0.085   # 8.5% of sample width
MIN_OVERLAY_HEIGHT_RATIO = 0.110  # 11% of sample height

# Upper bounds: anything bigger is gameplay/cutscene, not a webcam.
MAX_OVERLAY_WIDTH_RATIO = 0.36
MAX_OVERLAY_HEIGHT_RATIO = 0.38
MAX_OVERLAY_AREA_RATIO = 0.20

# Face-only fallback: minimum face size to be promoted into a webcam region.
MIN_FACE_PX = 44


def log(*parts: object) -> None:
    """Write a structured trace line to stderr."""
    sys.stderr.write(" ".join(str(p) for p in parts) + "\n")


def log_bbox(tag: str, bbox: tuple[float, float, float, float], **extra) -> None:
    x, y, w, h = bbox
    fields = f"bbox=({int(x)},{int(y)},{int(w)},{int(h)})"
    for k, v in extra.items():
        if isinstance(v, float):
            fields += f" {k}={v:.3f}"
        else:
            fields += f" {k}={v}"
    log(f"[{tag}]", fields)


def main() -> int:
    if len(sys.argv) < 4:
        print(json.dumps({"detected": False, "reason": "bad_args"}))
        return 0

    src = sys.argv[1]
    start = max(0.0, float(sys.argv[2]))
    duration = max(1.0, float(sys.argv[3]))

    tmp = tempfile.mkdtemp(prefix="facecam-")
    step = max(0.5, duration / N_FRAMES)
    fps_filter = f"fps=1/{step:.3f}"

    cmd = [
        "ffmpeg", "-y",
        "-ss", str(start),
        "-i", src,
        "-t", str(duration),
        "-vf", f"{fps_filter},scale={SAMPLE_TARGET_WIDTH}:-2",
        "-frames:v", str(N_FRAMES),
        "-loglevel", "error",
        os.path.join(tmp, "f%03d.jpg"),
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)

    frames = sorted(glob.glob(os.path.join(tmp, "f*.jpg")))
    if not frames:
        log("[detect] no_frames")
        print(json.dumps({"detected": False, "reason": "no_frames"}))
        return 0

    frontal = cv2.CascadeClassifier(
        os.path.join(cv2.data.haarcascades, "haarcascade_frontalface_default.xml")
    )
    profile = cv2.CascadeClassifier(
        os.path.join(cv2.data.haarcascades, "haarcascade_profileface.xml")
    )

    def detect_in(gray_img):
        out = []
        for casc in (frontal, profile):
            faces = casc.detectMultiScale(
                gray_img,
                scaleFactor=1.10,
                minNeighbors=3,
                minSize=(28, 28),
                flags=cv2.CASCADE_SCALE_IMAGE,
            )
            for (x, y, w, h) in faces:
                out.append((int(x), int(y), int(w), int(h)))
        return out

    def rough_skin_ratio(bgr_crop) -> float:
        if bgr_crop.size == 0:
            return 0.0
        hsv = cv2.cvtColor(bgr_crop, cv2.COLOR_BGR2HSV)
        hue = hsv[:, :, 0]; sat = hsv[:, :, 1]; val = hsv[:, :, 2]
        mask = ((hue <= 25) | (hue >= 170)) & (sat >= 30) & (sat <= 190) & (val >= 45)
        return float(mask.mean())

    def border_color_signal(bgr_crop) -> float:
        if bgr_crop.size == 0:
            return 0.0
        h, w = bgr_crop.shape[:2]
        border = max(2, int(min(w, h) * 0.08))
        sat = cv2.cvtColor(bgr_crop, cv2.COLOR_BGR2HSV)[:, :, 1]
        parts = [sat[:border, :], sat[-border:, :], sat[:, :border], sat[:, -border:]]
        return max(float(p.mean()) for p in parts if p.size)

    all_faces: list[tuple[int, int, int, int]] = []
    overlay_raw: list[tuple[int, int, int, int]] = []
    sample_w = sample_h = 0

    for fp in frames:
        img = cv2.imread(fp)
        if img is None:
            continue
        sample_h, sample_w = img.shape[:2]
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        gray = cv2.equalizeHist(gray)

        frame_faces = list(detect_in(gray))

        # Corner-zoom passes for tiny webcams (Haar struggles below ~36px).
        cw = int(sample_w * 0.40); ch = int(sample_h * 0.40)
        for (ox, oy) in [(0, 0), (sample_w - cw, 0), (0, sample_h - ch), (sample_w - cw, sample_h - ch)]:
            crop = gray[oy:oy + ch, ox:ox + cw]
            if crop.size == 0:
                continue
            up = cv2.resize(crop, None, fx=1.6, fy=1.6, interpolation=cv2.INTER_LINEAR)
            for (x, y, w, h) in detect_in(up):
                frame_faces.append((int(ox + x / 1.6), int(oy + y / 1.6), int(w / 1.6), int(h / 1.6)))

        all_faces.extend(frame_faces)

        # Edge-bounded rectangle candidates (the actual webcam panel).
        edges = cv2.Canny(gray, 50, 150)
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for c in contours:
            x, y, bw, bh = cv2.boundingRect(c)
            overlay_raw.append((x, y, bw, bh))

    if not sample_w:
        log("[detect] unreadable_frames")
        print(json.dumps({"detected": False, "reason": "unreadable_frames"}))
        return 0

    min_w_px = max(MIN_OVERLAY_WIDTH_PX, int(sample_w * MIN_OVERLAY_WIDTH_RATIO))
    min_h_px = max(MIN_OVERLAY_HEIGHT_PX, int(sample_h * MIN_OVERLAY_HEIGHT_RATIO))
    max_w_px = int(sample_w * MAX_OVERLAY_WIDTH_RATIO)
    max_h_px = int(sample_h * MAX_OVERLAY_HEIGHT_RATIO)

    log(f"[detect] frames={len(frames)} sample={sample_w}x{sample_h}"
        f" min_overlay={min_w_px}x{min_h_px} max_overlay={max_w_px}x{max_h_px}"
        f" faces_raw={len(all_faces)} contours={len(overlay_raw)}")

    # ── Build candidate list ─────────────────────────────────────────────
    # Two sources of candidates:
    #   1) edge-bounded rectangles that look like a webcam panel
    #   2) face clusters expanded into a plausible webcam region
    #
    # Each candidate carries its bbox, a score and a textual reason. We log
    # every candidate (kept or rejected) for postmortem debugging.

    candidates: list[dict] = []
    rejected: list[dict] = []

    def consider_overlay(bbox, *, source: str, face_support: int, skin: float,
                         border: float, stability: int) -> None:
        x, y, w, h = bbox
        area_ratio = (w * h) / float(sample_w * sample_h)
        width_ratio = w / sample_w
        height_ratio = h / sample_h
        aspect = w / h if h else 0.0

        # Hard rejections.
        if w < min_w_px or h < min_h_px:
            entry = {"bbox": [int(x), int(y), int(w), int(h)], "source": source,
                     "reason": "too_small_ui_avatar"}
            rejected.append(entry)
            log_bbox("rejected_candidate", bbox, source=source, reason="too_small_ui_avatar",
                    width_ratio=width_ratio, height_ratio=height_ratio)
            return
        if w > max_w_px or h > max_h_px or area_ratio > MAX_OVERLAY_AREA_RATIO:
            entry = {"bbox": [int(x), int(y), int(w), int(h)], "source": source,
                     "reason": "too_large_gameplay"}
            rejected.append(entry)
            log_bbox("rejected_candidate", bbox, source=source, reason="too_large_gameplay",
                    area_ratio=area_ratio)
            return
        if not (0.55 <= aspect <= 2.30):
            entry = {"bbox": [int(x), int(y), int(w), int(h)], "source": source,
                     "reason": "aspect_implausible", "aspect": round(aspect, 2)}
            rejected.append(entry)
            log_bbox("rejected_candidate", bbox, source=source, reason="aspect_implausible",
                    aspect=aspect)
            return

        cx = x + w / 2.0
        cy = y + h / 2.0
        # Edge proximity (real webcams typically hug a corner or an edge).
        edge_dx = min(cx, sample_w - cx) / sample_w
        edge_dy = min(cy, sample_h - cy) / sample_h
        edge_score = max(0.0, 1.6 - (edge_dx + edge_dy) * 3.0)  # ~1.6 in a corner, 0 in center
        # Plausible 4:3 / 16:9 webcam aspect bonus.
        aspect_score = 1.0 - min(1.0, abs(aspect - (4 / 3)) / 1.2)
        size_score = min(1.6, area_ratio / 0.015)  # peaks around 1.5% area
        skin_score = min(1.2, skin / 0.06)
        border_score = min(1.0, border / 120.0)
        face_score = min(2.0, face_support * 0.9)
        stability_score = min(1.5, stability * 0.5)

        # Top-edge wide rectangles without face support → very likely a HUD strip.
        top_hud_penalty = 0.0
        if cy < sample_h * 0.22 and width_ratio > 0.24 and face_support == 0:
            top_hud_penalty = 2.5

        score = (edge_score + aspect_score + size_score
                 + skin_score + border_score + face_score + stability_score
                 - top_hud_penalty)
        score = round(score, 3)

        reason_bits = [f"edge={edge_score:.2f}", f"size={size_score:.2f}",
                       f"face={face_score:.2f}", f"skin={skin_score:.2f}",
                       f"border={border_score:.2f}", f"stab={stability_score:.2f}"]
        if top_hud_penalty:
            reason_bits.append(f"hud_penalty={top_hud_penalty:.2f}")
        reason = ",".join(reason_bits)

        entry = {
            "bbox": [int(x), int(y), int(w), int(h)],
            "source": source,
            "score": score,
            "face_support": face_support,
            "skin": round(skin, 3),
            "border": round(border, 1),
            "stability": stability,
            "reason": reason,
        }
        candidates.append(entry)
        log_bbox("candidate", bbox, source=source, score=score, reason=reason)

    # ----- Source 1: edge-bounded overlay rectangles -----
    # Pre-filter raw contours to drop sub-floor boxes BEFORE clustering, so
    # clusters represent real panel-sized regions.
    overlay_filtered: list[tuple[int, int, int, int]] = []
    for (x, y, bw, bh) in overlay_raw:
        if bw < min_w_px * 0.85 or bh < min_h_px * 0.85:
            continue
        if bw > max_w_px or bh > max_h_px:
            continue
        aspect = bw / bh if bh else 0.0
        if not (0.55 <= aspect <= 2.30):
            continue
        overlay_filtered.append((x, y, bw, bh))

    clusters: list[list[tuple[int, int, int, int]]] = []
    tol_x = sample_w * 0.10
    tol_y = sample_h * 0.10
    for det in overlay_filtered:
        dcx = det[0] + det[2] / 2
        dcy = det[1] + det[3] / 2
        placed = False
        for cluster in clusters:
            cxs = [c[0] + c[2] / 2 for c in cluster]
            cys = [c[1] + c[3] / 2 for c in cluster]
            if abs(dcx - statistics.median(cxs)) < tol_x and abs(dcy - statistics.median(cys)) < tol_y:
                cluster.append(det)
                placed = True
                break
        if not placed:
            clusters.append([det])

    # Per-cluster representative bbox + signals.
    for cluster in clusters:
        if not cluster:
            continue
        mx = statistics.median([c[0] for c in cluster])
        my = statistics.median([c[1] for c in cluster])
        mw = statistics.median([c[2] for c in cluster])
        mh = statistics.median([c[3] for c in cluster])
        # Compute skin/border on the first frame as a cheap proxy.
        first = cv2.imread(frames[0])
        crop_img = first[int(my):int(my + mh), int(mx):int(mx + mw)] if first is not None else None
        skin = rough_skin_ratio(crop_img) if crop_img is not None else 0.0
        border = border_color_signal(crop_img) if crop_img is not None else 0.0
        # Face support: any face center inside (with 18% padding)?
        pad_x = mw * 0.18; pad_y = mh * 0.18
        face_hits = sum(1 for (fx, fy, fw, fh) in all_faces
                        if (mx - pad_x) <= (fx + fw / 2) <= (mx + mw + pad_x)
                        and (my - pad_y) <= (fy + fh / 2) <= (my + mh + pad_y))
        consider_overlay((mx, my, mw, mh), source="panel",
                         face_support=face_hits, skin=skin, border=border,
                         stability=len(cluster))

    # ----- Source 2: face clusters expanded into a webcam region -----
    # Cluster face detections, then expand each cluster to a 4:3-ish panel.
    face_clusters: list[list[tuple[int, int, int, int]]] = []
    for det in all_faces:
        dcx = det[0] + det[2] / 2
        dcy = det[1] + det[3] / 2
        placed = False
        for cluster in face_clusters:
            cxs = [c[0] + c[2] / 2 for c in cluster]
            cys = [c[1] + c[3] / 2 for c in cluster]
            if abs(dcx - statistics.median(cxs)) < tol_x and abs(dcy - statistics.median(cys)) < tol_y:
                cluster.append(det); placed = True; break
        if not placed:
            face_clusters.append([det])

    for cluster in face_clusters:
        if not cluster:
            continue
        fw_med = statistics.median([c[2] for c in cluster])
        fh_med = statistics.median([c[3] for c in cluster])
        # Reject tiny faces outright — likely HUD avatar / lion sticker.
        if fw_med < MIN_FACE_PX or fh_med < MIN_FACE_PX:
            log_bbox("rejected_candidate",
                     (statistics.median([c[0] for c in cluster]),
                      statistics.median([c[1] for c in cluster]),
                      fw_med, fh_med),
                     source="face", reason="face_too_small_for_webcam")
            rejected.append({
                "source": "face",
                "reason": "face_too_small_for_webcam",
                "bbox": [int(statistics.median([c[0] for c in cluster])),
                         int(statistics.median([c[1] for c in cluster])),
                         int(fw_med), int(fh_med)],
            })
            continue

        cx = statistics.median([c[0] + c[2] / 2 for c in cluster])
        cy = statistics.median([c[1] + c[3] / 2 for c in cluster])
        # Expand: ~3.0x face height tall, 4:3 panel, face in upper third.
        panel_h = fh_med * 3.0
        panel_w = panel_h * 4.0 / 3.0
        # Enforce minimum panel size so a small but valid face still yields
        # a usable webcam region.
        panel_w = max(panel_w, min_w_px * 1.05)
        panel_h = max(panel_h, min_h_px * 1.05)
        px = cx - panel_w / 2.0
        py = cy - panel_h * 0.40
        # Snap to frame bounds.
        px = max(0.0, min(sample_w - panel_w, px))
        py = max(0.0, min(sample_h - panel_h, py))
        panel_w = max(8.0, min(panel_w, sample_w - px))
        panel_h = max(8.0, min(panel_h, sample_h - py))

        first = cv2.imread(frames[0])
        crop_img = first[int(py):int(py + panel_h), int(px):int(px + panel_w)] if first is not None else None
        skin = rough_skin_ratio(crop_img) if crop_img is not None else 0.0
        border = border_color_signal(crop_img) if crop_img is not None else 0.0
        consider_overlay((px, py, panel_w, panel_h), source="face_expand",
                         face_support=len(cluster), skin=skin, border=border,
                         stability=len(cluster))

    # ── Select winner ────────────────────────────────────────────────────
    if not candidates:
        log("[detect] no_candidate_passed_filters",
            f"rejected={len(rejected)}")
        print(json.dumps({
            "detected": False,
            "reason": "no_candidate",
            "frames": len(frames),
            "source_width": sample_w,
            "source_height": sample_h,
            "rejected": rejected[:20],
        }))
        return 0

    candidates.sort(key=lambda c: c["score"], reverse=True)
    winner = candidates[0]
    runners_up = candidates[1:5]

    wx, wy, ww, wh = winner["bbox"]
    log_bbox("selected_facecam", (wx, wy, ww, wh),
            source=winner["source"], score=winner["score"], reason=winner["reason"])
    for ru in runners_up:
        log_bbox("runner_up", tuple(ru["bbox"]),
                source=ru["source"], score=ru["score"])

    confidence = round(min(1.0, max(0.15, winner["score"] / 6.0)), 2)
    cx = wx + ww / 2.0
    cy = wy + wh / 2.0
    horiz = "left" if cx < sample_w / 2 else "right"
    vert = "top" if cy < sample_h / 2 else "bottom"

    result = {
        "detected": True,
        "confidence": confidence,
        "frames": len(frames),
        "source_width": sample_w,
        "source_height": sample_h,
        "facecam": {"x": int(wx), "y": int(wy), "width": int(ww), "height": int(wh)},
        "corner": f"{vert}_{horiz}",
        "selected": winner,
        "candidates": candidates[:8],
        "rejected": rejected[:12],
        "selection_reason": winner["reason"],
    }
    print(json.dumps(result))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:  # noqa: BLE001 — never crash; let worker fallback.
        log("[detect] exception", str(exc)[:200])
        print(json.dumps({"detected": False, "reason": "exception", "message": str(exc)[:200]}))
        sys.exit(0)
