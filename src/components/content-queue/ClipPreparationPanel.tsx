// Inline preparation panel for a Clip.
// Same UI as the legacy ClipGenerationDialog body but rendered inline on
// the Create page. The dialog wrapper (ClipGenerationDialog) reuses this
// component so the experience matches when triggered from the Queue.
import { useEffect, useMemo, useState } from "react";
import {
  Loader2, Upload, AlertCircle, Wand2, Link as LinkIcon, FileVideo,
  Captions, Camera, Check, Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CaptionStylePreviewGrid, type CaptionStyle } from "@/components/clips/CaptionStylePreviewGrid";
import type { ContentItem } from "@/hooks/useContentItems";
import { detectTwitchUrl } from "@/lib/twitchUrl";
import { ManualFacecamPlacer, type NormalizedCrop } from "@/components/clips/ManualFacecamPlacer";

export interface ClipPreparationPanelProps {
  item: ContentItem;
  onLaunched: () => void;
  /** Inline = rendered on the Create page. Dialog = rendered inside a modal. */
  variant?: "inline" | "dialog";
  /** Only used in dialog mode to close the parent. */
  onCancel?: () => void;
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
    case "active_job_exists": return "Une génération est déjà en cours. Attends la fin avant d'en lancer une autre.";
    case "quota_exceeded": return "Tu as atteint ta limite de clips générés ce mois-ci. Passe à un plan supérieur pour augmenter ton quota.";
    case "worker_no_callback": return "Le worker vidéo n'a pas répondu.";
    case "missing_title": return "Ajoute un titre pour ton clip.";
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
      const liveMatch = u.pathname.match(/^\/([A-Za-z0-9_]+)\/?$/);
      if (liveMatch && liveMatch[1] !== "videos") return liveMatch[1].toLowerCase();
    }
  } catch { /* ignore */ }
  return null;
}

function formatSourceDuration(start: number | null, end: number | null): string | null {
  if (start == null || end == null || end <= start) return null;
  const duration = Math.round(end - start);
  if (duration < 60) return `${duration}s`;
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  return seconds > 0 ? `${minutes}min ${seconds}s` : `${minutes}min`;
}

