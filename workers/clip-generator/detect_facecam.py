#!/usr/bin/env python3
# Streamnco — Facecam auto-detection (v3.10).
#
# Sample N frames across the segment, detect candidate webcam regions
# (Haar faces + edge-bounded overlay rectangles), score them, and emit the
# best one as the facecam crop.
#
# v3.10 — Final source allow-list:
#   - source=panel is NEVER allowed as selected_facecam.
#   - panels may only act as ROI; a panel can win only after being refined to
#     source=panel_refined_to_face with a real face-sized subregion.
#   - the old "clean video panel" final exception was removed because HUDs and
#     minimaps can fake skin/border/stability/false-Haar signals.
#   - if no face_expand or reliable panel_refined_to_face candidate exists,
#     return detected=false reason=no_reliable_human_facecam.
#   - top-10 candidates are logged with bbox/source/score/face/skin/minimap/
#     edge_dens/border/stability plus final eligibility so regressions are
#     diagnosable in Fly logs.
#   - small clean webcams with a real face still win (positive case preserved)
#
# Output JSON on stdout (single line, last one wins):
#   { detected: bool, confidence: 0..1, facecam: {x,y,width,height},
#     source_width, source_height, corner, frames, candidates: [...],
#     selected: {...}|null, rejected: [...], selection_reason: str,
#     refined: bool, reason?: str }
#
# Detailed traces written to stderr (forwarded to Fly logs by the worker):
#   [candidate] bbox=... score=... reason=...
#   [rank01] bbox=... source=... score=... eligible_final=false reason=...
#   [selected_facecam] bbox=... source=face_expand|panel_refined_to_face ...
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
import numpy as np  # type: ignore


# ── Tunables ──────────────────────────────────────────────────────────────
SAMPLE_TARGET_WIDTH = 1280
N_FRAMES = 8

MIN_OVERLAY_WIDTH_PX = 110
MIN_OVERLAY_HEIGHT_PX = 90
MIN_OVERLAY_WIDTH_RATIO = 0.085
MIN_OVERLAY_HEIGHT_RATIO = 0.110

MAX_OVERLAY_WIDTH_RATIO = 0.36
MAX_OVERLAY_HEIGHT_RATIO = 0.38
MAX_OVERLAY_AREA_RATIO = 0.20

MIN_FACE_PX = 44

# A panel candidate (edge-bounded rectangle, no face cluster expansion)
# MUST show one of these signals to be considered a webcam:
#   - at least one Haar face inside (face_support >= 1), OR
#   - skin_ratio >= MIN_PANEL_SKIN_RATIO
# Otherwise it's a HUD / minimap / scoreboard and we reject it outright.
MIN_PANEL_SKIN_RATIO = 0.055

# Text/edge density above this on a face-less panel → reject as text HUD.
MAX_PANEL_EDGE_DENSITY_NO_FACE = 0.22

# Minimap detection: HoughCircles in a panel. If a strong circle covers
# more than this fraction of the panel area, treat it as minimap.
MINIMAP_CIRCLE_AREA_FRACTION = 0.18


def log(*parts: object) -> None:
    sys.stderr.write(" ".join(str(p) for p in parts) + "\n")


def log_bbox(tag: str, bbox, **extra) -> None:
    x, y, w, h = bbox
    fields = f"bbox=({int(x)},{int(y)},{int(w)},{int(h)})"
    for k, v in extra.items():
        if isinstance(v, float):
            fields += f" {k}={v:.3f}"
        else:
            fields += f" {k}={v}"
    log(f"[{tag}]", fields)


def detect_minimap_circle(gray_crop) -> float:
    """Return area fraction of the strongest circle in the crop (0 if none)."""
    if gray_crop is None or gray_crop.size == 0:
        return 0.0
    h, w = gray_crop.shape[:2]
    if min(h, w) < 40:
        return 0.0
    blurred = cv2.medianBlur(gray_crop, 5)
    min_r = int(min(h, w) * 0.20)
    max_r = int(min(h, w) * 0.55)
    if max_r <= min_r:
        return 0.0
    try:
        circles = cv2.HoughCircles(
            blurred, cv2.HOUGH_GRADIENT, dp=1.2, minDist=max(20, min_r),
            param1=120, param2=35, minRadius=min_r, maxRadius=max_r,
        )
    except cv2.error:
        return 0.0
    if circles is None:
        return 0.0
    best_r = max(float(c[2]) for c in circles[0])
    panel_area = float(h * w)
    return min(1.0, (3.14159 * best_r * best_r) / panel_area)


