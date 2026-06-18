// V3D — Dialog to upload a source video (or paste a direct URL) and launch generation.
import { useEffect, useMemo, useState } from "react";
import { Loader2, Upload, AlertCircle, Wand2, Link as LinkIcon, FileVideo, Sparkles, ChevronDown, Captions, Camera, Check, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CaptionStylePreviewGrid, type CaptionStyle } from "@/components/clips/CaptionStylePreviewGrid";
import type { ContentItem } from "@/hooks/useContentItems";
import { detectTwitchUrl } from "@/lib/twitchUrl";
import { QuickCameraPicker } from "@/components/clips/QuickCameraPicker";
import { ManualFacecamPlacer, type NormalizedCrop } from "@/components/clips/ManualFacecamPlacer";

interface Props {
  item: ContentItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLaunched: () => void;
}

const MAX_BYTES = 500 * 1024 * 1024;
const ACCEPT = ".mp4,.mov,video/mp4,video/quicktime";
const FACECAM_PRESET_GEOMETRY_VERSION = 3;

type Mode = "upload" | "direct_url";

function reasonLabel(reason: string): string {
  switch (reason) {
    case "worker_not_configured": return "Génération vidéo bientôt disponible — le worker FFmpeg n'est pas encore déployé. Ta source et tes timestamps sont sauvegardés.";
    case "file_too_large": return `Fichier trop volumineux (max ${MAX_BYTES / 1024 / 1024} Mo).`;
    case "invalid_file_type": return "Format invalide. Utilise un fichier .mp4 ou .mov.";
    case "empty_file": return "Le fichier est vide.";
    case "invalid_source_url": return "URL source invalide. Doit pointer vers un fichier vidéo accessible.";
    case "invalid_timestamps":
    case "invalid_range":
    case "invalid_duration": return "Timestamps invalides. Durée requise : 5 à 180 secondes.";
    case "content_item_not_found": return "Contenu introuvable.";
    case "network": return "Erreur réseau. Réessaie.";
    case "sign_failed": return "Impossible de préparer l'upload.";
    case "upload_failed": return "Échec de l'upload de la source.";
    case "job_insert_failed": return "Échec de création du job. Réessaie.";
    case "active_job_exists": return "Une génération est déjà en cours. Attends la fin avant d’en lancer une autre.";
    case "quota_exceeded": return "Tu as atteint ta limite de clips générés ce mois-ci. Passe à un plan supérieur pour augmenter ton quota.";
    case "worker_no_callback": return "Le worker vidéo n’a pas répondu.";
    default: return "Échec. Réessaie.";
  }
}

function extractTwitchChannelLogin(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "twitch.tv" || host === "m.twitch.tv") {
      const clipMatch = u.pathname.match(/^\/([^/]+)\/clip\/[A-Za-z0-9_-]+/);
      if (clipMatch) return clipMatch[1].toLowerCase();
      // /<channel> live URL fallback
      const liveMatch = u.pathname.match(/^\/([A-Za-z0-9_]+)\/?$/);
      if (liveMatch && liveMatch[1] !== "videos") return liveMatch[1].toLowerCase();
    }
  } catch { /* ignore */ }
  return null;
}

