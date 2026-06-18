import { describe, expect, it } from "vitest";
import {
  buildSafeFacecamCrop,
  displayRectToSourceNormalized,
  normalizedRatioForSource,
  sourceToDisplayRect,
} from "./facecamGeometry";

describe("manual facecam geometry", () => {
  it("maps a top-aligned displayed crop to normalized y=0", () => {
    const display = sourceToDisplayRect(960, 540, 1920, 1080, "contain");
    const normalized = displayRectToSourceNormalized({
      left: display.offsetX,
      top: display.offsetY,
      width: display.renderedWidth * 0.33,
      height: display.renderedHeight * 0.31,
    }, display);

    expect(normalized.x).toBeCloseTo(0, 6);
    expect(normalized.y).toBeCloseTo(0, 6);
  });

  it("keeps a top-edge webcam safe crop pinned to y=0", () => {
    const ratio = normalizedRatioForSource(1920, 1080);
    const safe = buildSafeFacecamCrop({ x: 0, y: 0, width: 0.33, height: 0.3129 }, ratio);

    expect(safe.x).toBeCloseTo(0, 6);
    expect(safe.y).toBeCloseTo(0, 6);
    expect(safe.width).toBeCloseTo(0.363, 3);
    expect(safe.height).toBeCloseTo(0.344, 3);
  });
});