export const ClipPreparationPanel = ({
  item, onLaunched, variant = "inline", onCancel,
}: ClipPreparationPanelProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const initialMode: Mode = item.source_video_url ? "direct_url" : "upload";
  const [mode, setMode] = useState<Mode>(initialMode);
  const [file, setFile] = useState<File | null>(null);
  const [directUrl, setDirectUrl] = useState(item.source_video_url ?? "");
  const [editingUrl, setEditingUrl] = useState(false);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<"idle" | "uploading" | "creating">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [localTitle, setLocalTitle] = useState(item.title ?? "");
  const [launched, setLaunched] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [captionsStyle, setCaptionsStyle] = useState<CaptionStyle>("clean");

  useEffect(() => {
    setMode(item.source_video_url ? "direct_url" : "upload");
    setDirectUrl(item.source_video_url ?? "");
    setLocalTitle(item.title ?? "");
    setLaunched(false);
    setEditingUrl(false);
  }, [item.id, item.source_video_url, item.title]);

  const [placerOpen, setPlacerOpen] = useState(false);
  const [manualCrop, setManualCrop] = useState<NormalizedCrop | null>(null);
  const [manualPresetSaved, setManualPresetSaved] = useState(false);
  const [manualCropSourceSize, setManualCropSourceSize] = useState<{ width: number; height: number } | null>(null);
  const [presetNeedsReplace, setPresetNeedsReplace] = useState(false);
  const [ignoreSavedFacecamPreset, setIgnoreSavedFacecamPreset] = useState(false);

  const detectedLogin = useMemo(
    () => item.source_channel_login ?? extractTwitchChannelLogin(directUrl) ?? extractTwitchChannelLogin(item.source_video_url ?? null),
    [directUrl, item.source_channel_login, item.source_video_url],
  );

  useEffect(() => {
    if (!user || !detectedLogin) {
      if (!detectedLogin) setManualPresetSaved(false);
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
  }, [user, detectedLogin]);

  const start = item.source_start_time;
  const end = item.source_end_time;
  const validTimestamps = start != null && end != null && end > start && (end - start) >= 5 && (end - start) <= 180;

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
    const urlEndpoint = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/clip-source-upload-url`;
    const signRes = await fetch(urlEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ filename: file.name, size_bytes: file.size, content_item_id: item.id }),
    });
    const signJson = await signRes.json().catch(() => ({}));
    if (!signRes.ok || !signJson?.success) {
      setError(signJson?.error ?? "sign_failed");
      return null;
    }
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
    if (!validTimestamps) { setError("invalid_timestamps"); return; }
    setError(null);
    setBusy(true);
    try {
      const token = await getToken();
      if (!token) { setError("network"); setBusy(false); return; }
      const title = localTitle.trim();
      if (!title) { setError("missing_title"); setBusy(false); return; }

      let sourcePayload: Record<string, unknown> = {};
      if (mode === "upload") {
        const uploaded = await uploadSourceFile(token);
        if (!uploaded) { setBusy(false); setPhase("idle"); return; }
        sourcePayload = uploaded;
      } else {
        const trimmed = directUrl.trim();
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

      if (title !== item.title) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: titleError } = await (supabase as any)
          .from("creator_content_items")
          .update({ title })
          .eq("id", item.id)
          .eq("user_id", user?.id);
        if (titleError) {
          setError("job_insert_failed");
          setBusy(false); setPhase("idle");
          return;
        }
      }

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
            use_manual_layout: Boolean(manualCrop),
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
        onLaunched();
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
      setLaunched(true);
      onLaunched();
      setBusy(false);
      setPhase("idle");
    } catch {
      setError("network");
      setBusy(false); setPhase("idle");
    }
  }

  const twitchInfo = detectTwitchUrl(directUrl || "");
  const sourceLabel =
    twitchInfo.kind === "twitch_clip" ? "Clip Twitch détecté"
    : twitchInfo.kind === "twitch_vod" ? "VOD Twitch détectée"
    : directUrl ? "URL vidéo"
    : null;
  const durationLabel = formatSourceDuration(start, end);

  const launchDisabled =
    busy || !validTimestamps || (mode === "upload" ? !file : !directUrl.trim());

  const containerClass = variant === "inline"
    ? "rounded-lg border border-primary/30 bg-card/60"
    : "flex flex-col";

  return (
    <div className={containerClass}>
      {variant === "inline" && (
        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
          <div className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">Configurer ton clip</p>
              <p className="text-[11px] text-muted-foreground">
                Source détectée. Ajuste la caméra et les sous-titres, puis lance la génération.
              </p>
            </div>
          </div>
          {sourceLabel && (
            <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              {sourceLabel}
            </span>
          )}
        </div>
      )}

      <div className={variant === "inline" ? "px-5 py-4" : "flex-1 overflow-y-auto px-5 py-4"}>
        {!validTimestamps && (
          <div className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
            <AlertCircle className="mr-1.5 inline h-3.5 w-3.5" />
            Ajoute d'abord une source et des timestamps valides (5–180 s).
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-2.5 text-[11px] text-destructive">
            <AlertCircle className="mr-1.5 inline h-3.5 w-3.5" />
            {reasonLabel(error)}
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {/* Left column */}
          <div className="space-y-4">
            <div className="rounded-md border border-border bg-card p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-foreground">Source : {sourceLabel ?? "vidéo"}</p>
                {sourceLabel && variant === "dialog" && (
                  <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    {sourceLabel}
                  </span>
                )}
              </div>

              {mode === "direct_url" ? (
                <div className="mt-2 space-y-2">
                  <div className="space-y-1.5">
                    <Label htmlFor={`clip-title-${item.id}`} className="text-xs">Titre du clip</Label>
                    <Input
                      id={`clip-title-${item.id}`}
                      value={localTitle}
                      onChange={(event) => setLocalTitle(event.target.value)}
                      disabled={busy}
                    />
                  </div>
                  {editingUrl ? (
                    <Input
                      type="url" disabled={busy}
                      value={directUrl}
                      onChange={(e) => setDirectUrl(e.target.value)}
                      placeholder="https://www.twitch.tv/…/clip/…"
                    />
                  ) : directUrl ? (
                    <p className="break-all rounded-md border border-border/60 bg-background/40 px-2 py-1.5 text-[11px] text-muted-foreground">
                      {directUrl}
                    </p>
                  ) : (
                    <p className="text-[11px] italic text-muted-foreground">
                      Source introuvable. Colle à nouveau le lien Twitch.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" className="h-7 text-[11px]"
                      onClick={() => setEditingUrl((v) => !v)} disabled={busy}>
                      <Pencil className="mr-1 h-3 w-3" />
                      {editingUrl ? "Terminer" : "Modifier le lien"}
                    </Button>
                    <Button type="button" size="sm" variant="ghost"
                      className="h-7 text-[11px] text-muted-foreground"
                      onClick={() => { setMode("upload"); setEditingUrl(false); }}
                      disabled={busy}>
                      <FileVideo className="mr-1 h-3 w-3" />
                      Remplacer par un fichier
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-2 space-y-2">
                  <Label className="text-xs">Fichier vidéo (max {MAX_BYTES / 1024 / 1024} Mo)</Label>
                  <Input type="file" accept={ACCEPT} disabled={busy}
                    onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
                  {file && (
                    <p className="text-[11px] text-muted-foreground">
                      {file.name} · {(file.size / 1024 / 1024).toFixed(1)} Mo
                    </p>
                  )}
                  {item.source_video_url && (
                    <Button type="button" size="sm" variant="ghost"
                      className="h-7 text-[11px] text-muted-foreground"
                      onClick={() => { setMode("direct_url"); }} disabled={busy}>
                      <LinkIcon className="mr-1 h-3 w-3" />
                      Revenir au lien Twitch
                    </Button>
                  )}
                </div>
              )}

              {validTimestamps && twitchInfo.kind !== "twitch_clip" && (
                <p className="mt-3 border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                  Moment : <span className="font-medium text-foreground">{start}s → {end}s</span>
                  <span className="ml-1 text-muted-foreground/70">· {Number(end) - Number(start)}s</span>
                </p>
              )}
            </div>

            {manualCrop && manualPresetSaved && detectedLogin ? (
              <div className="rounded-md border border-primary/40 bg-primary/[0.07] p-3">
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 rounded-full bg-primary/20 p-1 text-primary">
                    <Check className="h-3 w-3" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      Caméra mémorisée pour @{detectedLogin}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Cette position sera utilisée automatiquement.
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1">
                  <Button type="button" size="sm" variant="outline" className="gap-1 text-xs"
                    onClick={() => setPlacerOpen(true)} disabled={busy}>
                    <Pencil className="h-3 w-3" /> Modifier
                  </Button>
                  <Button type="button" size="sm" variant="ghost"
                    className="text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => {
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
                      toast.success("Position caméra supprimée");
                    }}
                    disabled={busy}>
                    Supprimer
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="rounded-md border border-border bg-card p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <Camera className="mt-0.5 h-3.5 w-3.5 text-primary" />
                      <div>
                        <p className="text-xs font-medium text-foreground">Caméra</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {manualCrop
                            ? "Zone caméra sélectionnée pour ce clip."
                            : presetNeedsReplace
                              ? "Position caméra à replacer. L'ancienne ne sera pas réutilisée."
                              : "Optionnel — place ta caméra si tu veux un rendu caméra + gameplay."}
                        </p>
                      </div>
                    </div>
                    {manualCrop && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
                        <Check className="h-3 w-3" /> Active
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    <Button type="button" size="sm"
                      variant={manualCrop ? "outline" : "default"}
                      className="gap-1 text-xs"
                      onClick={() => setPlacerOpen(true)} disabled={busy}>
                      {manualCrop
                        ? <><Pencil className="h-3 w-3" /> Modifier</>
                        : <><Camera className="h-3 w-3" /> Placer ma caméra</>}
                    </Button>
                    {manualCrop && (
                      <Button type="button" size="sm" variant="ghost"
                        className="text-xs text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          setManualCrop(null);
                          setManualPresetSaved(false);
                          setManualCropSourceSize(null);
                          setIgnoreSavedFacecamPreset(true);
                        }}
                        disabled={busy}>
                        Supprimer
                      </Button>
                    )}
                  </div>
                </div>
              </>
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
          </div>

          {/* Right column */}
          <div className="space-y-4">
            <div className="rounded-md border border-border bg-card p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <Captions className="mt-0.5 h-3.5 w-3.5 text-primary" />
                  <div>
                    <p className="text-xs font-medium text-foreground">Sous-titres automatiques</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Ajoute les sous-titres quand tu parles. Incrustés dans la vidéo.
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
                <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
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

            {/* Generation summary */}
            <div className="rounded-md border border-border bg-card/60 p-3 text-[11px] text-muted-foreground">
              <p className="mb-1 font-semibold text-foreground">Récap génération</p>
              <ul className="space-y-0.5">
                <li>· Format : 9:16 vertical (TikTok / Reels / Shorts)</li>
                <li>· Sous-titres : {captionsEnabled ? `activés (${captionsStyle})` : "désactivés"}</li>
                <li>· Caméra : {manualCrop ? (manualPresetSaved ? "preset mémorisé" : "zone manuelle") : "détection auto"}</li>
                  {validTimestamps && twitchInfo.kind !== "twitch_clip" && (
                  <li>· Durée : {Number(end) - Number(start)} s</li>
                )}
                  {validTimestamps && twitchInfo.kind === "twitch_clip" && durationLabel && (
                    <li>· Source : Clip Twitch complet ({durationLabel})</li>
                  )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className={
        variant === "inline"
          ? "sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-2 border-t border-border/60 bg-background/95 px-5 py-3 backdrop-blur"
          : "sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-2 border-t border-border/60 bg-background/95 px-5 py-3 backdrop-blur"
      }>
        {variant === "dialog" && (
          <Button variant="outline" onClick={onCancel} disabled={busy}>Annuler</Button>
        )}
        {launched && (
          <Button asChild variant="outline">
            <Link to="/content-queue">Voir dans la Queue</Link>
          </Button>
        )}
        <Button onClick={handleLaunch} disabled={launchDisabled}>
          {busy
            ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Génération en cours…</>
            : <><Upload className="mr-1.5 h-3.5 w-3.5" /> Lancer la génération</>}
        </Button>
      </div>

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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            void (supabase as any)
              .from("user_facecam_presets")
              .upsert(
                {
                  user_id: user.id,
                  twitch_channel_login: channelLogin,
                  crop_x: crop.x, crop_y: crop.y,
                  crop_width: crop.width, crop_height: crop.height,
                  source_width: sourceWidth, source_height: sourceHeight,
                  geometry_version: FACECAM_PRESET_GEOMETRY_VERSION,
                  is_enabled: true,
                  last_used_at: new Date().toISOString(),
                },
                { onConflict: "user_id,twitch_channel_login" },
              )
              .then(({ error }: { error: unknown }) => {
                if (error) {
                  console.error("[ClipPreparationPanel] preset upsert failed", error);
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
    </div>
  );
};

export default ClipPreparationPanel;
