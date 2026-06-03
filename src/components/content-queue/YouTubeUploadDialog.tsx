import { useState } from "react";
import { Loader2, Upload, ExternalLink, AlertCircle, Video, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { ContentItem, YouTubePrivacyStatus } from "@/hooks/useContentItems";

interface Props {
  item: ContentItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  youtubeConnected: boolean;
  onReconnect: () => void;
  onUploaded: () => void;
}

const MAX_BYTES = 128 * 1024 * 1024;
const RECOMMENDED_BYTES = 50 * 1024 * 1024;
const ACCEPT = ".mp4,.mov,video/mp4,video/quicktime";

function formatBytes(b: number) {
  if (b < 1024) return `${b} o`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} ko`;
  return `${(b / 1024 / 1024).toFixed(1)} Mo`;
}

function reasonMessage(reason: string | undefined): { label: string; reconnect?: boolean } {
  switch (reason) {
    case "missing_scope":
      return { label: "Reconnecte YouTube pour autoriser l'upload vidéo.", reconnect: true };
    case "token_expired":
      return { label: "Session YouTube expirée. Reconnecte ton compte.", reconnect: true };
    case "youtube_not_connected":
      return { label: "YouTube n'est pas connecté.", reconnect: true };
    case "file_too_large":
      return { label: `Fichier trop volumineux (max ${MAX_BYTES / 1024 / 1024} Mo).` };
    case "invalid_file_type":
      return { label: "Format invalide. Utilise un fichier .mp4 ou .mov." };
    case "empty_file":
      return { label: "Le fichier est vide." };
    case "quota_exceeded":
      return { label: "Quota YouTube atteint. Réessaie plus tard." };
    case "upload_limit":
      return { label: "Limite d'upload YouTube atteinte pour ce compte." };
    case "server_misconfigured":
      return { label: "Configuration serveur YouTube manquante." };
    default:
      return { label: "Échec de l'upload YouTube. Réessaie." };
  }
}

const YouTubeUploadDialog = ({
  item, open, onOpenChange, youtubeConnected, onReconnect, onUploaded,
}: Props) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description ?? "");
  const [tagsRaw, setTagsRaw] = useState(item.hashtags.join(", "));
  const [privacy, setPrivacy] = useState<YouTubePrivacyStatus>("private");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"idle" | "uploading" | "transferring">("idle");
  const [errorReason, setErrorReason] = useState<string | null>(null);
  const [result, setResult] = useState<{ url: string; privacy: string } | null>(null);

  function reset() {
    setFile(null);
    setUploading(false);
    setProgress(0);
    setPhase("idle");
    setErrorReason(null);
    setResult(null);
  }

  function handleFile(f: File | null) {
    setErrorReason(null);
    if (!f) { setFile(null); return; }
    const okType = ["video/mp4", "video/quicktime"].includes(f.type) || /\.(mp4|mov)$/i.test(f.name);
    if (!okType) { setErrorReason("invalid_file_type"); return; }
    if (f.size > MAX_BYTES) { setErrorReason("file_too_large"); return; }
    if (f.size === 0) { setErrorReason("empty_file"); return; }
    setFile(f);
  }

  async function startUpload() {
    if (!file) { setErrorReason("invalid_file_type"); return; }
    setUploading(true);
    setErrorReason(null);
    setProgress(0);
    setPhase("uploading");

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) {
        setErrorReason("token_expired");
        setUploading(false);
        setPhase("idle");
        return;
      }

      const form = new FormData();
      form.append("content_item_id", item.id);
      form.append("file", file, file.name);
      form.append("title", title.trim().slice(0, 100));
      form.append("description", description);
      form.append("tags", tagsRaw);
      form.append("privacy_status", privacy);

      const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/youtube-upload-video`;

      // XHR so we can track upload progress (frontend -> edge function).
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url, true);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable) {
          const pct = Math.round((evt.loaded / evt.total) * 100);
          setProgress(pct);
          // Once the file has reached the edge function, we wait for the
          // edge -> YouTube transfer (no progress event available).
          if (pct >= 100) setPhase("transferring");
        }
      };

      const responseText: string = await new Promise((resolve, reject) => {
        xhr.onload = () => resolve(xhr.responseText);
        xhr.onerror = () => reject(new Error("network"));
        xhr.ontimeout = () => reject(new Error("timeout"));
        xhr.send(form);
      });

      let json: { success?: boolean; reason?: string; video_url?: string; privacy?: string } = {};
      try { json = JSON.parse(responseText); } catch { /* */ }

      // Only treat as success when YouTube actually returned a video URL.
      if (xhr.status >= 200 && xhr.status < 300 && json.success === true && typeof json.video_url === "string" && json.video_url.length > 0) {
        setResult({ url: json.video_url, privacy: json.privacy ?? privacy });
        setProgress(100);
        setPhase("idle");
        toast.success("Vidéo uploadée sur YouTube");
        onUploaded();
      } else {
        setErrorReason(json.reason ?? "upload_failed");
        setPhase("idle");
      }
    } catch (e) {
      console.error("youtube upload error", e);
      setErrorReason("network");
      setPhase("idle");
    } finally {
      setUploading(false);
    }
  }

  const err = errorReason ? reasonMessage(errorReason) : null;

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-red-500" />
            Uploader sur YouTube
          </DialogTitle>
          <DialogDescription>
            Streamnco envoie le titre, la description, les tags et la confidentialité. Le fichier vidéo reste fourni par toi.
          </DialogDescription>
        </DialogHeader>

        {!youtubeConnected ? (
          <div className="space-y-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
            <p className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              YouTube n'est pas connecté. Connecte ton compte pour uploader des vidéos.
            </p>
            <Button size="sm" onClick={onReconnect}>
              Connecter YouTube
            </Button>
          </div>
        ) : result ? (
          <div className="space-y-4 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm">
            <p className="font-medium text-emerald-200">Upload terminé 🎉</p>
            <p className="text-xs text-emerald-200/80">
              Vidéo {result.privacy === "public" ? "publique" : result.privacy === "unlisted" ? "non listée" : "privée"} disponible sur YouTube.
            </p>
            <Button asChild size="sm" variant="outline">
              <a href={result.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1.5">
                Ouvrir sur YouTube <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Fichier vidéo (.mp4 ou .mov, max {MAX_BYTES / 1024 / 1024} Mo)</Label>
              <Input
                type="file"
                accept={ACCEPT}
                disabled={uploading}
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
              {file && (
                <p className="text-[11px] text-muted-foreground">
                  {file.name} · {formatBytes(file.size)}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Titre</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} disabled={uploading} />
              <p className="text-[10px] text-muted-foreground">{title.length}/100</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={5000} disabled={uploading} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Tags (séparés par virgule)</Label>
              <Input value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} placeholder="gaming, valorant, fr" disabled={uploading} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Confidentialité</Label>
              <Select value={privacy} onValueChange={(v) => setPrivacy(v as YouTubePrivacyStatus)} disabled={uploading}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Privée (toi seul)</SelectItem>
                  <SelectItem value="unlisted">Non listée (lien partagé)</SelectItem>
                  <SelectItem value="public">Publique</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {uploading && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Envoi en cours…</span>
                  <span className="tabular-nums">{progress}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            {err && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive-foreground">
                <p className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {err.label}
                </p>
                {err.reconnect && (
                  <Button size="sm" variant="outline" className="mt-2" onClick={onReconnect}>
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                    Reconnecter YouTube
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            {result ? "Fermer" : "Annuler"}
          </Button>
          {!result && youtubeConnected && (
            <Button onClick={startUpload} disabled={!file || uploading}>
              {uploading ? (
                <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Upload…</>
              ) : (
                <><Upload className="mr-1.5 h-3.5 w-3.5" /> Uploader</>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default YouTubeUploadDialog;
