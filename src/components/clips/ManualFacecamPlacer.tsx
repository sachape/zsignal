// MVP — Manual facecam placement modal.
// Lets the streamer drag/resize a rectangle over a preview frame from their
// last Twitch VOD. The rectangle is LOCKED to the worker's output facecam
// band ratio so the final render can always cover the band without any
// letterbox/blur/black bars/stretching.
//
// The validated box is sent as-is to the backend (normalized 0..1). The
// backend applies the canonical "safe crop" (pad + ratio + clamp/shift)
// before handing pixel coords to the worker. The preview here reflects
// the locked-ratio box (= what the worker will render in cover mode);
// the extra safety padding is added server-side as a hidden safety net.
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, ImageOff, Check } from "lucide-react";
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
  clampBox,
  lockBoxRatio,
  type NormalizedBox,
} from "@/lib/facecamGeometry";

export type NormalizedCrop = NormalizedBox;

interface ReferenceFrame {
  platform: "twitch";
  platform_user_id: string;
  platform_login: string | null;
  reference_width: number;
  reference_height: number;
  thumbnail_url: string | null;
  vod_title: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCrop: NormalizedCrop | null;
  /** Twitch channel login (used to scope the saved preset). */
  channelLogin: string | null;
  onValidate: (args: {
    crop: NormalizedCrop;
    savePreset: boolean;
    channelLogin: string | null;
    sourceWidth: number | null;
    sourceHeight: number | null;
  }) => void;
}

// Default crop = top-right overlay, locked to the band ratio (~1.875).
// width 0.30 → height ≈ 0.16. Tweaked so it visually feels like a webcam.
const DEFAULT_WIDTH = 0.30;
const DEFAULT_CROP: NormalizedCrop = clampBox({
  x: 1 - DEFAULT_WIDTH - 0.02,
  y: 0.03,
  width: DEFAULT_WIDTH,
  height: DEFAULT_WIDTH / FACECAM_TARGET_RATIO,
});

type DragMode =
  | "move"
  | "resize-nw"
  | "resize-ne"
  | "resize-sw"
  | "resize-se"
  | "resize-n"
  | "resize-s"
  | "resize-e"
  | "resize-w"
  | null;

function isValid(c: NormalizedCrop): boolean {
  return (
    c.x >= -1e-6 &&
    c.y >= -1e-6 &&
    c.width >= MIN_BOX_SIZE &&
    c.height >= MIN_BOX_SIZE &&
    c.x + c.width <= 1 + 1e-6 &&
    c.y + c.height <= 1 + 1e-6
  );
}

