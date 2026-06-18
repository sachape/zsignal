// MVP — Manual facecam placement modal.
//
// Geometry contract (v2):
//   - The preview image is rendered with object-fit: contain so the user
//     ALWAYS sees the full source frame (no hidden left/right or top/bottom
//     crop). When the source aspect ratio doesn't match the container, we
//     compute the real displayed rect (offsetX/offsetY + renderedW/H) and
//     normalize the user's selection against THAT rect — never against the
//     raw container. This eliminates the "x shifted by ~0.31" bug.
//   - The crop box is positioned in container pixels, but stored & sent
//     in source-normalized 0..1 coords via displayRectToSourceNormalized.
//   - The ratio is locked to the worker's output facecam-band ratio so the
//     final render can render in pure cover mode (no letterbox / blur).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, ImageOff, Check, ChevronLeft, ChevronRight, AlertTriangle, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  FACECAM_TARGET_RATIO,
  MIN_BOX_SIZE,
  RESIZE_ANCHORS,
  buildSafeFacecamCrop,
  clampBox,
  displayRectToSourceNormalized,
  lockBoxRatio,
  normalizedRatioForSource,
  sourceToDisplayRect,
  type DisplayRect,
  type NormalizedBox,
} from "@/lib/facecamGeometry";
import { RenderCroppedSourceImage } from "./RenderCroppedSourceImage";

export type NormalizedCrop = NormalizedBox;

interface ReferenceFrameItem {
  t: number;
  image_data_url: string | null;
}

interface ReferenceFrameResponse {
  platform: "twitch";
  platform_user_id: string | null;
  platform_login: string | null;
  reference_width: number;
  reference_height: number;
  duration: number | null;
  vod_title: string | null;
  extracted_via: "worker" | "thumbnail_fallback" | "none";
  frames: ReferenceFrameItem[];
  thumbnail_url: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCrop: NormalizedCrop | null;
  channelLogin: string | null;
  sourceUrl: string | null;
  hasSavedPreset?: boolean;
  onResetSavedPreset?: () => void;
  onValidate: (args: {
    crop: NormalizedCrop;
    savePreset: boolean;
    channelLogin: string | null;
    sourceWidth: number | null;
    sourceHeight: number | null;
  }) => void;
}

// Default crop = top-right overlay, locked to the band ratio (~1.875).
const DEFAULT_WIDTH = 0.30;
const DEFAULT_CROP: NormalizedCrop = clampBox({
  x: 1 - DEFAULT_WIDTH - 0.02,
  y: 0.03,
  width: DEFAULT_WIDTH,
  height: DEFAULT_WIDTH / (FACECAM_TARGET_RATIO / (16 / 9)),
});

const DEBUG = (import.meta.env.MODE ?? "production") !== "production";

type DragMode =
  | "move"
  | "resize-nw" | "resize-ne" | "resize-sw" | "resize-se"
  | "resize-n"  | "resize-s"  | "resize-e"  | "resize-w"
  | null;

function isValid(c: NormalizedCrop): boolean {
  return (
    c.x >= -1e-6 && c.y >= -1e-6 &&
    c.width >= MIN_BOX_SIZE && c.height >= MIN_BOX_SIZE &&
    c.x + c.width <= 1 + 1e-6 && c.y + c.height <= 1 + 1e-6
  );
}

