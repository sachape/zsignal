// Format Réseaux — création d'un clip depuis 3 sources (moment, URL Twitch, upload).
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Sparkles, Link as LinkIcon, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useVideoSources, type VideoSource } from "@/hooks/useVideoSources";
import { useVideoLayoutPreset, presetHasValidFacecam } from "@/hooks/useVideoLayoutPreset";
import { LayoutPresetModal } from "./LayoutPresetModal";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Platform user id required to load the user's preset. */
  platformUserId: string | null;
  onCreated?: (contentItemId: string) => void;
}

type SourceTab = "moment" | "twitch" | "upload";

export function CreateClipDialog({ open, onOpenChange, platformUserId, onCreated }: Props) {
  const { user } = useAuth();
  const { preset } = useVideoLayoutPreset("twitch", platformUserId);
  const { uploadAndRegister, registerTwitchVod } = useVideoSources();

  const [tab, setTab] = useState<SourceTab>("twitch");
  const [twitchUrl, setTwitchUrl] = useState("");
  const [startSec, setStartSec] = useState(0);
  const [endSec, setEndSec] = useState(30);
  const [layoutMode, setLayoutMode] = useState<"facecam_top_gameplay_bottom" | "gameplay_only">("facecam_top_gameplay_bottom");
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploadedSource, setUploadedSource] = useState<VideoSource | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [presetModalOpen, setPresetModalOpen] = useState(false);

  const hasPreset = presetHasValidFacecam(preset);
  const needsPresetForLayout = layoutMode === "facecam_top_gameplay_bottom" && !hasPreset;

  const duration = Math.max(0, endSec - startSec);
  const durationWarning = duration > 60 || duration < 15;

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadPct(0);
    try {
      const src = await uploadAndRegister(file, setUploadPct);
      setUploadedSource(src);
      if (src.duration_seconds) setEndSec(Math.min(60, Math.round(src.duration_seconds)));
      toast.success("Vidéo importée.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec de l’upload.");
    } finally {
      setUploading(false);
    }
  };

  const handleGenerate = async () => {
    if (!user) return;
    if (duration < 5) { toast.error("Le clip doit faire au moins 5 secondes."); return; }
    if (duration > 180) { toast.error("Le clip ne peut pas dépasser 180 secondes."); return; }
    if (needsPresetForLayout) {
      toast.error("Configure d’abord ta caméra pour ce layout.");
      return;
    }

    setSubmitting(true);
    try {
      let videoSource: VideoSource | null = uploadedSource;
      let sourceType = "twitch_vod";
      let sourceUrl: string | null = null;
      let sourceStoragePath: string | null = null;

      if (tab === "twitch") {
        if (!twitchUrl.trim()) throw new Error("Colle une URL Twitch VOD.");
        videoSource = await registerTwitchVod(twitchUrl.trim());
        sourceType = "twitch_vod";
        sourceUrl = twitchUrl.trim();
      } else if (tab === "upload") {
        if (!videoSource) throw new Error("Importe une vidéo d’abord.");
        sourceType = "storage_url";
        sourceStoragePath = videoSource.storage_path;
      } else {
        // moment proposé : à brancher quand l'utilisateur sélectionne depuis la liste — V1 utilise la même UI
        throw new Error("Sélectionne un moment dans la liste pour cette source.");
      }

      // Create content item.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: item, error: itemErr } = await (supabase as any)
        .from("creator_content_items")
        .insert({
          user_id: user.id,
          platform: "youtube_shorts",
          title: tab === "twitch" ? "Clip depuis VOD Twitch" : "Clip depuis vidéo importée",
          status: "to_generate",
          priority: "medium",
          source_platform: tab === "twitch" ? "twitch" : "manual",
          source_video_url: sourceUrl,
          source_start_time: startSec,
          source_end_time: endSec,
          source_duration: duration,
          video_source_id: videoSource?.id ?? null,
          output_format: "vertical_9_16",
          layout_type: layoutMode,
          hashtags: [],
        })
        .select()
        .single();
      if (itemErr || !item) throw new Error(itemErr?.message || "Création du content item échouée.");

      const { error: jobErr } = await supabase.functions.invoke("clip-job-create", {
        body: {
          content_item_id: item.id,
          source_type: sourceType,
          source_url: sourceUrl,
          source_storage_path: sourceStoragePath,
          start_time_seconds: startSec,
          end_time_seconds: endSec,
          output_format: "vertical_9_16",
          layout_type: layoutMode,
          layout_preset_id: layoutMode === "facecam_top_gameplay_bottom" ? preset?.id : null,
          video_source_id: videoSource?.id ?? null,
        },
      });
      if (jobErr) throw new Error(jobErr.message);

      toast.success("Génération lancée. Retrouve ton clip dans la file de contenus.");
      onCreated?.(item.id);
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec de la création du clip.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Créer un clip</DialogTitle>
            <DialogDescription>
              Transforme n’importe quelle VOD ou vidéo en clip vertical prêt pour TikTok, Reels et Shorts.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={tab} onValueChange={(v) => setTab(v as SourceTab)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="moment" className="gap-2"><Sparkles className="h-3.5 w-3.5" />Moment proposé</TabsTrigger>
              <TabsTrigger value="twitch" className="gap-2"><LinkIcon className="h-3.5 w-3.5" />URL Twitch VOD</TabsTrigger>
              <TabsTrigger value="upload" className="gap-2"><Upload className="h-3.5 w-3.5" />Importer</TabsTrigger>
            </TabsList>

            <TabsContent value="moment" className="space-y-2 pt-3">
              <p className="text-xs text-muted-foreground">
                Sélectionne un moment proposé depuis la page Clips ou le dernier live pour générer un clip vertical à partir de la VOD détectée.
              </p>
            </TabsContent>

            <TabsContent value="twitch" className="space-y-3 pt-3">
              <div>
                <Label>URL de la VOD Twitch</Label>
                <Input
                  placeholder="https://www.twitch.tv/videos/123456789"
                  value={twitchUrl}
                  onChange={(e) => setTwitchUrl(e.target.value)}
                />
              </div>
            </TabsContent>

            <TabsContent value="upload" className="space-y-3 pt-3">
              {!uploadedSource ? (
                <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-border/60 bg-card/40 p-6 text-center">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span className="text-sm font-medium">Importer une vidéo</span>
                  <span className="text-xs text-muted-foreground">MP4, MOV ou WebM — 500 Mo max</span>
                  <input
                    type="file"
                    accept="video/mp4,video/quicktime,video/webm,video/x-matroska"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                    disabled={uploading}
                  />
                  {uploading && (
                    <div className="w-full pt-2">
                      <Progress value={uploadPct} />
                      <p className="mt-1 text-xs text-muted-foreground">Upload en cours… {uploadPct}%</p>
                    </div>
                  )}
                </label>
              ) : (
                <div className="rounded-lg border border-border/60 bg-card/40 p-3 text-xs">
                  <div className="font-medium text-foreground">{uploadedSource.original_filename}</div>
                  <div className="text-muted-foreground">
                    {uploadedSource.duration_seconds ? `${Math.round(uploadedSource.duration_seconds)}s · ` : ""}
                    {uploadedSource.width}×{uploadedSource.height}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <Label>Début (secondes)</Label>
              <Input type="number" min={0} value={startSec} onChange={(e) => setStartSec(Math.max(0, Number(e.target.value)))} />
            </div>
            <div>
              <Label>Fin (secondes)</Label>
              <Input type="number" min={startSec + 5} value={endSec} onChange={(e) => setEndSec(Math.max(startSec + 5, Number(e.target.value)))} />
            </div>
          </div>

          {durationWarning && duration > 0 && (
            <p className="text-xs text-amber-400">
              Pour les réseaux, vise un clip entre 15 et 60 secondes (actuellement {duration}s).
            </p>
          )}

          <div className="space-y-2 rounded-md border border-border/40 bg-muted/20 p-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">Format réseaux sociaux 9:16</span>
              <span className="text-muted-foreground">1080 × 1920</span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={layoutMode === "facecam_top_gameplay_bottom" ? "default" : "outline"}
                onClick={() => setLayoutMode("facecam_top_gameplay_bottom")}
                className="flex-1"
              >
                Caméra haut / jeu bas
              </Button>
              <Button
                size="sm"
                variant={layoutMode === "gameplay_only" ? "default" : "outline"}
                onClick={() => setLayoutMode("gameplay_only")}
                className="flex-1"
              >
                Gameplay seul
              </Button>
            </div>
            {needsPresetForLayout && (
              <div className="space-y-2 rounded border border-amber-500/40 bg-amber-500/10 p-2 text-amber-200">
                <p>Configure ta caméra pour générer un clip vertical avec ton visage en haut et le jeu en bas.</p>
                <Button size="sm" variant="secondary" onClick={() => setPresetModalOpen(true)}>
                  Configurer ma caméra
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button onClick={handleGenerate} disabled={submitting || needsPresetForLayout}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Générer le clip
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LayoutPresetModal
        open={presetModalOpen}
        onOpenChange={setPresetModalOpen}
        platformUserId={platformUserId}
      />
    </>
  );
}
