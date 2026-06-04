import { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, Loader2, FileVideo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { ContentItem } from "@/hooks/useContentItems";

interface Props {
  item: ContentItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded: (patch: Partial<ContentItem>) => Promise<void> | void;
}

const BUCKET = "creator-social-media";
const MAX_SIZE = 200 * 1024 * 1024; // 200 MB

export default function ManualMediaUploadDialog({ item, open, onOpenChange, onUploaded }: Props) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  function pick() { inputRef.current?.click(); }

  async function handleUpload() {
    if (!user || !file) return;
    if (file.size > MAX_SIZE) {
      toast.error("Fichier trop volumineux (max 200 Mo)");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${user.id}/content-items/${item.id}/manual-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw new Error(upErr.message);

      // Short-lived signed URL just for the immediate preview. The permanent
      // pointer is the (bucket, path) tuple — a fresh signed URL is generated
      // on-demand later via resolveFreshMediaUrl().
      const { data: signed, error: sErr } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, 60 * 60); // 1h preview
      if (sErr) throw new Error(sErr.message);

      await onUploaded({
        generated_video_url: signed.signedUrl,
        generated_video_storage_bucket: BUCKET,
        generated_video_storage_path: path,
        generation_status: "succeeded",
        generation_error: null,
        source_platform: "manual",
        status: item.status === "idea" || item.status === "to_generate" || item.status === "to_produce"
          ? "ready"
          : item.status,
      });
      toast.success("Média importé");
      setFile(null);
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur upload");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!uploading) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" /> Importer un média
          </DialogTitle>
          <DialogDescription>
            Tu as déjà monté ton clip ailleurs&nbsp;? Importe-le directement, sans passer par la génération.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <input
            ref={inputRef}
            type="file"
            accept="video/*,image/*"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />

          <button
            type="button"
            onClick={pick}
            className="flex w-full flex-col items-center gap-2 rounded-md border border-dashed border-border bg-muted/20 px-4 py-6 text-center transition hover:border-primary/60"
          >
            <FileVideo className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              {file ? file.name : "Choisir un fichier vidéo ou image"}
            </span>
            <span className="text-[11px] text-muted-foreground">
              Format vidéo (MP4, MOV) ou image. Max 200 Mo.
            </span>
          </button>

          {file && (
            <div className="rounded-md border border-border/60 bg-background/40 p-2 text-[11px] text-muted-foreground">
              <Label className="text-[10px] uppercase tracking-wide">Fichier</Label>
              <p className="mt-1 truncate text-foreground">{file.name}</p>
              <p className="opacity-80">
                {(file.size / 1024 / 1024).toFixed(1)} Mo · {file.type || "type inconnu"}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            Annuler
          </Button>
          <Button onClick={handleUpload} disabled={!file || uploading}>
            {uploading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-1.5 h-3.5 w-3.5" />}
            Importer le média
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
