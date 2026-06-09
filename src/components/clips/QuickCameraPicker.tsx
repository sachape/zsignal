// Inline quick camera placement step shown in the Clip Generation flow.
// HONESTY RULE: Streamnco never fakes a facecam. The user must either
// pick a real camera zone OR explicitly choose "gameplay seul".
import { useEffect, useState } from "react";
import { Loader2, Camera, MonitorPlay, Pencil, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { CameraPlacementEditor } from "@/components/clips/CameraPlacementEditor";

const REF_W = 1920;
const REF_H = 1080;
// Typical OBS overlay: ~480x360 (4:3) at corner.
const CAM_W = 480;
const CAM_H = 360;

type CornerId = "br" | "bl" | "tr" | "tl";

const CORNERS: { id: CornerId; label: string; x: number; y: number }[] = [
  { id: "tl", label: "Haut gauche",  x: 0,             y: 0 },
  { id: "tr", label: "Haut droite",  x: REF_W - CAM_W, y: 0 },
  { id: "bl", label: "Bas gauche",   x: 0,             y: REF_H - CAM_H },
  { id: "br", label: "Bas droite",   x: REF_W - CAM_W, y: REF_H - CAM_H },
];

type Choice = { kind: "camera"; corner: CornerId } | { kind: "gameplay_only" } | null;

interface Props {
  onReady: (hasCamera: boolean) => void;
}

export function QuickCameraPicker({ onReady }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [hasSavedPreset, setHasSavedPreset] = useState(false);
  const [choice, setChoice] = useState<Choice>(null);
  const [saving, setSaving] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("creator_video_layout_presets")
        .select("facecam_x, facecam_width")
        .eq("user_id", user.id)
        .eq("platform", "twitch")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const ok = !!data && Number.isFinite(data.facecam_width) && (data.facecam_width ?? 0) > 0;
      setHasSavedPreset(ok);
      if (ok) onReady(true);
      setLoading(false);
    })();
  }, [user, onReady]);

  async function applyChoice(next: Choice) {
    if (!user || !next) return;
    setSaving(true);
    try {
      if (next.kind === "gameplay_only") {
        // Remove any stale preset so the backend falls back to gameplay_only.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("creator_video_layout_presets")
          .delete()
          .eq("user_id", user.id)
          .eq("platform", "twitch");
        setChoice(next);
        onReady(false);
        toast({ title: "Rendu gameplay seul", description: "Aucune caméra ne sera ajoutée." });
      } else {
        const corner = CORNERS.find((c) => c.id === next.corner)!;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from("creator_video_layout_presets")
          .upsert(
            {
              user_id: user.id,
              platform: "twitch",
              platform_user_id: user.id, // generic key when no Twitch link yet
              layout_type: "facecam_top_gameplay_bottom",
              facecam_x: corner.x,
              facecam_y: corner.y,
              facecam_width: CAM_W,
              facecam_height: CAM_H,
              source_reference_width: REF_W,
              source_reference_height: REF_H,
              output_width: 1080,
              output_height: 1920,
            },
            { onConflict: "user_id,platform,platform_user_id" },
          );
        if (error) throw error;
        setChoice(next);
        setHasSavedPreset(true);
        onReady(true);
        toast({ title: "Caméra positionnée", description: `Zone : ${corner.label}.` });
      }
    } catch (e) {
      console.error("[QuickCameraPicker] save failed", e);
      toast({ title: "Échec", description: "Impossible d'enregistrer le choix.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
        <Loader2 className="mr-1.5 inline h-3 w-3 animate-spin" /> Vérification du cadrage caméra…
      </div>
    );
  }

  if (hasSavedPreset && !choice) {
    return (
      <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-foreground">
            <Check className="h-3.5 w-3.5 text-primary" />
            Cadrage caméra prêt. Le clip sera <strong>caméra en haut, gameplay en bas</strong>.
          </div>
          <Button size="sm" variant="ghost" className="gap-1 text-xs" onClick={() => setEditorOpen(true)}>
            <Pencil className="h-3 w-3" /> Ajuster
          </Button>
        </div>
        <CameraEditorDialog open={editorOpen} onOpenChange={setEditorOpen} onSaved={() => onReady(true)} />
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-foreground">Où est ta caméra dans la vidéo ?</p>
          <p className="text-[11px] text-muted-foreground">
            Streamnco placera cette zone en haut du clip et le gameplay en bas. Si tu ne sélectionnes rien, le rendu sera gameplay seul.
          </p>
        </div>
        <Button size="sm" variant="ghost" className="gap-1 text-xs" onClick={() => setEditorOpen(true)}>
          <Pencil className="h-3 w-3" /> Ajuster précisément
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {CORNERS.map((c) => {
          const active = choice?.kind === "camera" && choice.corner === c.id;
          return (
            <button
              key={c.id}
              type="button"
              disabled={saving}
              onClick={() => applyChoice({ kind: "camera", corner: c.id })}
              className={cn(
                "flex flex-col items-center gap-1 rounded-md border p-2 text-[11px] transition",
                active ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card hover:border-border/80",
              )}
            >
              <CornerThumb corner={c.id} />
              <span>{c.label}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={() => applyChoice({ kind: "gameplay_only" })}
        className={cn(
          "flex w-full items-center justify-center gap-1.5 rounded-md border p-2 text-[11px] transition",
          choice?.kind === "gameplay_only"
            ? "border-primary bg-primary/10 text-foreground"
            : "border-border bg-card hover:border-border/80",
        )}
      >
        <MonitorPlay className="h-3.5 w-3.5" /> Pas de caméra — gameplay seul
      </button>

      <CameraEditorDialog open={editorOpen} onOpenChange={setEditorOpen} onSaved={() => onReady(true)} />
    </div>
  );
}

function CornerThumb({ corner }: { corner: CornerId }) {
  const pos: Record<CornerId, string> = {
    tl: "left-1 top-1",
    tr: "right-1 top-1",
    bl: "left-1 bottom-1",
    br: "right-1 bottom-1",
  };
  return (
    <div className="relative h-8 w-12 rounded-sm border border-border/60 bg-muted">
      <div className={cn("absolute h-2.5 w-3 rounded-sm bg-primary/80", pos[corner])}>
        <Camera className="h-full w-full p-0.5 text-primary-foreground" />
      </div>
    </div>
  );
}

function CameraEditorDialog({
  open, onOpenChange, onSaved,
}: { open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ajuster la zone caméra</DialogTitle>
          <DialogDescription>
            Place le cadre sur ta caméra dans une frame de ton dernier live.
          </DialogDescription>
        </DialogHeader>
        <CameraPlacementEditor
          onSaved={() => { onSaved(); onOpenChange(false); }}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
