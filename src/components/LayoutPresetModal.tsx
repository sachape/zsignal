// Format Réseaux — modale "Configurer ma caméra".
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { BoxSelector, type BoxRect } from "./BoxSelector";
import { useVideoLayoutPreset, type VideoLayoutPreset } from "@/hooks/useVideoLayoutPreset";
import { Loader2, Upload } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platformUserId: string | null;
  onSaved?: (preset: VideoLayoutPreset) => void;
}

const DEFAULT_W = 1920;
const DEFAULT_H = 1080;

export function LayoutPresetModal({ open, onOpenChange, platformUserId, onSaved }: Props) {
  const { preset, savePreset } = useVideoLayoutPreset("twitch", platformUserId);
  const [frameUrl, setFrameUrl] = useState<string | null>(null);
  const [sourceW, setSourceW] = useState(DEFAULT_W);
  const [sourceH, setSourceH] = useState(DEFAULT_H);
  const [box, setBox] = useState<BoxRect | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!preset) return;
    setSourceW(preset.source_reference_width || DEFAULT_W);
    setSourceH(preset.source_reference_height || DEFAULT_H);
    if (preset.facecam_x !== null && preset.facecam_width !== null) {
      setBox({
        x: preset.facecam_x as number,
        y: preset.facecam_y as number,
        w: preset.facecam_width as number,
        h: preset.facecam_height as number,
      });
    }
  }, [preset]);

  const handleFrameUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setSourceW(img.naturalWidth);
      setSourceH(img.naturalHeight);
      setFrameUrl(url);
    };
    img.src = url;
  };

  const handleSave = async () => {
    if (!box) {
      toast.error("Place ta zone caméra sur la frame.");
      return;
    }
    setSaving(true);
    try {
      const saved = await savePreset({
        layout_type: "facecam_top_gameplay_bottom",
        facecam: box,
        source_reference_width: sourceW,
        source_reference_height: sourceH,
      });
      toast.success("Format sauvegardé. Tes prochains clips utiliseront ce layout.");
      if (saved) onSaved?.(saved);
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Configurer mon format réseaux</DialogTitle>
          <DialogDescription>
            Sélectionne l’emplacement de ta caméra une seule fois. Streamnco l’utilisera pour générer tes prochains clips au format réseaux (1080×1920).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!frameUrl ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border/60 bg-card/40 p-8 text-center">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Importe une capture d’écran de ton stream (frame représentative) pour positionner ta caméra.
              </p>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFrameUpload(e.target.files[0])}
                />
                <span className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                  Choisir une image
                </span>
              </label>
            </div>
          ) : (
            <BoxSelector
              imageUrl={frameUrl}
              sourceWidth={sourceW}
              sourceHeight={sourceH}
              value={box}
              onChange={setBox}
            />
          )}

          {frameUrl && (
            <div className="grid grid-cols-4 gap-3 text-xs">
              <Field label="X" value={box?.x ?? 0} />
              <Field label="Y" value={box?.y ?? 0} />
              <Field label="Largeur" value={box?.w ?? 0} />
              <Field label="Hauteur" value={box?.h ?? 0} />
            </div>
          )}

          <div className="rounded-md border border-border/40 bg-muted/20 p-3 text-xs text-muted-foreground">
            Ton clip final sera composé : caméra dans la zone haute (1080×480) + gameplay recadré dans la zone basse (1080×1440).
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving || !box}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sauvegarder mon format
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Input value={Math.round(value)} readOnly className="h-8 text-xs" />
    </div>
  );
}
