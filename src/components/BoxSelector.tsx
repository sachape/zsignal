// Format Réseaux — sélecteur visuel de zone caméra dans une frame de référence.
// Pas de dépendance externe : pointer events natifs.

import { useCallback, useEffect, useRef, useState } from "react";

export interface BoxRect { x: number; y: number; w: number; h: number; }

interface Props {
  /** URL de la frame source (image PNG/JPG ou data URL). */
  imageUrl: string;
  /** Largeur réelle de la source en pixels (référence pour les coords sauvegardées). */
  sourceWidth: number;
  /** Hauteur réelle de la source en pixels. */
  sourceHeight: number;
  /** Rectangle initial en coords source. */
  value: BoxRect | null;
  onChange: (rect: BoxRect) => void;
}

type DragMode = null | "move" | "nw" | "ne" | "sw" | "se";

export function BoxSelector({ imageUrl, sourceWidth, sourceHeight, value, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const dragRef = useRef<{ startX: number; startY: number; initial: BoxRect } | null>(null);

  // Track displayed image size (object-contain).
  useEffect(() => {
    function update() {
      if (!containerRef.current) return;
      const r = containerRef.current.getBoundingClientRect();
      // Maintain aspect ratio of source image inside container.
      const ratio = sourceWidth / sourceHeight;
      let w = r.width;
      let h = w / ratio;
      if (h > r.height) { h = r.height; w = h * ratio; }
      setContainerSize({ w, h });
    }
    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [sourceWidth, sourceHeight]);

  const sx = containerSize.w / sourceWidth;
  const sy = containerSize.h / sourceHeight;

  const box: BoxRect = value ?? { x: sourceWidth * 0.05, y: sourceHeight * 0.05, w: sourceWidth * 0.25, h: sourceHeight * 0.25 };

  const handlePointerDown = useCallback((mode: DragMode) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragMode(mode);
    dragRef.current = { startX: e.clientX, startY: e.clientY, initial: { ...box } };
  }, [box]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragMode || !dragRef.current) return;
    const dx = (e.clientX - dragRef.current.startX) / sx;
    const dy = (e.clientY - dragRef.current.startY) / sy;
    const init = dragRef.current.initial;
    let next: BoxRect = { ...init };
    if (dragMode === "move") {
      next.x = clamp(init.x + dx, 0, sourceWidth - init.w);
      next.y = clamp(init.y + dy, 0, sourceHeight - init.h);
    } else if (dragMode === "nw") {
      next.x = clamp(init.x + dx, 0, init.x + init.w - 40);
      next.y = clamp(init.y + dy, 0, init.y + init.h - 40);
      next.w = init.w - (next.x - init.x);
      next.h = init.h - (next.y - init.y);
    } else if (dragMode === "ne") {
      next.w = clamp(init.w + dx, 40, sourceWidth - init.x);
      next.y = clamp(init.y + dy, 0, init.y + init.h - 40);
      next.h = init.h - (next.y - init.y);
    } else if (dragMode === "sw") {
      next.x = clamp(init.x + dx, 0, init.x + init.w - 40);
      next.w = init.w - (next.x - init.x);
      next.h = clamp(init.h + dy, 40, sourceHeight - init.y);
    } else if (dragMode === "se") {
      next.w = clamp(init.w + dx, 40, sourceWidth - init.x);
      next.h = clamp(init.h + dy, 40, sourceHeight - init.y);
    }
    onChange(next);
  }, [dragMode, sx, sy, sourceWidth, sourceHeight, onChange]);

  const handlePointerUp = useCallback(() => {
    setDragMode(null);
    dragRef.current = null;
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative mx-auto flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-black"
      style={{ maxHeight: 480 }}
    >
      <div className="relative" style={{ width: containerSize.w, height: containerSize.h }}>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="Frame de référence" className="h-full w-full select-none object-cover" draggable={false} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            Charge une frame de référence
          </div>
        )}

        {/* Selection rectangle */}
        <div
          className="absolute cursor-move border-2 border-primary bg-primary/15"
          style={{
            left: box.x * sx,
            top: box.y * sy,
            width: box.w * sx,
            height: box.h * sy,
          }}
          onPointerDown={handlePointerDown("move")}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <span className="absolute -top-6 left-0 rounded bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
            CAMÉRA
          </span>
          {(["nw", "ne", "sw", "se"] as const).map((corner) => (
            <div
              key={corner}
              className="absolute h-3 w-3 cursor-nwse-resize rounded-sm border border-background bg-primary"
              style={{
                left: corner.includes("w") ? -6 : "auto",
                right: corner.includes("e") ? -6 : "auto",
                top: corner.includes("n") ? -6 : "auto",
                bottom: corner.includes("s") ? -6 : "auto",
                cursor: corner === "nw" || corner === "se" ? "nwse-resize" : "nesw-resize",
              }}
              onPointerDown={handlePointerDown(corner)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
