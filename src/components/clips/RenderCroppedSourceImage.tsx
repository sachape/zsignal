// Reliable normalized-crop renderer.
//
// Renders `imageUrl` inside a fixed-size wrapper showing ONLY the region
// described by `cropNormalized` (x/y/width/height in 0..1 of the source
// frame), scaled in COVER mode to fully fill the wrapper. Pure pixel math
// — no object-fit, no background-position. This is the single source of
// truth used by the manual placement preview, and it MUST agree pixel-for-
// pixel with the worker's cover-mode crop so what the user sees is what
// gets rendered.
import { useEffect, useRef, useState } from "react";
import type { NormalizedBox } from "@/lib/facecamGeometry";

export interface RenderCroppedSourceImageProps {
  imageUrl: string;
  cropNormalized: NormalizedBox;
  sourceWidth: number;
  sourceHeight: number;
  /** Optional class on the wrapper (sizing is done externally). */
  className?: string;
  /** Optional inline style on the wrapper. */
  style?: React.CSSProperties;
  /** When true (default in dev), logs computed geometry once per change. */
  debug?: boolean;
  /** Label printed in debug logs to disambiguate multiple instances. */
  debugLabel?: string;
}

export function RenderCroppedSourceImage({
  imageUrl,
  cropNormalized,
  sourceWidth,
  sourceHeight,
  className,
  style,
  debug,
  debugLabel,
}: RenderCroppedSourceImageProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const targetWidth = size.w;
  const targetHeight = size.h;
  const sw = sourceWidth > 0 ? sourceWidth : 1920;
  const sh = sourceHeight > 0 ? sourceHeight : 1080;

  const cropPx = {
    x: cropNormalized.x * sw,
    y: cropNormalized.y * sh,
    w: Math.max(1, cropNormalized.width * sw),
    h: Math.max(1, cropNormalized.height * sh),
  };

  // Cover scale: ensure both axes are fully covered.
  const scale = targetWidth > 0 && targetHeight > 0
    ? Math.max(targetWidth / cropPx.w, targetHeight / cropPx.h)
    : 0;

  const imgW = sw * scale;
  const imgH = sh * scale;
  const drawnCropW = cropPx.w * scale;
  const drawnCropH = cropPx.h * scale;
  const left = -cropPx.x * scale + (targetWidth - drawnCropW) / 2;
  const top = -cropPx.y * scale + (targetHeight - drawnCropH) / 2;

  if (debug && targetWidth > 0) {
    // eslint-disable-next-line no-console
    console.debug("[RenderCroppedSourceImage]", debugLabel ?? "", {
      cropNormalized,
      sourceWidth: sw,
      sourceHeight: sh,
      targetWidth,
      targetHeight,
      cropPx,
      scale,
      imgW,
      imgH,
      left,
      top,
    });
  }

  return (
    <div
      ref={wrapperRef}
      className={className}
      style={{ position: "relative", overflow: "hidden", ...style }}
    >
      {scale > 0 && (
        <img
          src={imageUrl}
          alt=""
          draggable={false}
          style={{
            position: "absolute",
            width: `${imgW}px`,
            height: `${imgH}px`,
            left: `${left}px`,
            top: `${top}px`,
            maxWidth: "none",
            userSelect: "none",
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}

export default RenderCroppedSourceImage;