def edge_density(gray_crop) -> float:
    if gray_crop is None or gray_crop.size == 0:
        return 0.0
    edges = cv2.Canny(gray_crop, 60, 160)
    return float((edges > 0).mean())


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
        "ffmpeg", "-y", "-ss", str(start), "-i", src, "-t", str(duration),
        "-vf", f"{fps_filter},scale={SAMPLE_TARGET_WIDTH}:-2",
        "-frames:v", str(N_FRAMES), "-loglevel", "error",
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
                gray_img, scaleFactor=1.10, minNeighbors=3,
                minSize=(28, 28), flags=cv2.CASCADE_SCALE_IMAGE,
            )
            for (x, y, w, h) in faces:
                out.append((int(x), int(y), int(w), int(h)))
        return out

    def rough_skin_ratio(bgr_crop) -> float:
        if bgr_crop is None or bgr_crop.size == 0:
            return 0.0
        hsv = cv2.cvtColor(bgr_crop, cv2.COLOR_BGR2HSV)
        hue = hsv[:, :, 0]; sat = hsv[:, :, 1]; val = hsv[:, :, 2]
        mask = ((hue <= 25) | (hue >= 170)) & (sat >= 30) & (sat <= 190) & (val >= 45)
        return float(mask.mean())

    def border_color_signal(bgr_crop) -> float:
        if bgr_crop is None or bgr_crop.size == 0:
            return 0.0
        h, w = bgr_crop.shape[:2]
        border = max(2, int(min(w, h) * 0.08))
        sat = cv2.cvtColor(bgr_crop, cv2.COLOR_BGR2HSV)[:, :, 1]
        parts = [sat[:border, :], sat[-border:, :], sat[:, :border], sat[:, -border:]]
        return max(float(p.mean()) for p in parts if p.size)

    all_faces = []
    overlay_raw = []
    sample_w = sample_h = 0

    for fp in frames:
        img = cv2.imread(fp)
        if img is None:
            continue
        sample_h, sample_w = img.shape[:2]
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        gray = cv2.equalizeHist(gray)

        frame_faces = list(detect_in(gray))

        cw = int(sample_w * 0.40); ch = int(sample_h * 0.40)
        for (ox, oy) in [(0, 0), (sample_w - cw, 0), (0, sample_h - ch), (sample_w - cw, sample_h - ch)]:
            crop = gray[oy:oy + ch, ox:ox + cw]
            if crop.size == 0:
                continue
            up = cv2.resize(crop, None, fx=1.6, fy=1.6, interpolation=cv2.INTER_LINEAR)
            for (x, y, w, h) in detect_in(up):
                frame_faces.append((int(ox + x / 1.6), int(oy + y / 1.6), int(w / 1.6), int(h / 1.6)))

        all_faces.extend(frame_faces)

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

    log(f"[detect] v3.9 frames={len(frames)} sample={sample_w}x{sample_h}"
        f" min_overlay={min_w_px}x{min_h_px} max_overlay={max_w_px}x{max_h_px}"
        f" faces_raw={len(all_faces)} contours={len(overlay_raw)}")

    candidates = []
    rejected = []

    first_bgr = cv2.imread(frames[0])
    first_gray = cv2.cvtColor(first_bgr, cv2.COLOR_BGR2GRAY) if first_bgr is not None else None

    def faces_inside(bbox, pad=0.18):
        x, y, w, h = bbox
        pad_x = w * pad; pad_y = h * pad
        return [
            (fx, fy, fw, fh) for (fx, fy, fw, fh) in all_faces
            if (x - pad_x) <= (fx + fw / 2) <= (x + w + pad_x)
            and (y - pad_y) <= (fy + fh / 2) <= (y + h + pad_y)
        ]

    def refine_panel_to_face(bbox):
        """If the panel contains a face cluster, crop down to a 4:3 webcam
        sub-region centered on the face. Otherwise return bbox unchanged
        and refined=False."""
        x, y, w, h = bbox
        inside = faces_inside(bbox, pad=0.05)
        if not inside:
            return bbox, False
        fh_med = statistics.median([f[3] for f in inside])
        if fh_med < MIN_FACE_PX:
            return bbox, False
        fcx = statistics.median([f[0] + f[2] / 2 for f in inside])
        fcy = statistics.median([f[1] + f[3] / 2 for f in inside])
        sub_h = min(h, max(fh_med * 3.0, min_h_px * 1.05))
        sub_w = min(w, sub_h * 4.0 / 3.0)
        sub_w = max(sub_w, min_w_px * 1.05)
        sub_x = fcx - sub_w / 2.0
        sub_y = fcy - sub_h * 0.40
        # Clamp inside the original panel.
        sub_x = max(x, min(x + w - sub_w, sub_x))
        sub_y = max(y, min(y + h - sub_h, sub_y))
        sub_w = max(8.0, min(sub_w, x + w - sub_x))
        sub_h = max(8.0, min(sub_h, y + h - sub_y))
        # Only consider it a refinement if the new box is meaningfully smaller.
        if sub_w * sub_h < 0.92 * w * h:
            return (sub_x, sub_y, sub_w, sub_h), True
        return bbox, False

    def consider_overlay(bbox, *, source, face_support, skin, border, stability,
                         minimap_frac=0.0, edge_dens=0.0):
        x, y, w, h = bbox
        area_ratio = (w * h) / float(sample_w * sample_h)
        width_ratio = w / sample_w
        height_ratio = h / sample_h
        aspect = w / h if h else 0.0

        def reject(reason, **extra):
            entry = {"bbox": [int(x), int(y), int(w), int(h)], "source": source,
                     "reason": reason, **{k: (round(v, 3) if isinstance(v, float) else v)
                                          for k, v in extra.items()}}
            rejected.append(entry)
            log_bbox("rejected_candidate", bbox, source=source, reason=reason, **extra)

        if w < min_w_px or h < min_h_px:
            reject("too_small_ui_avatar", width_ratio=width_ratio, height_ratio=height_ratio)
            return
        if w > max_w_px or h > max_h_px or area_ratio > MAX_OVERLAY_AREA_RATIO:
            reject("too_large_gameplay", area_ratio=area_ratio); return
        if not (0.55 <= aspect <= 2.30):
            reject("aspect_implausible", aspect=aspect); return

        # ── Hard HUD/minimap/text rejection (panel sources only) ───────
        if source == "panel":
            if minimap_frac >= MINIMAP_CIRCLE_AREA_FRACTION:
                reject("hud_minimap_text_panel", minimap_frac=minimap_frac); return
            if face_support == 0 and skin < MIN_PANEL_SKIN_RATIO:
                reject("hud_minimap_text_panel", skin=skin, edge_dens=edge_dens,
                       face_support=face_support); return
            if face_support == 0 and edge_dens >= MAX_PANEL_EDGE_DENSITY_NO_FACE:
                reject("hud_minimap_text_panel", edge_dens=edge_dens); return

        cx = x + w / 2.0
        cy = y + h / 2.0
        edge_dx = min(cx, sample_w - cx) / sample_w
        edge_dy = min(cy, sample_h - cy) / sample_h
        edge_score = max(0.0, 1.6 - (edge_dx + edge_dy) * 3.0)
        aspect_score = 1.0 - min(1.0, abs(aspect - (4 / 3)) / 1.2)
        size_score = min(1.6, area_ratio / 0.015)
        skin_score = min(1.2, skin / 0.06)
        border_score = min(1.0, border / 120.0)
        face_score = min(2.5, face_support * 1.2)
        stability_score = min(1.5, stability * 0.5)

        # Penalties
        top_hud_penalty = 0.0
        if cy < sample_h * 0.22 and width_ratio > 0.24 and face_support == 0:
            top_hud_penalty += 3.0
        if minimap_frac > 0.05 and face_support == 0:
            top_hud_penalty += 2.0 * minimap_frac / 0.18
        if source == "panel" and face_support == 0:
            # Cap any panel-without-face score so it can never beat a real
            # face_expand candidate.
            top_hud_penalty += 2.5
        text_penalty = 0.0
        if face_support == 0 and edge_dens > 0.14:
            text_penalty = (edge_dens - 0.14) * 8.0

        score = (edge_score + aspect_score + size_score
                 + skin_score + border_score + face_score + stability_score
                 - top_hud_penalty - text_penalty)
        score = round(score, 3)

        reason = (f"edge={edge_score:.2f},size={size_score:.2f},face={face_score:.2f},"
                  f"skin={skin_score:.2f},border={border_score:.2f},stab={stability_score:.2f},"
                  f"hud_pen={top_hud_penalty:.2f},text_pen={text_penalty:.2f},"
                  f"minimap={minimap_frac:.2f},edge_dens={edge_dens:.2f}")

        entry = {
            "bbox": [int(x), int(y), int(w), int(h)],
            "source": source, "score": score,
            "face_support": face_support, "skin": round(skin, 3),
            "border": round(border, 1), "stability": stability,
            "minimap_frac": round(minimap_frac, 3), "edge_dens": round(edge_dens, 3),
            "reason": reason,
        }
        candidates.append(entry)
        log_bbox("candidate", bbox, source=source, score=score, reason=reason)

    # ----- Source 1: edge-bounded overlay rectangles -----
    overlay_filtered = []
    for (x, y, bw, bh) in overlay_raw:
        if bw < min_w_px * 0.85 or bh < min_h_px * 0.85: continue
        if bw > max_w_px or bh > max_h_px: continue
        aspect = bw / bh if bh else 0.0
        if not (0.55 <= aspect <= 2.30): continue
        overlay_filtered.append((x, y, bw, bh))

    clusters = []
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
                cluster.append(det); placed = True; break
        if not placed:
            clusters.append([det])

    for cluster in clusters:
        if not cluster: continue
        mx = statistics.median([c[0] for c in cluster])
        my = statistics.median([c[1] for c in cluster])
        mw = statistics.median([c[2] for c in cluster])
        mh = statistics.median([c[3] for c in cluster])
        crop_bgr = first_bgr[int(my):int(my + mh), int(mx):int(mx + mw)] if first_bgr is not None else None
        crop_gray = first_gray[int(my):int(my + mh), int(mx):int(mx + mw)] if first_gray is not None else None
        skin = rough_skin_ratio(crop_bgr)
        border = border_color_signal(crop_bgr)
        minimap_frac = detect_minimap_circle(crop_gray)
        edge_dens = edge_density(crop_gray)
        face_hits = len(faces_inside((mx, my, mw, mh), pad=0.18))
        consider_overlay((mx, my, mw, mh), source="panel",
                         face_support=face_hits, skin=skin, border=border,
                         stability=len(cluster),
                         minimap_frac=minimap_frac, edge_dens=edge_dens)

    # ----- Source 2: face clusters expanded into a webcam region -----
    face_clusters = []
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
        if not cluster: continue
        fw_med = statistics.median([c[2] for c in cluster])
        fh_med = statistics.median([c[3] for c in cluster])
        if fw_med < MIN_FACE_PX or fh_med < MIN_FACE_PX:
            bbox = (statistics.median([c[0] for c in cluster]),
                    statistics.median([c[1] for c in cluster]), fw_med, fh_med)
            log_bbox("rejected_candidate", bbox, source="face",
                     reason="face_too_small_for_webcam")
            rejected.append({"source": "face", "reason": "face_too_small_for_webcam",
                             "bbox": [int(bbox[0]), int(bbox[1]), int(fw_med), int(fh_med)]})
            continue

        cx = statistics.median([c[0] + c[2] / 2 for c in cluster])
        cy = statistics.median([c[1] + c[3] / 2 for c in cluster])
        panel_h = fh_med * 3.0
        panel_w = panel_h * 4.0 / 3.0
        panel_w = max(panel_w, min_w_px * 1.05)
        panel_h = max(panel_h, min_h_px * 1.05)
        px = cx - panel_w / 2.0
        py = cy - panel_h * 0.40
        px = max(0.0, min(sample_w - panel_w, px))
        py = max(0.0, min(sample_h - panel_h, py))
        panel_w = max(8.0, min(panel_w, sample_w - px))
        panel_h = max(8.0, min(panel_h, sample_h - py))

        crop_bgr = first_bgr[int(py):int(py + panel_h), int(px):int(px + panel_w)] if first_bgr is not None else None
        crop_gray = first_gray[int(py):int(py + panel_h), int(px):int(px + panel_w)] if first_gray is not None else None
        skin = rough_skin_ratio(crop_bgr)
        border = border_color_signal(crop_bgr)
        minimap_frac = detect_minimap_circle(crop_gray)
        edge_dens = edge_density(crop_gray)
        consider_overlay((px, py, panel_w, panel_h), source="face_expand",
                         face_support=len(cluster), skin=skin, border=border,
                         stability=len(cluster),
                         minimap_frac=minimap_frac, edge_dens=edge_dens)

    # ── Select winner ────────────────────────────────────────────────────
    if not candidates:
        log("[detect] no_candidate_passed_filters", f"rejected={len(rejected)}")
        print(json.dumps({
            "detected": False, "reason": "no_candidate",
            "frames": len(frames), "source_width": sample_w, "source_height": sample_h,
            "rejected": rejected[:20],
        }))
        return 0

    candidates.sort(key=lambda c: c["score"], reverse=True)

    # Log full top-10 ranking for regression analysis.
    log(f"[ranking] top={min(10, len(candidates))} total={len(candidates)}")
    for i, c in enumerate(candidates[:10]):
        log(f"[rank{i+1:02d}] bbox={tuple(c['bbox'])} src={c['source']}"
            f" score={c['score']} face={c['face_support']} skin={c['skin']}"
            f" border={c['border']} minimap={c['minimap_frac']}"
            f" edge_dens={c['edge_dens']} stab={c['stability']}")

    # ── Human/webcam evidence gate ───────────────────────────────────────
    # A candidate may only WIN if it shows real human/webcam evidence:
    #   - face_support >= 1 (Haar face inside the region), OR
    #   - source == "face_expand" (was built from a face cluster), OR
    #   - skin_ratio strong AND border/edge consistent with a video panel
    #     (skin >= 0.09, edge_dens <= 0.18, border >= 60).
    # Otherwise the candidate is HUD / minimap / text / icon — never pick it.
    def has_human_evidence(c):
        if c["source"] == "face_expand": return True
        if c["face_support"] >= 1: return True
        if (c["skin"] >= 0.09 and c["edge_dens"] <= 0.18
                and c["border"] >= 60.0 and c["minimap_frac"] < 0.10):
            return True
        return False

    eligible = [c for c in candidates if has_human_evidence(c)]
    skipped = [c for c in candidates if c not in eligible]
    for c in skipped[:6]:
        log_bbox("rejected_candidate", tuple(c["bbox"]), source=c["source"],
                 reason="no_human_evidence", score=c["score"],
                 face=c["face_support"], skin=c["skin"], edge_dens=c["edge_dens"])
        rejected.append({**c, "reason": "no_human_evidence"})

    if not eligible:
        log("[detect] no_eligible_human_candidate → fallback gameplay_only")
        print(json.dumps({
            "detected": False, "reason": "no_human_evidence",
            "frames": len(frames), "source_width": sample_w, "source_height": sample_h,
            "candidates": candidates[:8], "rejected": rejected[:12],
        }))
        return 0

    winner = eligible[0]
    runners_up = eligible[1:5]

    # Low-confidence guard remains as a final safety net.
    if winner["score"] < 1.0:
        log_bbox("rejected_candidate", tuple(winner["bbox"]), source=winner["source"],
                 reason="low_confidence_no_clear_webcam", score=winner["score"])
        print(json.dumps({
            "detected": False, "reason": "low_confidence",
            "frames": len(frames), "source_width": sample_w, "source_height": sample_h,
            "candidates": candidates[:8], "rejected": rejected[:12],
        }))
        return 0


    wx, wy, ww, wh = winner["bbox"]
    refined_bbox, refined = refine_panel_to_face((wx, wy, ww, wh)) if winner["source"] == "panel" else ((wx, wy, ww, wh), False)
    rx, ry, rw, rh = refined_bbox

    log_bbox("selected_facecam", (rx, ry, rw, rh), source=winner["source"],
             score=winner["score"], refined=refined,
             reason="webcam_region_with_human_signal" if winner["face_support"] > 0 else winner["reason"])
    for ru in runners_up:
        log_bbox("runner_up", tuple(ru["bbox"]), source=ru["source"], score=ru["score"])

    confidence = round(min(1.0, max(0.15, winner["score"] / 6.0)), 2)
    cx = rx + rw / 2.0
    cy = ry + rh / 2.0
    horiz = "left" if cx < sample_w / 2 else "right"
    vert = "top" if cy < sample_h / 2 else "bottom"

    result = {
        "detected": True, "confidence": confidence,
        "frames": len(frames), "source_width": sample_w, "source_height": sample_h,
        "facecam": {"x": int(rx), "y": int(ry), "width": int(rw), "height": int(rh)},
        "corner": f"{vert}_{horiz}",
        "selected": winner, "refined": refined,
        "candidates": candidates[:8], "rejected": rejected[:12],
        "selection_reason": "webcam_region_with_human_signal" if winner["face_support"] > 0 else winner["reason"],
    }
    print(json.dumps(result))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:  # noqa: BLE001
        log("[detect] exception", str(exc)[:200])
        print(json.dumps({"detected": False, "reason": "exception", "message": str(exc)[:200]}))
        sys.exit(0)