const ClipGenerationDialog = ({ item, open, onOpenChange, onLaunched }: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [directUrl, setDirectUrl] = useState(item.source_video_url ?? "");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<"idle" | "uploading" | "creating">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // Auto-detection is the default. The advanced camera picker is opt-in.
  const [showAdvanced, setShowAdvanced] = useState(false);
  // Auto subtitles are ON by default. The user can opt out.
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [captionsStyle, setCaptionsStyle] = useState<CaptionStyle>("clean");

  // ── Manual facecam placement (MVP) ──
  const [placerOpen, setPlacerOpen] = useState(false);
  const [manualCrop, setManualCrop] = useState<NormalizedCrop | null>(null);
  const [manualPresetSaved, setManualPresetSaved] = useState(false);
  const [manualCropSourceSize, setManualCropSourceSize] = useState<{ width: number; height: number } | null>(null);
  const [presetNeedsReplace, setPresetNeedsReplace] = useState(false);
  const [ignoreSavedFacecamPreset, setIgnoreSavedFacecamPreset] = useState(false);

  const detectedLogin = useMemo(
    () => extractTwitchChannelLogin(directUrl) ?? extractTwitchChannelLogin(item.source_video_url ?? null),
    [directUrl, item.source_video_url],
  );

  // On open / when channel changes, prefill from a stored preset for this channel.
  useEffect(() => {
    if (!open || !user || !detectedLogin) {
      if (open && !detectedLogin) setManualPresetSaved(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("user_facecam_presets")
        .select("crop_x, crop_y, crop_width, crop_height, source_width, source_height, is_enabled, geometry_version")
        .eq("user_id", user.id)
        .eq("twitch_channel_login", detectedLogin)
        .maybeSingle();
      if (cancelled) return;
      if (data?.is_enabled && data.geometry_version !== FACECAM_PRESET_GEOMETRY_VERSION) {
        setManualCrop(null);
        setManualPresetSaved(false);
        setPresetNeedsReplace(true);
        setIgnoreSavedFacecamPreset(true);
      } else if (data?.is_enabled && Number.isFinite(data.crop_width) && data.crop_width > 0) {
        setManualCrop({
          x: Number(data.crop_x),
          y: Number(data.crop_y),
          width: Number(data.crop_width),
          height: Number(data.crop_height),
        });
        setManualCropSourceSize({
          width: Number(data.source_width) || 1920,
          height: Number(data.source_height) || 1080,
        });
        setManualPresetSaved(true);
        setPresetNeedsReplace(false);
        setIgnoreSavedFacecamPreset(false);
      } else {
        setManualPresetSaved(false);
        setPresetNeedsReplace(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, user, detectedLogin]);

  const start = item.source_start_time;
  const end = item.source_end_time;
  const validTimestamps = start != null && end != null && end > start && (end - start) >= 5 && (end - start) <= 180;

  function reset() {
    setFile(null); setDirectUrl(item.source_video_url ?? "");
    setBusy(false); setPhase("idle"); setProgress(0); setError(null);
    setManualCrop(null); setManualPresetSaved(false);
    setManualCropSourceSize(null); setPresetNeedsReplace(false); setIgnoreSavedFacecamPreset(false);
  }

  function handleFile(f: File | null) {
    setError(null);
    if (!f) { setFile(null); return; }
    const okType = ["video/mp4", "video/quicktime"].includes(f.type) || /\.(mp4|mov)$/i.test(f.name);
    if (!okType) { setError("invalid_file_type"); return; }
    if (f.size === 0) { setError("empty_file"); return; }
    if (f.size > MAX_BYTES) { setError("file_too_large"); return; }
    setFile(f);
  }

  async function getToken(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  async function uploadSourceFile(token: string): Promise<{ source_type: "upload"; source_storage_path: string } | null> {
    if (!file) { setError("invalid_file_type"); return null; }
    setPhase("uploading");

    // 1) Ask edge function for a signed upload URL.
    const urlEndpoint = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/clip-source-upload-url`;
    const signRes = await fetch(urlEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        filename: file.name,
        size_bytes: file.size,
        content_item_id: item.id,
      }),
    });
    const signJson = await signRes.json().catch(() => ({}));
    if (!signRes.ok || !signJson?.success) {
      setError(signJson?.error ?? "sign_failed");
      return null;
    }

    // 2) PUT the file to the signed URL with XHR for progress.
    const path: string = signJson.path;
    const signedUrl: string = signJson.signed_url;

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", signedUrl, true);
      xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable) setProgress(Math.round((evt.loaded / evt.total) * 100));
      };
      xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve() : reject(new Error("upload_failed"));
      xhr.onerror = () => reject(new Error("network"));
      xhr.send(file);
    });

    return { source_type: "upload", source_storage_path: path };
  }

  async function handleLaunch() {
    if (!validTimestamps) {
      setError("invalid_timestamps");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const token = await getToken();
      if (!token) { setError("network"); setBusy(false); return; }

      let sourcePayload: Record<string, unknown> = {};
      if (mode === "upload") {
        const uploaded = await uploadSourceFile(token);
        if (!uploaded) { setBusy(false); setPhase("idle"); return; }
        sourcePayload = uploaded;
      } else {
        const trimmed = directUrl.trim();
        // Detect Twitch first (VOD or Clip). A Twitch URL must NEVER be
        // sent as direct_url — the worker would fetch HTML and ffmpeg
        // would fail with "moov atom not found".
        const tw = detectTwitchUrl(trimmed);
        if (tw.kind === "twitch_clip" && tw.normalizedUrl) {
          sourcePayload = { source_type: "twitch_clip", source_url: tw.normalizedUrl };
        } else if (tw.kind === "twitch_vod" && tw.normalizedUrl) {
          sourcePayload = { source_type: "twitch_vod", source_url: tw.normalizedUrl };
        } else {
          try {
            const u = new URL(trimmed);
            if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error();
            sourcePayload = { source_type: "direct_url", source_url: trimmed };
          } catch { setError("invalid_source_url"); setBusy(false); return; }
        }
      }

      setPhase("creating");

      const createRes = await fetch(
        `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/clip-job-create`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            content_item_id: item.id,
            ...sourcePayload,
            start_time_seconds: start,
            end_time_seconds: end,
            // Opt-in only: a stored preset is used ONLY when the user explicitly
            // opened "Forcer manuellement". Default flow = pure auto-detect.
            use_manual_layout: showAdvanced,
            // MVP — manual facecam placement. Takes priority over auto-detect.
            manual_facecam_crop: manualCrop ?? undefined,
            detector_strategy: manualCrop ? "manual_override" : undefined,
            twitch_channel_login: detectedLogin ?? undefined,
            save_facecam_preset: manualCrop ? manualPresetSaved : false,
            ignore_saved_facecam_preset: ignoreSavedFacecamPreset,
            manual_crop_source_width: manualCropSourceSize?.width,
            manual_crop_source_height: manualCropSourceSize?.height,
            captions_enabled: captionsEnabled,
            captions_language: "fr",
            captions_style: captionsStyle,
          }),
        },
      );
      const createJson = await createRes.json().catch(() => ({}));
      if (createRes.status === 503 && createJson?.reason === "worker_not_configured") {
        setError("worker_not_configured");
        setBusy(false); setPhase("idle");
        onLaunched(); // refetch so generation_status=unavailable is shown
        return;
      }
      if (!createRes.ok || !createJson?.success) {
        setError(createJson?.error ?? "job_insert_failed");
        setBusy(false); setPhase("idle");
        return;
      }

      toast.success("Génération lancée", {
        description: "Suis l'avancement dans la queue.",
        action: { label: "Voir la queue", onClick: () => navigate("/content-queue") },
      });
      onLaunched();
      onOpenChange(false);
      reset();
    } catch {
      setError("network");
      setBusy(false); setPhase("idle");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" /> Générer le clip
          </DialogTitle>
          <DialogDescription>
            Streamnco découpe ton extrait via un worker FFmpeg externe et stocke le clip dans ton espace privé.
          </DialogDescription>
        </DialogHeader>

        {!validTimestamps && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
            <AlertCircle className="mr-1.5 inline h-3.5 w-3.5" />
            Ajoute d'abord une source et des timestamps valides (5–180 s) depuis « Modifier la source ».
          </div>
        )}

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button" disabled={busy}
              onClick={() => setMode("upload")}
              className={`rounded-md border p-3 text-left transition ${mode === "upload" ? "border-primary bg-primary/10" : "border-border bg-card hover:border-border/80"}`}
            >
              <FileVideo className="mb-1 h-4 w-4 text-primary" />
              <p className="text-xs font-semibold text-foreground">Upload source</p>
              <p className="text-[10px] text-muted-foreground">Recommandé. Max 500 Mo, .mp4 / .mov.</p>
            </button>
            <button
              type="button" disabled={busy}
              onClick={() => setMode("direct_url")}
              className={`rounded-md border p-3 text-left transition ${mode === "direct_url" ? "border-primary bg-primary/10" : "border-border bg-card hover:border-border/80"}`}
            >
              <LinkIcon className="mb-1 h-4 w-4 text-primary" />
              <p className="text-xs font-semibold text-foreground">URL directe</p>
              <p className="text-[10px] text-muted-foreground">Fichier vidéo accessible publiquement.</p>
            </button>
          </div>

          {mode === "upload" ? (
            <div className="space-y-1.5">
              <Label className="text-xs">Fichier vidéo (max {MAX_BYTES / 1024 / 1024} Mo)</Label>
              <Input type="file" accept={ACCEPT} disabled={busy}
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
              {file && (
                <p className="text-[11px] text-muted-foreground">
                  {file.name} · {(file.size / 1024 / 1024).toFixed(1)} Mo
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs">URL vidéo (.mp4)</Label>
              <Input
                type="url" disabled={busy}
                value={directUrl} onChange={(e) => setDirectUrl(e.target.value)}
                placeholder="https://example.com/clip.mp4"
              />
              <p className="text-[10px] text-muted-foreground">
                Les VOD Twitch/YouTube ne sont pas téléchargeables directement. L'upload reste le parcours le plus fiable.
              </p>
            </div>
          )}

          {busy && phase === "uploading" && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Upload de la source vers Streamnco…</span>
                <span className="tabular-nums">{progress}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {busy && phase === "creating" && (
            <p className="text-[11px] text-muted-foreground">
              <Loader2 className="mr-1.5 inline h-3 w-3 animate-spin" />
              Création du job…
            </p>
          )}

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2.5 text-[11px] text-destructive">
              <AlertCircle className="mr-1.5 inline h-3.5 w-3.5" />
              {reasonLabel(error)}
            </div>
          )}

          {/* MVP — Manual facecam placement (primary CTA). */}
          <div className="rounded-md border border-border bg-card p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <Camera className="mt-0.5 h-3.5 w-3.5 text-primary" />
                <div>
                  <p className="text-xs font-medium text-foreground">Placer ma caméra</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {manualCrop
                      ? manualPresetSaved
                        ? "Caméra sauvegardée pour cette chaîne. Elle sera utilisée pour ce clip."
                        : "Zone caméra sélectionnée pour ce clip."
                      : presetNeedsReplace
                        ? "Position caméra à replacer. L'ancienne position ne sera pas réutilisée."
                      : "Sélectionne manuellement la zone webcam. Plus fiable que la détection auto."}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {manualCrop && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
                    <Check className="h-3 w-3" /> Active
                  </span>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant={manualCrop ? "outline" : "default"}
                  className="gap-1 text-xs"
                  onClick={() => setPlacerOpen(true)}
                  disabled={busy}
                >
                  {manualCrop ? <><Pencil className="h-3 w-3" /> Modifier</> : <><Camera className="h-3 w-3" /> Placer ma caméra</>}
                </Button>
                {manualCrop && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      setManualCrop(null);
                      setManualPresetSaved(false);
                      setManualCropSourceSize(null);
                      setIgnoreSavedFacecamPreset(true);
                      if (detectedLogin && user) {
                        void (supabase as any)
                          .from("user_facecam_presets")
                          .update({ is_enabled: false })
                          .eq("user_id", user.id)
                          .eq("twitch_channel_login", detectedLogin);
                      }
                    }}
                    disabled={busy}
                  >
                    Réinitialiser
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="flex items-center gap-2 text-xs font-medium text-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Détection automatique de la facecam
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {manualCrop
                ? "Désactivée — ta zone manuelle sera utilisée."
                : "Streamnco repère ta caméra dans la vidéo et la place en haut du clip vertical. Si aucune caméra n'est détectée, le rendu sort en gameplay seul."}
            </p>
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="mt-2 inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
            >
              <ChevronDown className={`h-3 w-3 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
              {showAdvanced ? "Masquer" : "Forcer manuellement la position de la caméra (avancé)"}
            </button>
            {showAdvanced && (
              <div className="mt-3 border-t border-border/60 pt-3">
                <QuickCameraPicker onReady={() => { /* optional override saved server-side */ }} />
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-md border border-border bg-card p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <Captions className="mt-0.5 h-3.5 w-3.5 text-primary" />
                <div>
                  <p className="text-xs font-medium text-foreground">Sous-titres automatiques</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Ajoute automatiquement les sous-titres quand tu parles. Incrustés dans la vidéo.
                  </p>
                </div>
              </div>
              <Switch
                checked={captionsEnabled}
                onCheckedChange={setCaptionsEnabled}
                disabled={busy}
                aria-label="Activer les sous-titres automatiques"
              />
            </div>

            {captionsEnabled && (
              <div className="space-y-2 border-t border-border/60 pt-3">
                <Label className="text-xs">Style des sous-titres</Label>
                <CaptionStylePreviewGrid
                  value={captionsStyle}
                  onChange={setCaptionsStyle}
                  disabled={busy}
                />
                <p className="text-[10px] text-muted-foreground">
                  Aperçu animé du rendu réel dans ton clip.
                </p>
              </div>

            )}
          </div>

        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Annuler</Button>
          <Button
            onClick={handleLaunch}
            disabled={
              busy ||
              !validTimestamps ||
              (mode === "upload" ? !file : !directUrl.trim())
            }
          >
            {busy
              ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> En cours…</>
              : <><Upload className="mr-1.5 h-3.5 w-3.5" /> Lancer la génération</>}
          </Button>
        </DialogFooter>
      </DialogContent>

      <ManualFacecamPlacer
        open={placerOpen}
        onOpenChange={setPlacerOpen}
        initialCrop={manualCrop}
        channelLogin={detectedLogin}
        sourceUrl={mode === "direct_url" ? directUrl : item.source_video_url}
        hasSavedPreset={!!manualCrop && manualPresetSaved && !!detectedLogin}
        onResetSavedPreset={() => {
          setManualCrop(null);
          setManualPresetSaved(false);
          setManualCropSourceSize(null);
          setIgnoreSavedFacecamPreset(true);
          if (detectedLogin && user) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            void (supabase as any)
              .from("user_facecam_presets")
              .update({ is_enabled: false })
              .eq("user_id", user.id)
              .eq("twitch_channel_login", detectedLogin);
          }
        }}
        onValidate={({ crop, savePreset, channelLogin, sourceWidth, sourceHeight }) => {
          setManualCrop(crop);
          setManualPresetSaved(savePreset);
          setManualCropSourceSize(sourceWidth && sourceHeight ? { width: sourceWidth, height: sourceHeight } : null);
          setPresetNeedsReplace(false);
          setIgnoreSavedFacecamPreset(false);
          if (savePreset && channelLogin && user) {
            // Fire-and-forget upsert. RLS scopes to the current user.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            void (supabase as any)
              .from("user_facecam_presets")
              .upsert(
                {
                  user_id: user.id,
                  twitch_channel_login: channelLogin,
                  crop_x: crop.x,
                  crop_y: crop.y,
                  crop_width: crop.width,
                  crop_height: crop.height,
                  source_width: sourceWidth,
                  source_height: sourceHeight,
                  geometry_version: FACECAM_PRESET_GEOMETRY_VERSION,
                  is_enabled: true,
                  last_used_at: new Date().toISOString(),
                },
                { onConflict: "user_id,twitch_channel_login" },
              )
              .then(({ error }: { error: unknown }) => {
                if (error) {
                  console.error("[ClipGenerationDialog] preset upsert failed", error);
                  toast.error("Impossible de sauvegarder la position");
                } else {
                  toast.success("Caméra sauvegardée pour cette chaîne");
                }
              });
          } else {
            toast.success("Zone caméra appliquée pour ce clip");
          }
        }}
      />
    </Dialog>
  );
};

export default ClipGenerationDialog;
