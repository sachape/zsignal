import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Save, RefreshCw, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Reference frame is always rendered in Twitch VOD native dimensions.
const REF_WIDTH = 1920;
const REF_HEIGHT = 1080;

interface ReferenceFrame {
  platform: "twitch";
  platform_user_id: string;
  platform_login: string | null;
  reference_width: number;
  reference_height: number;
  thumbnail_url: string | null;
  vod_title: string | null;
}

interface Crop {
  x: number;
  y: number;
  width: number;
  height: number;
}

const DEFAULT_CROP: Crop = {
  // Sensible default: top strip, full width, ~ 1/3 of frame height.
  x: 0,
  y: 0,
  width: REF_WIDTH,
  height: Math.round(REF_HEIGHT / 3),
};

interface Props {
  onSaved?: () => void;
  onClose?: () => void;
}

type DragMode = "move" | "resize-br" | null;

export function CameraPlacementEditor({ onSaved, onClose }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [frame, setFrame] = useState<ReferenceFrame | null>(null);
  const [crop, setCrop] = useState<Crop>(DEFAULT_CROP);
  const [imgLoaded, setImgLoaded] = useState(false);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    mode: DragMode;
    startX: number;
    startY: number;
    origin: Crop;
    scale: number;
  }>({ mode: null, startX: 0, startY: 0, origin: DEFAULT_CROP, scale: 1 });

  const loadFrame = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke<ReferenceFrame>(
        "clip-layout-reference-frame",
        { body: {} },
      );
      if (error) throw error;
      if (!data) throw new Error("empty_response");
      setFrame(data);

      // Hydrate existing preset if any.
      if (user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: existing } = await (supabase as any)
          .from("creator_video_layout_presets")
          .select("facecam_x, facecam_y, facecam_width, facecam_height, source_reference_width, source_reference_height")
          .eq("user_id", user.id)
          .eq("platform", "twitch")
          .eq("platform_user_id", data.platform_user_id)
          .maybeSingle();
        if (existing?.facecam_width && existing?.facecam_height) {
          const sw = existing.source_reference_width || REF_WIDTH;
          const sh = existing.source_reference_height || REF_HEIGHT;
          // Rescale to current reference if needed.
          const fx = REF_WIDTH / sw;
          const fy = REF_HEIGHT / sh;
          setCrop({
            x: Math.round((existing.facecam_x || 0) * fx),
            y: Math.round((existing.facecam_y || 0) * fy),
            width: Math.round(existing.facecam_width * fx),
            height: Math.round(existing.facecam_height * fy),
          });
        }
      }
    } catch (err) {
      console.error("[CameraPlacementEditor] load error", err);
      toast({
        title: "Impossible de charger une image de référence",
        description: "Vérifie que ton compte Twitch est bien connecté.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadFrame();
  }, [loadFrame]);

  // Compute display scale based on stage width.
  const getScale = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return 1;
    return stage.clientWidth / REF_WIDTH;
  }, []);

  const clampCrop = (c: Crop): Crop => {
    const minW = 200;
    const minH = 150;
    const width = Math.max(minW, Math.min(REF_WIDTH, c.width));
    const height = Math.max(minH, Math.min(REF_HEIGHT, c.height));
    const x = Math.max(0, Math.min(REF_WIDTH - width, c.x));
    const y = Math.max(0, Math.min(REF_HEIGHT - height, c.y));
    return { x, y, width, height };
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
      scale: getScale(),
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d.mode) return;
    const dxDisplay = e.clientX - d.startX;
    const dyDisplay = e.clientY - d.startY;
    const dx = dxDisplay / (d.scale || 1);
    const dy = dyDisplay / (d.scale || 1);
    if (d.mode === "move") {
      setCrop(clampCrop({ ...d.origin, x: d.origin.x + dx, y: d.origin.y + dy }));
    } else if (d.mode === "resize-br") {
      setCrop(
        clampCrop({
          ...d.origin,
          width: d.origin.width + dx,
          height: d.origin.height + dy,
        }),
      );
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    dragRef.current.mode = null;
  };

  const resetCrop = () => setCrop(DEFAULT_CROP);

  const save = async () => {
    if (!user || !frame) return;
    setSaving(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("creator_video_layout_presets")
        .upsert(
          {
            user_id: user.id,
            platform: "twitch",
            platform_user_id: frame.platform_user_id,
            layout_type: "facecam_top_gameplay_bottom",
            facecam_x: Math.round(crop.x),
            facecam_y: Math.round(crop.y),
            facecam_width: Math.round(crop.width),
            facecam_height: Math.round(crop.height),
            source_reference_width: REF_WIDTH,
            source_reference_height: REF_HEIGHT,
            output_width: 1080,
            output_height: 1920,
          },
          { onConflict: "user_id,platform,platform_user_id" },
        );
      if (error) throw error;
      toast({
        title: "Caméra enregistrée",
        description: "Tes prochains clips Twitch utiliseront ce cadrage.",
      });
      onSaved?.();
      onClose?.();
    } catch (err) {
      console.error("[CameraPlacementEditor] save error", err);
      toast({
        title: "Échec de l'enregistrement",
        description: "Réessaie dans un instant.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Chargement d'une image de ton dernier live…
      </div>
    );
  }

  const hasImage = !!frame?.thumbnail_url;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Place le cadre sur ta caméra
          </p>
          <p className="text-xs text-muted-foreground">
            Glisse pour déplacer, tire le coin en bas à droite pour redimensionner.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {frame?.platform_login && (
            <Badge variant="outline" className="text-[10px] text-muted-foreground">
              @{frame.platform_login}
            </Badge>
          )}
          <Button size="sm" variant="ghost" onClick={() => void loadFrame()} className="gap-1 text-xs">
            <RefreshCw className="h-3 w-3" /> Recharger
          </Button>
        </div>
      </div>

      <div
        ref={stageRef}
        className="relative w-full overflow-hidden rounded-lg border border-border/60 bg-muted"
        style={{ aspectRatio: `${REF_WIDTH} / ${REF_HEIGHT}` }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {hasImage ? (
          <img
            src={frame!.thumbnail_url!}
            alt={frame?.vod_title ?? "Dernière VOD"}
            className="absolute inset-0 h-full w-full object-cover select-none"
            draggable={false}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgLoaded(false)}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageOff className="h-6 w-6" />
            <p className="text-xs">Aucune VOD récente trouvée. Cadre quand même sur la grille ci-dessous.</p>
          </div>
        )}

        {/* Dimmed overlay */}
        <div className="pointer-events-none absolute inset-0 bg-background/50" />

        {/* Crop box */}
        <div
          className={cn(
            "absolute cursor-move ring-2 ring-primary",
            "bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]",
          )}
          style={{
            left: `${(crop.x / REF_WIDTH) * 100}%`,
            top: `${(crop.y / REF_HEIGHT) * 100}%`,
            width: `${(crop.width / REF_WIDTH) * 100}%`,
            height: `${(crop.height / REF_HEIGHT) * 100}%`,
          }}
          onPointerDown={onPointerDown("move")}
        >
          {/* Window inside the dim — clear the area */}
          {hasImage && imgLoaded && (
            <img
              src={frame!.thumbnail_url!}
              alt=""
              draggable={false}
              className="pointer-events-none absolute h-full w-full max-w-none object-none select-none"
              style={{
                // Position the image so the crop area shows the same pixels as underneath.
                left: `-${(crop.x / crop.width) * 100}%`,
                top: `-${(crop.y / crop.height) * 100}%`,
                width: `${(REF_WIDTH / crop.width) * 100}%`,
                height: `${(REF_HEIGHT / crop.height) * 100}%`,
              }}
            />
          )}

          <div className="absolute -top-6 left-0 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
            Caméra · {Math.round(crop.width)}×{Math.round(crop.height)}
          </div>

          {/* Resize handle */}
          <div
            className="absolute -bottom-2 -right-2 h-4 w-4 cursor-nwse-resize rounded-sm border-2 border-background bg-primary"
            onPointerDown={onPointerDown("resize-br")}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={resetCrop} className="text-xs">
          Réinitialiser
        </Button>
        <div className="flex gap-2">
          {onClose && (
            <Button variant="outline" size="sm" onClick={onClose}>
              Annuler
            </Button>
          )}
          <Button size="sm" onClick={save} disabled={saving} className="gap-1">
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            Enregistrer ma caméra
          </Button>
        </div>
      </div>
    </div>
  );
}

export default CameraPlacementEditor;