export function ManualFacecamPlacer({
  open,
  onOpenChange,
  initialCrop,
  channelLogin,
  sourceUrl,
  hasSavedPreset,
  onResetSavedPreset,
  onValidate,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [frame, setFrame] = useState<ReferenceFrameResponse | null>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [crop, setCrop] = useState<NormalizedCrop>(initialCrop ?? DEFAULT_CROP);
  const [savePreset, setSavePreset] = useState(true);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  // A source is considered a Twitch source (and therefore MUST display a
  // real extracted frame — no empty-grid fallback) when either the URL
  // looks like a Twitch URL or a Twitch channelLogin is known.
  const isTwitchSource = (() => {
    if (channelLogin) return true;
    if (!sourceUrl) return false;
    try {
      const h = new URL(sourceUrl).hostname.replace(/^www\./, "");
      return h.endsWith("twitch.tv");
    } catch { return false; }
  })();

  const currentFrame = frame?.frames?.[frameIndex] ?? null;
  const currentImageUrl = currentFrame?.image_data_url ?? frame?.thumbnail_url ?? null;
  const isThumbnailFallback = frame?.extracted_via === "thumbnail_fallback";

  // Container & natural-image dimensions drive the display rect.
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const sourceW = frame?.reference_width ?? 1920;
  const sourceH = frame?.reference_height ?? 1080;
  const cropRatio = useMemo(() => normalizedRatioForSource(sourceW, sourceH), [sourceW, sourceH]);

  const display: DisplayRect = useMemo(
    () => sourceToDisplayRect(containerSize.w, containerSize.h, sourceW, sourceH, "contain"),
    [containerSize, sourceW, sourceH],
  );

  // Observe container size — needed for accurate pointer math.
  useEffect(() => {
    if (!open) return;
    const el = stageRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setContainerSize({ w: r.width, h: r.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, loading]);

  const dragRef = useRef<{
    mode: DragMode;
    startX: number;
    startY: number;
    origin: NormalizedCrop;
    display: DisplayRect;
  }>({
    mode: null, startX: 0, startY: 0, origin: DEFAULT_CROP,
    display: { offsetX: 0, offsetY: 0, renderedWidth: 1, renderedHeight: 1 },
  });

  useEffect(() => {
    if (open) {
      const seed = initialCrop ?? DEFAULT_CROP;
      const snapped = lockBoxRatio(seed, seed, { ax: 0.5, ay: 0.5 }, cropRatio);
      setCrop(clampBox(snapped));
      setSavePreset(true);
    }
  }, [open, initialCrop, cropRatio]);

  const inflightRef = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!open) {
      // Modal closed — cancel any in-flight request so it doesn't
      // resolve later and stomp state for the next open.
      if (inflightRef.current) {
        inflightRef.current.abort();
        inflightRef.current = null;
      }
      return;
    }
    // Prevent duplicate concurrent requests (e.g. fast re-renders).
    if (inflightRef.current) {
      inflightRef.current.abort();
    }
    const ac = new AbortController();
    inflightRef.current = ac;

    setLoading(true);
    setLoadError(null);
    setFrameIndex(0);
    const sourceKind = (() => {
      if (!sourceUrl) return "none";
      try {
        const h = new URL(sourceUrl).hostname.replace(/^www\./, "");
        if (h === "clips.twitch.tv") return "twitch_clip";
        if (h.endsWith("twitch.tv")) return "twitch_vod_or_clip";
      } catch { /* ignore */ }
      return "direct";
    })();
    const requestStartedAt = Date.now();
    console.info("manual_reference_frame_request_started", {
      source_url: sourceUrl,
      source_kind: sourceKind,
      has_source_url: !!sourceUrl,
      channel_login: channelLogin,
      attempt: loadAttempt,
    });
    void (async () => {
      try {
        const { data, error } = await supabase.functions.invoke<ReferenceFrameResponse>(
          "clip-layout-reference-frame",
          { body: { source_url: sourceUrl, count: 5 } },
        );
        if (ac.signal.aborted) return;
        if (error) throw error;
        const framesCount = data?.frames?.length ?? 0;
        setFrame(data ?? null);
        setFrameIndex(Math.floor(((data?.frames?.length ?? 1) - 1) / 2));
        if (framesCount === 0) {
          setLoadError("no_frames");
          console.warn("manual_reference_frame_request_failed", {
            error: "no_frames",
            duration_ms: Date.now() - requestStartedAt,
          });
        } else {
          console.info("manual_reference_frame_request_success", {
            frames_count: framesCount,
            extracted_via: data?.extracted_via,
            duration_ms: Date.now() - requestStartedAt,
          });
        }
      } catch (err) {
        if (ac.signal.aborted) return;
        const msg = err instanceof Error ? err.message : "unknown";
        console.warn("manual_reference_frame_request_failed", {
          error: msg,
          duration_ms: Date.now() - requestStartedAt,
        });
        setFrame(null);
        setLoadError(msg);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
        if (inflightRef.current === ac) inflightRef.current = null;
      }
    })();

    return () => {
      ac.abort();
      if (inflightRef.current === ac) inflightRef.current = null;
    };
  }, [open, sourceUrl, loadAttempt, channelLogin]);

  const goPrevFrame = () => {
    if (!frame?.frames?.length) return;
    setFrameIndex((i) => (i - 1 + frame.frames.length) % frame.frames.length);
  };
  const goNextFrame = () => {
    if (!frame?.frames?.length) return;
    setFrameIndex((i) => (i + 1) % frame.frames.length);
  };

  const onPointerDown = (mode: DragMode) => (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      origin: { ...crop },
      display,
    };
  };

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d.mode) return;
    // Convert pointer pixel delta into source-normalized delta using the
    // actual rendered image size — never the container size.
    const rw = d.display.renderedWidth || 1;
    const rh = d.display.renderedHeight || 1;
    const dx = (e.clientX - d.startX) / rw;
    const dy = (e.clientY - d.startY) / rh;
    const o = d.origin;

    if (d.mode === "move") {
      setCrop(clampBox({ ...o, x: o.x + dx, y: o.y + dy }));
      return;
    }

    let next: NormalizedBox = { ...o };
    switch (d.mode) {
      case "resize-se": next = { ...o, width: o.width + dx, height: o.height + dy }; break;
      case "resize-sw": next = { ...o, x: o.x + dx, width: o.width - dx, height: o.height + dy }; break;
      case "resize-ne": next = { ...o, y: o.y + dy, width: o.width + dx, height: o.height - dy }; break;
      case "resize-nw": next = { x: o.x + dx, y: o.y + dy, width: o.width - dx, height: o.height - dy }; break;
      case "resize-n":  next = { ...o, y: o.y + dy, height: o.height - dy }; break;
      case "resize-s":  next = { ...o, height: o.height + dy }; break;
      case "resize-w":  next = { ...o, x: o.x + dx, width: o.width - dx }; break;
      case "resize-e":  next = { ...o, width: o.width + dx }; break;
    }
    const anchor = RESIZE_ANCHORS[d.mode as keyof typeof RESIZE_ANCHORS];
    setCrop(clampBox(lockBoxRatio(next, o, anchor, cropRatio)));
  }, [cropRatio]);

  const onPointerUp = (e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    dragRef.current.mode = null;
  };

  const reset = () => setCrop(clampBox(lockBoxRatio(DEFAULT_CROP, DEFAULT_CROP, { ax: 0.5, ay: 0.5 }, cropRatio)));

  const validate = () => {
    const c = clampBox(crop);
    const rectMetrics = {
      rectLeft: display.offsetX + c.x * display.renderedWidth,
      rectTop: display.offsetY + c.y * display.renderedHeight,
      rectW: c.width * display.renderedWidth,
      rectH: c.height * display.renderedHeight,
    };
    const normalizedRaw = displayRectToSourceNormalized({
      left: rectMetrics.rectLeft,
      top: rectMetrics.rectTop,
      width: rectMetrics.rectW,
      height: rectMetrics.rectH,
    }, display);
    const normalizedSafe = buildSafeFacecamCrop(normalizedRaw, cropRatio);
    if (DEBUG && Math.abs(rectMetrics.rectTop - display.offsetY) <= 3 && normalizedRaw.y > 0.01) {
      throw new Error("manual_placer_assertion_failed: top-aligned selection must normalize to y<=0.01");
    }
    if (DEBUG) {
      console.info("manual_placer_debug", {
        sourceNaturalWidth: sourceW,
        sourceNaturalHeight: sourceH,
        containerW: containerSize.w,
        containerH: containerSize.h,
        renderedW: display.renderedWidth,
        renderedH: display.renderedHeight,
        offsetX: display.offsetX,
        offsetY: display.offsetY,
        ...rectMetrics,
        normalizedRaw,
        normalizedSafe,
      });
    }
    if (!isValid(c)) {
      toast({
        title: "Zone invalide",
        description: "La zone doit rester dans l'image et faire au moins 4% de chaque côté.",
        variant: "destructive",
      });
      return;
    }
    onValidate({
      crop: normalizedRaw,
      savePreset: savePreset && !!effectiveLogin,
      channelLogin: effectiveLogin,
      sourceWidth: sourceW,
      sourceHeight: sourceH,
    });
    onOpenChange(false);
  };

  const hasImage = !!currentImageUrl;
  const effectiveLogin = channelLogin ?? frame?.platform_login ?? null;
  const canSavePreset = !!effectiveLogin;
  const totalFrames = frame?.frames?.length ?? 0;
  const canCycleFrames = totalFrames > 1;

  // Crop box positioned in CONTAINER pixels = displayed rect offset + (norm × rendered).
  const boxPxStyle = {
    left: `${display.offsetX + crop.x * display.renderedWidth}px`,
    top: `${display.offsetY + crop.y * display.renderedHeight}px`,
    width: `${crop.width * display.renderedWidth}px`,
    height: `${crop.height * display.renderedHeight}px`,
  } as const;

  const safeCrop = useMemo(() => buildSafeFacecamCrop(clampBox(crop), cropRatio), [crop, cropRatio]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Placer ma caméra</DialogTitle>
          <DialogDescription>
            Place le cadre autour de ta webcam — le ratio est verrouillé pour
            correspondre à la bande caméra du clip vertical. Une marge de
            sécurité est ajoutée automatiquement au rendu.
          </DialogDescription>
        </DialogHeader>

        {isThumbnailFallback && (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-[11px] text-amber-200">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <span>
              Image dégradée (miniature Twitch). Le worker n'a pas pu extraire
              une frame réelle de la source — la position détectée peut être
              légèrement décalée.
            </span>
          </div>
        )}

        <div
          ref={stageRef}
          className="relative w-full overflow-hidden rounded-lg border border-border bg-black"
          style={{ aspectRatio: "16 / 9" }}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Extraction d'une frame réelle depuis la source…
            </div>
          ) : hasImage ? (
            // object-contain = the user sees the FULL source frame, no
            // hidden crop. The displayed rect is letterboxed when source
            // aspect ratio differs from the container — handled in math.
            <img
              src={currentImageUrl!}
              alt={frame?.vod_title ?? "Frame de référence"}
              className="absolute inset-0 h-full w-full select-none object-contain"
              draggable={false}
            />
          ) : isTwitchSource ? (
            // Twitch sources MUST display a real extracted frame. The
            // empty-grid fallback is explicitly forbidden here because it
            // would force the user to guess the webcam position.
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center text-muted-foreground">
              <AlertTriangle className="h-6 w-6 text-amber-400" />
              <p className="text-xs">
                Impossible de charger une frame de référence. Réessaie ou importe un média.
              </p>
              {loadError && (
                <p className="font-mono text-[10px] text-muted-foreground/70">{loadError}</p>
              )}
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() => setLoadAttempt((n) => n + 1)}
              >
                <RotateCcw className="h-3 w-3" /> Réessayer
              </Button>
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <ImageOff className="h-6 w-6" />
              <p className="text-xs">
                Aucune image de référence. Estime la position de ta caméra sur la grille.
              </p>
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
                  backgroundSize: "10% 10%",
                }}
              />
            </div>
          )}

          {/* Dim everything OUTSIDE the displayed image rect (letterbox area
              stays fully black so the user understands it's not part of the
              source). */}
          <div className="pointer-events-none absolute inset-0 bg-background/40" />

          {/* Crop box — positioned in container pixels via displayed rect */}
          <div
            className="absolute cursor-move ring-2 ring-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
            style={boxPxStyle}
            onPointerDown={onPointerDown("move")}
          >
            <div className="absolute -top-6 left-0 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
              Zone caméra sélectionnée · {Math.round(crop.width * 100)}% × {Math.round(crop.height * 100)}%
            </div>
            <Handle pos="nw" onPointerDown={onPointerDown("resize-nw")} />
            <Handle pos="ne" onPointerDown={onPointerDown("resize-ne")} />
            <Handle pos="sw" onPointerDown={onPointerDown("resize-sw")} />
            <Handle pos="se" onPointerDown={onPointerDown("resize-se")} />
            <Handle pos="n" onPointerDown={onPointerDown("resize-n")} />
            <Handle pos="s" onPointerDown={onPointerDown("resize-s")} />
            <Handle pos="w" onPointerDown={onPointerDown("resize-w")} />
            <Handle pos="e" onPointerDown={onPointerDown("resize-e")} />
          </div>

          {DEBUG && (
            <div className="pointer-events-none absolute bottom-1 left-1 max-w-[60%] rounded bg-black/70 p-1.5 font-mono text-[10px] leading-tight text-white">
              <div>src {sourceW}×{sourceH} via {frame?.extracted_via ?? "?"}</div>
              <div>cont {Math.round(containerSize.w)}×{Math.round(containerSize.h)}</div>
              <div>off {display.offsetX.toFixed(1)},{display.offsetY.toFixed(1)} render {Math.round(display.renderedWidth)}×{Math.round(display.renderedHeight)}</div>
              <div>raw x={crop.x.toFixed(3)} y={crop.y.toFixed(3)} w={crop.width.toFixed(3)} h={crop.height.toFixed(3)}</div>
              <div>safe x={safeCrop.x.toFixed(3)} y={safeCrop.y.toFixed(3)} w={safeCrop.width.toFixed(3)} h={safeCrop.height.toFixed(3)}</div>
            </div>
          )}
        </div>

        {canCycleFrames && (
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <Button variant="outline" size="sm" onClick={goPrevFrame} className="gap-1">
              <ChevronLeft className="h-3.5 w-3.5" /> Frame précédente
            </Button>
            <span className="font-mono">
              Frame {frameIndex + 1}/{totalFrames}
              {currentFrame?.t != null && ` · t=${currentFrame.t.toFixed(1)}s`}
            </span>
            <Button variant="outline" size="sm" onClick={goNextFrame} className="gap-1">
              Frame suivante <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* Aperçu final 9:16 — full vertical composition. The facecam band
            is pinned to y=0 (top 30%), gameplay fills the bottom 70%, with
            no gap and no black margin — exactly matching the worker's
            vstack(cam, game) output at 1080x1920. */}
        {hasImage && (() => {
          const CAM_RATIO = 0.30; // keep in sync with worker default
          return (
            <div className="rounded-md border border-border bg-card p-3">
              <div className="mb-1.5 flex items-center justify-between">
                <Label className="text-xs">Aperçu final 9:16</Label>
                <span className="font-mono text-[10px] text-muted-foreground">
                  cam y=0 · {Math.round(CAM_RATIO * 100)}% / gameplay {Math.round((1 - CAM_RATIO) * 100)}%
                </span>
              </div>
              <div className="flex justify-center">
                <div
                  className="relative overflow-hidden rounded bg-black"
                  style={{ aspectRatio: "9 / 16", height: 360 }}
                >
                  {/* Facecam band — pinned to the very top (y=0), full width,
                      cover-rendered from the safe crop via the shared
                      RenderCroppedSourceImage component (single source of
                      truth, agrees pixel-for-pixel with the worker). */}
                  <div
                    className="absolute left-0 right-0 top-0"
                    style={{ height: `${CAM_RATIO * 100}%` }}
                  >
                    <RenderCroppedSourceImage
                      imageUrl={currentImageUrl!}
                      cropNormalized={safeCrop}
                      sourceWidth={sourceW}
                      sourceHeight={sourceH}
                      className="h-full w-full"
                      debug={DEBUG}
                      debugLabel="preview-facecam-band"
                    />
                    <div className="pointer-events-none absolute left-1 top-1 rounded bg-primary/90 px-1.5 py-0.5 text-[9px] font-medium text-primary-foreground">
                      Caméra (y=0)
                    </div>
                  </div>

                  {/* Gameplay band — immediately below the facecam (no gap),
                      cover-fit from the full source frame to mirror the
                      worker's gameplay scale+crop. */}
                  <div
                    className="absolute bottom-0 left-0 right-0 overflow-hidden"
                    style={{ height: `${(1 - CAM_RATIO) * 100}%` }}
                  >
                    <img
                      src={currentImageUrl!}
                      alt=""
                      draggable={false}
                      className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
                    />
                    <div className="pointer-events-none absolute left-1 top-1 rounded bg-background/70 px-1.5 py-0.5 text-[9px] font-medium text-foreground">
                      Gameplay
                    </div>
                  </div>

                  {/* Separator hairline between the two bands (purely visual). */}
                  <div
                    className="pointer-events-none absolute left-0 right-0 h-px bg-primary/40"
                    style={{ top: `${CAM_RATIO * 100}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })()}

        {/*
          For Twitch sources without a real extracted frame, saving a preset
          or validating a crop is FORBIDDEN — the user would be saving
          coordinates relative to an empty grid, which never matches the
          worker's pixel space.
        */}
        {(() => {
          const blockTwitchNoFrame = isTwitchSource && !hasImage && !loading;
          return (
            <>
              <div className="flex items-start gap-2 rounded-md border border-border bg-card p-3">
                <Checkbox
                  id="save-facecam-preset"
                  checked={savePreset && canSavePreset && !blockTwitchNoFrame}
                  disabled={!canSavePreset || blockTwitchNoFrame}
                  onCheckedChange={(v) => setSavePreset(v === true)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <Label
                    htmlFor="save-facecam-preset"
                    className={cn(
                      "cursor-pointer text-xs",
                      (!canSavePreset || blockTwitchNoFrame) && "text-muted-foreground",
                    )}
                  >
                    Sauvegarder cette position pour les prochains clips
                  </Label>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {blockTwitchNoFrame ? (
                      "Sauvegarde désactivée tant qu'une frame réelle n'a pas été chargée."
                    ) : canSavePreset ? (
                      <>
                        Caméra mémorisée pour{" "}
                        <span className="font-medium text-foreground">@{effectiveLogin}</span>. Tu pourras la modifier à tout moment.
                      </>
                    ) : (
                      "Aucune chaîne Twitch détectée — la zone sera utilisée uniquement pour ce clip."
                    )}
                  </p>
                </div>
                {hasSavedPreset && onResetSavedPreset && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-[11px] text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      onResetSavedPreset();
                      toast({ title: "Position sauvegardée réinitialisée" });
                    }}
                  >
                    <RotateCcw className="h-3 w-3" /> Réinitialiser
                  </Button>
                )}
              </div>

              <DialogFooter className="gap-2 sm:gap-2">
                <Button variant="ghost" size="sm" onClick={reset}>Réinitialiser la zone</Button>
                <div className="flex-1" />
                <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Annuler</Button>
                <Button
                  size="sm"
                  onClick={validate}
                  className="gap-1"
                  disabled={blockTwitchNoFrame || loading}
                  title={blockTwitchNoFrame ? "Charge une frame de référence avant de valider." : undefined}
                >
                  <Check className="h-3.5 w-3.5" /> Valider la zone
                </Button>
              </DialogFooter>
            </>
          );
        })()}
      </DialogContent>
    </Dialog>
  );
}

function Handle({
  pos,
  onPointerDown,
}: {
  pos: "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w";
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  const map: Record<typeof pos, string> = {
    nw: "left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize",
    ne: "right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize",
    sw: "left-0 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize",
    se: "right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize",
    n: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize",
    s: "left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-ns-resize",
    w: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize",
    e: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-ew-resize",
  } as const;
  return (
    <div
      onPointerDown={onPointerDown}
      className={cn(
        "absolute h-3 w-3 rounded-sm border-2 border-background bg-primary",
        map[pos],
      )}
    />
  );
}

export default ManualFacecamPlacer;

// Export the geometry helper so callers (including future debug overlays
// and tests) can reuse the exact same mapping.
export { displayRectToSourceNormalized, sourceToDisplayRect };
