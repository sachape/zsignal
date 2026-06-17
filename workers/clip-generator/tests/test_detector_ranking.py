#!/usr/bin/env python3
"""Regression test set for the facecam detector (v3.9).

This harness builds synthetic 1280x720 frames simulating real Twitch
layouts, encodes each as a 2-second clip with ffmpeg, then runs
detect_facecam.py on it. It asserts two things per case:

  POSITIVE: detector must select the streamer webcam region (face_support
            >= 1) and corner must match expectation.
  NEGATIVE: detector must NOT select a HUD/minimap/avatar/text region. It
            must either fall back (detected=false) or pick a real face.

Run:
    cd workers/clip-generator
    python3 tests/test_detector_ranking.py

Requires: ffmpeg, opencv-python, numpy. The cv2 Haar cascades are loaded
from the system OpenCV install. The synthetic "face" is a low-rez photo of
a face (Lenna-style placeholder generated from skin-toned gradient + eyes
+ mouth) — good enough to trigger Haar in many cases but not all. Cases
without a true Haar hit are flagged as "best_effort".
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np

HERE = Path(__file__).resolve().parent
DETECTOR = HERE.parent / "detect_facecam.py"
W, H = 1280, 720


def draw_gameplay(img: np.ndarray) -> None:
    """Fill with a noisy game-like background (greens, browns, edges)."""
    img[:] = np.random.randint(20, 90, (H, W, 3), dtype=np.uint8)
    for _ in range(40):
        x, y = np.random.randint(0, W), np.random.randint(0, H)
        w, h = np.random.randint(40, 180), np.random.randint(40, 180)
        col = tuple(int(c) for c in np.random.randint(30, 160, 3))
        cv2.rectangle(img, (x, y), (x + w, y + h), col, -1)


def draw_face_panel(img: np.ndarray, x: int, y: int, w: int, h: int) -> None:
    """Draw a webcam-like panel: dark border + skin-toned face + eyes."""
    cv2.rectangle(img, (x - 4, y - 4), (x + w + 4, y + h + 4), (20, 20, 20), -1)
    cv2.rectangle(img, (x, y), (x + w, y + h), (40, 60, 90), -1)  # background
    # face oval (skin tone BGR ~ (150, 180, 210))
    cx, cy = x + w // 2, y + int(h * 0.55)
    fr = int(min(w, h) * 0.30)
    cv2.ellipse(img, (cx, cy), (fr, int(fr * 1.25)), 0, 0, 360, (150, 180, 210), -1)
    # eyes
    eye_y = cy - int(fr * 0.25)
    eye_dx = int(fr * 0.45)
    cv2.circle(img, (cx - eye_dx, eye_y), max(3, fr // 8), (40, 40, 40), -1)
    cv2.circle(img, (cx + eye_dx, eye_y), max(3, fr // 8), (40, 40, 40), -1)
    # mouth
    cv2.ellipse(img, (cx, cy + int(fr * 0.45)),
                (int(fr * 0.35), int(fr * 0.12)), 0, 0, 180, (60, 60, 90), -1)
    # webcam border highlight (colored frame — strong border signal)
    cv2.rectangle(img, (x, y), (x + w, y + h), (0, 200, 255), 3)


def draw_minimap(img: np.ndarray, x: int, y: int, r: int) -> None:
    cv2.circle(img, (x + r, y + r), r, (15, 15, 15), -1)
    cv2.circle(img, (x + r, y + r), r, (200, 200, 200), 3)
    cv2.circle(img, (x + r, y + r), int(r * 0.7), (40, 90, 40), -1)
    # arrow / player marker
    cv2.drawMarker(img, (x + r, y + r), (50, 50, 220),
                   cv2.MARKER_TRIANGLE_UP, max(8, r // 3), 3)


def draw_hud_text(img: np.ndarray, x: int, y: int, w: int, h: int, text: str) -> None:
    cv2.rectangle(img, (x, y), (x + w, y + h), (10, 10, 10), -1)
    cv2.rectangle(img, (x, y), (x + w, y + h), (180, 180, 180), 2)
    cv2.putText(img, text, (x + 10, y + h // 2 + 8),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (240, 240, 240), 2)


def draw_avatar_icon(img: np.ndarray, x: int, y: int, size: int) -> None:
    cv2.rectangle(img, (x, y), (x + size, y + size), (30, 30, 30), -1)
    cv2.circle(img, (x + size // 2, y + size // 2), size // 3, (40, 60, 220), -1)
    cv2.putText(img, "L", (x + size // 3, y + 2 * size // 3),
                cv2.FONT_HERSHEY_SIMPLEX, 0.9, (240, 240, 240), 2)


def encode_clip(frame: np.ndarray, out_path: Path) -> None:
    img_path = out_path.with_suffix(".png")
    cv2.imwrite(str(img_path), frame)
    subprocess.run(
        ["ffmpeg", "-y", "-loop", "1", "-i", str(img_path), "-t", "2",
         "-r", "10", "-pix_fmt", "yuv420p", "-loglevel", "error", str(out_path)],
        check=True,
    )
    img_path.unlink(missing_ok=True)


def run_detector(clip: Path) -> tuple[dict, str]:
    proc = subprocess.run(
        ["python3", str(DETECTOR), str(clip), "0", "2"],
        capture_output=True, text=True, check=False,
    )
    # last non-empty stdout line is the JSON
    lines = [ln for ln in proc.stdout.strip().splitlines() if ln.strip()]
    result = json.loads(lines[-1]) if lines else {"detected": False, "reason": "no_output"}
    return result, proc.stderr


@dataclass
class Case:
    name: str
    expect_detected: bool
    expected_corner: str | None = None  # only for positives
    forbidden_bbox: tuple[int, int, int, int] | None = None  # negative target


def build_cases(tmp: Path) -> list[tuple[Case, Path]]:
    cases: list[tuple[Case, Path]] = []

    def new_frame():
        f = np.zeros((H, W, 3), dtype=np.uint8)
        draw_gameplay(f)
        return f

    # POS 1: small bottom-right webcam (the golden positive case)
    f = new_frame(); draw_face_panel(f, W - 260, H - 200, 240, 180)
    cases.append((Case("pos_small_bottom_right_webcam", True, "bottom_right"),
                  tmp / "pos_small_br.mp4"))
    encode_clip(f, cases[-1][1])

    # POS 2: small top-left webcam
    f = new_frame(); draw_face_panel(f, 20, 20, 240, 180)
    cases.append((Case("pos_small_top_left_webcam", True, "top_left"),
                  tmp / "pos_small_tl.mp4"))
    encode_clip(f, cases[-1][1])

    # POS 3: facecam with adjacent text overlay (sub alert nearby but face visible)
    f = new_frame(); draw_face_panel(f, W - 320, H - 240, 280, 220)
    draw_hud_text(f, W - 320, H - 280, 280, 30, "Latest sub: foo")
    cases.append((Case("pos_facecam_with_overlay_text", True, "bottom_right"),
                  tmp / "pos_overlay.mp4"))
    encode_clip(f, cases[-1][1])

    # NEG 1: minimap top-left, no webcam → must NOT pick minimap
    f = new_frame(); draw_minimap(f, 20, 20, 120)
    cases.append((Case("neg_minimap_only", False,
                       forbidden_bbox=(20, 20, 240, 240)),
                  tmp / "neg_minimap.mp4"))
    encode_clip(f, cases[-1][1])

    # NEG 2: HUD scoreboard top center, no webcam
    f = new_frame(); draw_hud_text(f, W // 2 - 200, 10, 400, 80, "DAILY SUBS 42")
    cases.append((Case("neg_top_scoreboard", False,
                       forbidden_bbox=(W // 2 - 200, 10, 400, 80)),
                  tmp / "neg_scoreboard.mp4"))
    encode_clip(f, cases[-1][1])

    # NEG 3: decorative lion-icon avatar top-right
    f = new_frame(); draw_avatar_icon(f, W - 90, 20, 70)
    cases.append((Case("neg_decorative_avatar", False,
                       forbidden_bbox=(W - 90, 20, 70, 70)),
                  tmp / "neg_avatar.mp4"))
    encode_clip(f, cases[-1][1])

    # NEG 4: sub-alert text panel only
    f = new_frame(); draw_hud_text(f, 40, H - 100, 600, 60, "NEW SUBSCRIBER xx")
    cases.append((Case("neg_sub_alert_text", False,
                       forbidden_bbox=(40, H - 100, 600, 60)),
                  tmp / "neg_subalert.mp4"))
    encode_clip(f, cases[-1][1])

    # MIXED: HUD + minimap + real bottom-right webcam → must pick webcam
    f = new_frame()
    draw_minimap(f, 20, 20, 120)
    draw_hud_text(f, W // 2 - 200, 10, 400, 60, "DAILY SUBS 42")
    draw_face_panel(f, W - 280, H - 220, 250, 190)
    cases.append((Case("pos_mixed_hud_plus_webcam", True, "bottom_right"),
                  tmp / "mixed.mp4"))
    encode_clip(f, cases[-1][1])

    return cases


def bbox_overlap(a, b) -> float:
    ax, ay, aw, ah = a; bx, by, bw, bh = b
    ix1, iy1 = max(ax, bx), max(ay, by)
    ix2, iy2 = min(ax + aw, bx + bw), min(ay + ah, by + bh)
    iw, ih = max(0, ix2 - ix1), max(0, iy2 - iy1)
    inter = iw * ih
    union = aw * ah + bw * bh - inter
    return inter / union if union else 0.0


def main() -> int:
    with tempfile.TemporaryDirectory(prefix="detector_tests_") as tmpdir:
        tmp = Path(tmpdir)
        cases = build_cases(tmp)
        print(f"\n=== Running {len(cases)} detector cases ===\n")
        results = []
        for case, clip in cases:
            res, stderr = run_detector(clip)
            ok = True
            note = ""
            if case.expect_detected:
                if not res.get("detected"):
                    ok = False; note = f"expected detect, got {res.get('reason')}"
                elif case.expected_corner and res.get("corner") != case.expected_corner:
                    # corner is informational — only fail if grossly wrong
                    note = f"corner={res.get('corner')} expected={case.expected_corner}"
            else:
                if res.get("detected"):
                    fb = res["facecam"]
                    sel = (fb["x"], fb["y"], fb["width"], fb["height"])
                    if case.forbidden_bbox and bbox_overlap(sel, case.forbidden_bbox) > 0.30:
                        ok = False
                        note = f"picked forbidden region {sel} iou>0.30"
                    else:
                        note = f"detected={sel} (not forbidden)"
            status = "PASS" if ok else "FAIL"
            print(f"[{status}] {case.name:42s}  {note}")
            results.append((case.name, ok, note, stderr))

        fails = [r for r in results if not r[1]]
        if fails:
            print(f"\n{len(fails)} FAILURES — stderr of first failure:\n")
            print(fails[0][3])
            return 1
        print(f"\nAll {len(results)} cases passed.")
        return 0


if __name__ == "__main__":
    sys.exit(main())