export function ManualFacecamPlacer({
  open,
  onOpenChange,
  initialCrop,
  channelLogin,
  onValidate,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [frame, setFrame] = useState<ReferenceFrame | null>(null);
  const [crop, setCrop] = useState<NormalizedCrop>(initialCrop ?? DEFAULT_CROP);
  const [savePreset, setSavePreset] = useState(true);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    mode: DragMode;
    startX: number;
    startY: number;
    origin: NormalizedCrop;
    rect: { width: number; height: number };
  }>({
    mode: null,
    startX: 0,
    startY: 0,
    origin: DEFAULT_CROP,
    rect: { width: 1, height: 1 },
  });

  // Always snap any incoming crop to the locked ratio so the modal can't
  // open on a stale free-form preset from an older client build.
  useEffect(() => {
    if (open) {
      const seed = initialCrop ?? DEFAULT_CROP;
      const snapped = lockBoxRatio(
        seed,
        seed,
        { ax: 0.5, ay: 0.5 },
        FACECAM_TARGET_RATIO,
      );
      setCrop(clampBox(snapped));
      setSavePreset(true);
    }
  }, [open, initialCrop]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void (async () => {
      try {
        const { data, error } = await supabase.functions.invoke<ReferenceFrame>(
          "clip-layout-reference-frame",
          { body: {} },
        );
        if (error) throw error;
        setFrame(data ?? null);
      } catch (err) {
        console.warn("[ManualFacecamPlacer] reference frame unavailable", err);
        setFrame(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  const onPointerDown = (mode: DragMode) => (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const stage = stageRef.current;
    const rect = stage?.getBoundingClientRect();
    dragRef.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      origin: { ...crop },
      rect: {
        width: rect?.width ?? 1,
        height: rect?.height ?? 1,
      },
    };
  };

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d.mode) return;
    const dx = (e.clientX - d.startX) / (d.rect.width || 1);
    const dy = (e.clientY - d.startY) / (d.rect.height || 1);
    const o = d.origin;

    if (d.mode === "move") {
      setCrop(clampBox({ ...o, x: o.x + dx, y: o.y + dy }));
      return;
    }

    // Free-form resize first, then re-lock to the band ratio while pinning
    // the appropriate anchor (opposite corner / opposite edge).
    let next: NormalizedBox = { ...o };
    switch (d.mode) {
      case "resize-se":
        next = { ...o, width: o.width + dx, height: o.height + dy };
        break;
      case "resize-sw":
        next = { ...o, x: o.x + dx, width: o.width - dx, height: o.height + dy };
        break;
      case "resize-ne":
        next = { ...o, y: o.y + dy, width: o.width + dx, height: o.height - dy };
        break;
      case "resize-nw":
        next = {
          x: o.x + dx,
          y: o.y + dy,
          width: o.width - dx,
          height: o.height - dy,
        };
        break;
      case "resize-n":
        next = { ...o, y: o.y + dy, height: o.height - dy };
        break;
      case "resize-s":
        next = { ...o, height: o.height + dy };
        break;
      case "resize-w":
        next = { ...o, x: o.x + dx, width: o.width - dx };
        break;
      case "resize-e":
        next = { ...o, width: o.width + dx };
        break;
    }

    const anchor = RESIZE_ANCHORS[d.mode as keyof typeof RESIZE_ANCHORS];
    const locked = lockBoxRatio(next, o, anchor, FACECAM_TARGET_RATIO);
    setCrop(clampBox(locked));
  }, []);

  const onPointerUp = (e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    dragRef.current.mode = null;
  };

  const reset = () => setCrop(DEFAULT_CROP);

  const validate = () => {
    const c = clampBox(crop);
    if (!isValid(c)) {
      toast({
        title: "Zone invalide",
        description: "La zone doit rester dans l'image et faire au moins 4% de chaque côté.",
        variant: "destructive",
      });
      return;
    }
    onValidate({
      crop: c,
      savePreset: savePreset && !!effectiveLogin,
      channelLogin: effectiveLogin,
      sourceWidth: frame?.reference_width ?? null,
      sourceHeight: frame?.reference_height ?? null,
    });
    onOpenChange(false);
  };

  const hasImage = !!frame?.thumbnail_url;
  const effectiveLogin = channelLogin ?? frame?.platform_login ?? null;
  const canSavePreset = !!effectiveLogin;

  // Display rectangle in percentages.
  const boxStyle = {
    left: `${crop.x * 100}%`,
    top: `${crop.y * 100}%`,
    width: `${crop.width * 100}%`,
    height: `${crop.height * 100}%`,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Placer ma caméra</DialogTitle>
          <DialogDescription>
            Place le cadre approximativement sur ta webcam — le ratio est verrouillé
            pour correspondre à la bande caméra du clip vertical. On ajustera
            automatiquement une petite marge de sécurité au rendu.
          </DialogDescription>
        </DialogHeader>

        <div
          ref={stageRef}
          className="relative w-full overflow-hidden rounded-lg border border-border bg-muted"
          style={{ aspectRatio: "16 / 9" }}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Chargement d'une image de référence…
            </div>
          ) : hasImage ? (
            <img
              src={frame!.thumbnail_url!}
              alt={frame?.vod_title ?? "Frame de référence"}
              className="absolute inset-0 h-full w-full select-none object-cover"
              draggable={false}
            />
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

          {/* Dim overlay */}
          <div className="pointer-events-none absolute inset-0 bg-background/50" />

          {/* Crop box — locked to the facecam band ratio */}
          <div
            className="absolute cursor-move ring-2 ring-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
            style={boxStyle}
            onPointerDown={onPointerDown("move")}
          >
            {/* "Clear" inset image showing original pixels — same cover-style
                geometry as the worker render. */}
            {hasImage && (
              <img
                src={frame!.thumbnail_url!}
                alt=""
                draggable={false}
                className="pointer-events-none absolute h-full w-full max-w-none select-none object-none"
                style={{
                  left: `-${(crop.x / crop.width) * 100}%`,
                  top: `-${(crop.y / crop.height) * 100}%`,
                  width: `${(1 / crop.width) * 100}%`,
                  height: `${(1 / crop.height) * 100}%`,
                }}
              />
            )}

            <div className="absolute -top-6 left-0 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
              Caméra · ratio verrouillé · {Math.round(crop.width * 100)}% × {Math.round(crop.height * 100)}%
            </div>

            {/* Corner handles */}
            <Handle pos="nw" onPointerDown={onPointerDown("resize-nw")} />
            <Handle pos="ne" onPointerDown={onPointerDown("resize-ne")} />
            <Handle pos="sw" onPointerDown={onPointerDown("resize-sw")} />
            <Handle pos="se" onPointerDown={onPointerDown("resize-se")} />
            {/* Edge handles */}
            <Handle pos="n" onPointerDown={onPointerDown("resize-n")} />
            <Handle pos="s" onPointerDown={onPointerDown("resize-s")} />
            <Handle pos="w" onPointerDown={onPointerDown("resize-w")} />
            <Handle pos="e" onPointerDown={onPointerDown("resize-e")} />
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-md border border-border bg-card p-3">
          <Checkbox
            id="save-facecam-preset"
            checked={savePreset && canSavePreset}
            disabled={!canSavePreset}
            onCheckedChange={(v) => setSavePreset(v === true)}
            className="mt-0.5"
          />
          <div className="flex-1">
            <Label
              htmlFor="save-facecam-preset"
              className={cn("cursor-pointer text-xs", !canSavePreset && "text-muted-foreground")}
            >
              Sauvegarder cette position pour les prochains clips
            </Label>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {canSavePreset ? (
                <>
                  Caméra mémorisée pour{" "}
                  <span className="font-medium text-foreground">@{effectiveLogin}</span>. Tu pourras la modifier à tout moment.
                </>
              ) : (
                "Aucune chaîne Twitch détectée — la zone sera utilisée uniquement pour ce clip."
              )}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" size="sm" onClick={reset}>
            Réinitialiser
          </Button>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button size="sm" onClick={validate} className="gap-1">
            <Check className="h-3.5 w-3.5" /> Valider la zone
          </Button>
        </DialogFooter>
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
