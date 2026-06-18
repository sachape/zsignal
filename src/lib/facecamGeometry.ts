// Shared geometry for the manual facecam placement feature.
//
// The vertical clip output is 1080x1920. The top camera band height depends
// on the worker's gameplayFraming setting:
//   - "fill_relaxed" (default) → camRatio 0.30 → band height = 576 px
//   - "fill_tight"             → camRatio 0.25 → band height = 480 px
//
// The MANUAL placement UI locks the user's selection to the default band
// ratio (1080 / 576 = 1.875) so the worker can render in pure "cover" mode
// with zero letterboxing, zero blur, zero black bars, zero stretching —
// regardless of how precisely the user drew the box.
//
// IMPORTANT: keep this constant in sync with the worker's camRatio default
// in workers/clip-generator/index.mjs (buildVerticalFilterComplex).
export const FACECAM_OUTPUT_WIDTH = 1080;
export const FACECAM_BAND_HEIGHT = 576;
export const FACECAM_TARGET_RATIO = FACECAM_OUTPUT_WIDTH / FACECAM_BAND_HEIGHT; // ≈ 1.875
export const DEFAULT_SOURCE_ASPECT_RATIO = 16 / 9;

export interface NormalizedBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const MIN_BOX_SIZE = 0.04;

export function normalizedRatioForSource(
  sourceW: number,
  sourceH: number,
  outputRatio: number = FACECAM_TARGET_RATIO,
): number {
  const sourceRatio = sourceW > 0 && sourceH > 0
    ? sourceW / sourceH
    : DEFAULT_SOURCE_ASPECT_RATIO;
  return outputRatio / sourceRatio;
}

/** Clamp a normalized box into the [0,1] canvas without changing its size. */
export function clampBox(b: NormalizedBox): NormalizedBox {
  let { x, y, width, height } = b;
  width = Math.max(MIN_BOX_SIZE, Math.min(1, width));
  height = Math.max(MIN_BOX_SIZE, Math.min(1, height));
  x = Math.max(0, Math.min(1 - width, x));
  y = Math.max(0, Math.min(1 - height, y));
  return { x, y, width, height };
}

/**
 * Force a normalized box to the target aspect ratio while keeping the given
 * anchor point fixed (in normalized 0..1 coordinates). The "anchor" lets us
 * keep the opposite corner/edge pinned when the user drags a resize handle.
 */
export function lockBoxRatio(
  next: NormalizedBox,
  origin: NormalizedBox,
  anchor: { ax: number; ay: number },
  ratio: number = FACECAM_TARGET_RATIO,
): NormalizedBox {
  let w = Math.max(MIN_BOX_SIZE, next.width);
  let h = Math.max(MIN_BOX_SIZE, next.height);

  // Pick the dimension the user "pulled" the most (relative to origin)
  // and derive the other one from the locked ratio.
  const dW = Math.abs(w - origin.width) / Math.max(1e-6, origin.width);
  const dH = Math.abs(h - origin.height) / Math.max(1e-6, origin.height);
  if (dW >= dH) h = w / ratio;
  else w = h * ratio;

  // Cap to canvas while keeping the ratio.
  if (w > 1) { w = 1; h = w / ratio; }
  if (h > 1) { h = 1; w = h * ratio; }

  const anchorX = origin.x + origin.width * anchor.ax;
  const anchorY = origin.y + origin.height * anchor.ay;
  let x = anchorX - w * anchor.ax;
  let y = anchorY - h * anchor.ay;

  // Keep the box inside the canvas — shift, do not shrink, so the ratio
  // is preserved (the user-spec requires "décaler la box plutôt que la
  // réduire brutalement").
  if (x < 0) x = 0;
  if (y < 0) y = 0;
  if (x + w > 1) x = 1 - w;
  if (y + h > 1) y = 1 - h;

  return { x, y, width: w, height: h };
}

/**
 * Apply the "safe crop" transformation to a user selection:
 *   1. expand by `pad` around the center (default 10%)
 *   2. snap to the locked ratio
 *   3. clamp inside [0,1] — shifting (not shrinking) when possible
 *
 * This guarantees the worker can render the facecam in pure cover mode
 * without any blank/letterbox/blur, even if the user's selection was
 * slightly off.
 */
export function buildSafeFacecamCrop(
  raw: NormalizedBox,
  ratio: number = normalizedRatioForSource(1920, 1080),
  pad: number = 0.10,
): NormalizedBox {
  const touchesTop = raw.y <= 0.01;
  const touchesBottom = raw.y + raw.height >= 0.99;
  const cx = raw.x + raw.width / 2;
  const cy = raw.y + raw.height / 2;

  let w = raw.width * (1 + pad);
  let h = raw.height * (1 + pad);

  if (w / h < ratio) w = h * ratio;
  else h = w / ratio;

  if (w > 1) { w = 1; h = w / ratio; }
  if (h > 1) { h = 1; w = h * ratio; }

  let x = cx - w / 2;
  let y = touchesTop && !touchesBottom
    ? 0
    : touchesBottom && !touchesTop
      ? raw.y + raw.height - h
      : cy - h / 2;
  if (x < 0) x = 0;
  if (y < 0) y = 0;
  if (x + w > 1) x = 1 - w;
  if (y + h > 1) y = 1 - h;

  return { x, y, width: w, height: h };
}

/** Anchor map for each resize handle (what stays pinned during the resize). */
export const RESIZE_ANCHORS = {
  "resize-nw": { ax: 1,   ay: 1 },
  "resize-ne": { ax: 0,   ay: 1 },
  "resize-sw": { ax: 1,   ay: 0 },
  "resize-se": { ax: 0,   ay: 0 },
  "resize-n":  { ax: 0.5, ay: 1 },
  "resize-s":  { ax: 0.5, ay: 0 },
  "resize-w":  { ax: 1,   ay: 0.5 },
  "resize-e":  { ax: 0,   ay: 0.5 },
} as const;

/**
 * Rect of the source image as displayed in a container using object-fit.
 * Manual-placement coords MUST be normalized against THIS rect, not the raw
 * container — otherwise letterbox/cover offsets corrupt x/y.
 */
export interface DisplayRect {
  offsetX: number;
  offsetY: number;
  renderedWidth: number;
  renderedHeight: number;
}

export function sourceToDisplayRect(
  containerW: number,
  containerH: number,
  sourceW: number,
  sourceH: number,
  fit: "contain" | "cover" = "contain",
): DisplayRect {
  if (!(containerW > 0) || !(containerH > 0) || !(sourceW > 0) || !(sourceH > 0)) {
    return { offsetX: 0, offsetY: 0, renderedWidth: containerW, renderedHeight: containerH };
  }
  const scale = fit === "contain"
    ? Math.min(containerW / sourceW, containerH / sourceH)
    : Math.max(containerW / sourceW, containerH / sourceH);
  const renderedWidth = sourceW * scale;
  const renderedHeight = sourceH * scale;
  return {
    offsetX: (containerW - renderedWidth) / 2,
    offsetY: (containerH - renderedHeight) / 2,
    renderedWidth,
    renderedHeight,
  };
}

/** Container-pixel rect → source-normalized 0..1, accounting for offset. */
export function displayRectToSourceNormalized(
  rect: { left: number; top: number; width: number; height: number },
  display: DisplayRect,
): NormalizedBox {
  return clampBox({
    x: (rect.left - display.offsetX) / display.renderedWidth,
    y: (rect.top - display.offsetY) / display.renderedHeight,
    width: rect.width / display.renderedWidth,
    height: rect.height / display.renderedHeight,
  });
}
