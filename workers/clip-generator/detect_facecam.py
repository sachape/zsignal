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
    overlay_candidates: list[tuple[int, int, int, int, float, float, bool, float]] = []
    sample_w = sample_h = 0

    def rough_skin_ratio(bgr_crop) -> float:
        if bgr_crop.size == 0:
            return 0.0
        hsv = cv2.cvtColor(bgr_crop, cv2.COLOR_BGR2HSV)
        hue = hsv[:, :, 0]
        sat = hsv[:, :, 1]
        val = hsv[:, :, 2]
        mask = ((hue <= 25) | (hue >= 170)) & (sat >= 30) & (sat <= 190) & (val >= 45)
        return float(mask.mean())

    def border_color_signal(bgr_crop) -> float:
        if bgr_crop.size == 0:
            return 0.0
        h, w = bgr_crop.shape[:2]
        border = max(2, int(min(w, h) * 0.08))
        mask = cv2.cvtColor(bgr_crop, cv2.COLOR_BGR2HSV)[:, :, 1]
        parts = [mask[:border, :], mask[-border:, :], mask[:, :border], mask[:, -border:]]
        return max(float(p.mean()) for p in parts if p.size)

    def collect_overlay_candidates(img, gray_img, frame_faces):
        # Detect the whole webcam widget, not just the face. This is more robust
        # for streamer cams where the face is tiny, partially turned, hidden by
        # headset/mic, or visually blurred, while the webcam frame remains stable.
        h, w = gray_img.shape[:2]
        edges = cv2.Canny(gray_img, 50, 150)
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        out: list[tuple[int, int, int, int, float, float, bool, float]] = []
        for c in contours:
            x, y, bw, bh = cv2.boundingRect(c)
            area_ratio = (bw * bh) / float(w * h) if w and h else 1.0
            aspect = bw / float(bh) if bh else 0.0
            near_edge = x < w * 0.08 or y < h * 0.08 or (x + bw) > w * 0.92 or (y + bh) > h * 0.92
            # A real streamer webcam overlay is small/moderate and must have a
            # human signal. Pure HUD/menu rectangles can be stable, but they do
            # not contain skin tones or a Haar face inside the candidate.
            width_ratio = bw / float(w) if w else 1.0
            height_ratio = bh / float(h) if h else 1.0
            if not (0.0015 <= area_ratio <= 0.09 and 0.55 <= aspect <= 2.30 and near_edge):
                continue
            if width_ratio > 0.34 or height_ratio > 0.36:
                continue
            skin = rough_skin_ratio(img[y:y + bh, x:x + bw])
            border_signal = border_color_signal(img[y:y + bh, x:x + bw])
            pad_x = bw * 0.18
            pad_y = bh * 0.18
            face_support = any(
                (x - pad_x) <= (fx + fw / 2) <= (x + bw + pad_x)
                and (y - pad_y) <= (fy + fh / 2) <= (y + bh + pad_y)
                for fx, fy, fw, fh in frame_faces
            )
            if not face_support and skin < 0.035 and border_signal < 95:
                continue
            # Top HUD/header strips are the main false positive. Only keep a
            # top-wide candidate when it has direct human evidence.
            if y < h * 0.22 and width_ratio > 0.24 and not face_support:
                continue
            lower_third_bonus = 1.0 if (y + bh / 2) > h * 0.30 else 0.0
            side_bonus = 0.6 if (x < w * 0.16 or (x + bw) > w * 0.84) else 0.0
            skin_bonus = 0.8 if 0.06 <= skin <= 0.45 else 0.0
            face_bonus = 1.4 if face_support else 0.0
            border_bonus = 0.7 if border_signal >= 95 else 0.0
            score = face_bonus + lower_third_bonus + side_bonus + skin_bonus + border_bonus + min(1.0, area_ratio * 20)
            out.append((int(x), int(y), int(bw), int(bh), float(score), float(skin), bool(face_support), float(border_signal)))
        return out

    for fp in frames:
        img = cv2.imread(fp)
        if img is None:
            continue
        sample_h, sample_w = img.shape[:2]
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        gray = cv2.equalizeHist(gray)

        frame_faces = []

        # 1) Full-frame pass.
        for d in detect_in(gray):
            frame_faces.append(d)
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
                translated = (
                    int(ox + x / 1.6),
                    int(oy + y / 1.6),
                    int(w / 1.6),
                    int(h / 1.6),
                )
                frame_faces.append(translated)
                detections.append(translated)

        overlay_candidates.extend(collect_overlay_candidates(img, gray, frame_faces))

    # Cluster webcam-overlay candidates first. They describe the visible camera
    # frame itself, so they are less likely than Haar faces to lock onto CS HUD
    # icons or in-game character faces.
    cluster_tol_x = sample_w * 0.10
    cluster_tol_y = sample_h * 0.10
    overlay_clusters: list[list[tuple[int, int, int, int, float, float, bool]]] = []
    for det in overlay_candidates:
        dx, dy, dw, dh, _score, _skin, _face_support = det
        dcx = dx + dw / 2
        dcy = dy + dh / 2
        matched = False
        for cluster in overlay_clusters:
            cxs = [c[0] + c[2] / 2 for c in cluster]
            cys = [c[1] + c[3] / 2 for c in cluster]
            if abs(dcx - statistics.median(cxs)) < cluster_tol_x and abs(dcy - statistics.median(cys)) < cluster_tol_y:
                cluster.append(det)
                matched = True
                break
        if not matched:
            overlay_clusters.append([det])

    def overlay_cluster_score(cluster: list[tuple[int, int, int, int, float, float, bool]]) -> float:
        # A stable webcam can be absent/partially occluded in a few frames, while
        # HUD widgets (scoreboard/minimap) are present every frame. Weight visual
        # webcam-likeness higher than raw count so persistent HUD does not win.
        skin_score = min(1.0, statistics.median([c[5] for c in cluster]) / 0.08)
        face_hits = sum(1 for c in cluster if c[6])
        face_score = min(2.0, face_hits * 0.8)
        return len(cluster) * 0.8 + statistics.median([c[4] for c in cluster]) * 2.4 + skin_score + face_score

    if overlay_clusters:
        best_overlay = max(overlay_clusters, key=overlay_cluster_score)
        best_has_human_signal = (
            sum(1 for c in best_overlay if c[6]) >= 1
            or statistics.median([c[5] for c in best_overlay]) >= 0.045
        )
        if len(best_overlay) >= 2 and best_has_human_signal:
            ox = statistics.median([c[0] for c in best_overlay])
            oy = statistics.median([c[1] for c in best_overlay])
            overlay_w = statistics.median([c[2] for c in best_overlay])
            overlay_h = statistics.median([c[3] for c in best_overlay])
            confidence = round(min(1.0, len(best_overlay) / max(1, len(frames))), 2)
            stable = len(best_overlay)
        else:
            ox = oy = overlay_w = overlay_h = None
            confidence = 0.0
            stable = 0
    else:
        ox = oy = overlay_w = overlay_h = None
        confidence = 0.0
        stable = 0

    if ox is None:
        if not detections or sample_w == 0:
            print(json.dumps({
                "detected": False,
                "reason": "no_faces",
                "frames": len(frames),
                "overlay_candidates": len(overlay_candidates),
            }))
            return 0

        # Cluster detections instead of taking one global median. Gameplay can
        # contain several face-like shapes; a global median can land between them
        # and make us reject the real webcam. Pick the most stable edge cluster.
        clusters: list[list[tuple[int, int, int, int]]] = []
        for det in detections:
            dx, dy, dw, dh = det
            dcx = dx + dw / 2
            dcy = dy + dh / 2
            matched = False
            for cluster in clusters:
                cxs = [c[0] + c[2] / 2 for c in cluster]
                cys = [c[1] + c[3] / 2 for c in cluster]
                if abs(dcx - statistics.median(cxs)) < cluster_tol_x and abs(dcy - statistics.median(cys)) < cluster_tol_y:
                    cluster.append(det)
                    matched = True
                    break
            if not matched:
                clusters.append([det])

        def cluster_score(cluster: list[tuple[int, int, int, int]]) -> float:
            cxs = [c[0] + c[2] / 2 for c in cluster]
            cys = [c[1] + c[3] / 2 for c in cluster]
            ccx = statistics.median(cxs)
            ccy = statistics.median(cys)
            x_ratio = ccx / sample_w if sample_w else 0.5
            y_ratio = ccy / sample_h if sample_h else 0.5
            near_x_edge = x_ratio < 0.42 or x_ratio > 0.58
            near_y_edge = y_ratio < 0.42 or y_ratio > 0.58
            edge_bonus = 1.5 if (near_x_edge or near_y_edge) else -2.0
            corner_bonus = 1.0 if (near_x_edge and near_y_edge) else 0.0
            return len(cluster) + edge_bonus + corner_bonus

        best_cluster = max(clusters, key=cluster_score)

        xs = [d[0] + d[2] / 2 for d in best_cluster]
        ys = [d[1] + d[3] / 2 for d in best_cluster]
        ws = [d[2] for d in best_cluster]
        hs = [d[3] for d in best_cluster]

        cx = statistics.median(xs)
        cy = statistics.median(ys)
        mw = statistics.median(ws)
        mh = statistics.median(hs)

        stable = len(best_cluster)
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
                "overlay_candidates": len(overlay_candidates),
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

    # SANITY GUARD #1 — A streamer facecam is usually small. If the derived
    # overlay covers more than 30% of the frame area, OR more than 45% of both
    # dimensions, it's almost certainly a false positive (e.g. a character's
    # face in the gameplay, an in-game cutscene, a thumbnail, etc.). Reject
    # it — the worker will silently fall back to gameplay_only, which is
    # better than rendering a top band that's just zoomed-out gameplay.
    frame_area = sample_w * sample_h
    overlay_area = overlay_w * overlay_h
    area_ratio = overlay_area / frame_area if frame_area else 1.0
    width_ratio = overlay_w / sample_w if sample_w else 1.0
    height_ratio = overlay_h / sample_h if sample_h else 1.0
    if area_ratio > 0.20 or width_ratio > 0.36 or height_ratio > 0.38:
        print(json.dumps({
            "detected": False,
            "reason": "overlay_too_large",
            "area_ratio": round(area_ratio, 3),
            "width_ratio": round(width_ratio, 3),
            "height_ratio": round(height_ratio, 3),
            "confidence": confidence,
            "frames": len(frames),
        }))
        return 0

    # SANITY GUARD #2 — Streamer facecams usually live in a corner, but some
    # creators place them centered along the top/bottom edge. Require the
    # overlay center to be near at least one edge; reject only dead-center
    # gameplay/cutscene faces.
    center_x = ox + overlay_w / 2.0
    center_y = oy + overlay_h / 2.0
    in_left = center_x < sample_w * 0.45
    in_right = center_x > sample_w * 0.55
    in_top = center_y < sample_h * 0.45
    in_bottom = center_y > sample_h * 0.55
    if not (in_left or in_right or in_top or in_bottom):
        print(json.dumps({
            "detected": False,
            "reason": "not_in_corner",
            "center_x_ratio": round(center_x / sample_w, 3) if sample_w else None,
            "center_y_ratio": round(center_y / sample_h, 3) if sample_h else None,
            "confidence": confidence,
            "frames": len(frames),
        }))
        return 0

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
        "area_ratio": round(area_ratio, 3),
    }
    print(json.dumps(result))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:  # noqa: BLE001 — never crash; let worker fallback to gameplay_only.
        print(json.dumps({"detected": False, "reason": "exception", "message": str(exc)[:200]}))
        sys.exit(0)
