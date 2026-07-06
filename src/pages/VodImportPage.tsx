import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ToastAction } from "@/components/ui/toast";
import {
  Scissors,
  Sparkles,
  Loader2,
  ExternalLink,
  Pencil,
  Send,
  Link2,
  Upload,
  AlertCircle,
  Wand2,
} from "lucide-react";

import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { usePageMeta } from "@/hooks/usePageMeta";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { detectTwitchUrl } from "@/lib/twitchUrl";
import { useClipQuotaToast } from "@/hooks/useClipQuotaToast";

import { useContentItems, type ContentItem } from "@/hooks/useContentItems";
import { useActiveVideoJob } from "@/hooks/useVideoJobs";
import {
  getContentStatusBadge,
  getConfidenceLabel,
  formatVodTimestamp,
  buildVodDeepLink,
} from "@/services/contentStatusLabels";
import { getGenerationErrorMessage, getGenerationStageLabel } from "@/services/videoGeneration";
import ClipPreparationPanel from "@/components/content-queue/ClipPreparationPanel";

const PLATFORM_LABEL: Record<string, string> = {
  youtube_shorts: "YouTube Shorts",
  tiktok: "TikTok",
  instagram: "Instagram Reels",
  community: "Post récap",
  twitch_clip: "Clip Twitch",
};

const TONE_CLASS: Record<string, string> = {
  default: "",
  muted: "",
  info: "border-primary/40 bg-primary/10 text-primary-strong",
  success: "border-success/40 bg-success/10 text-success",
  warning: "border-warning/40 bg-warning/10 text-warning",
  destructive: "border-destructive/40 bg-destructive/10 text-destructive",
};

const PREPARATION_MESSAGES = [
  "On récupère la source…",
  "On prépare ton clip…",
  "On charge les options…",
  "On vérifie la caméra…",
  "Encore quelques secondes…",
];
const PREPARATION_SLOW_MESSAGE = "C’est un peu plus long que prévu, mais on est dessus…";
const PREPARATION_ERROR_MESSAGE = "Impossible d’ouvrir la préparation du clip.";


const TARGET_PLATFORMS = [
  { value: "youtube_shorts", label: "YouTube Shorts", format: "short" },
  { value: "tiktok", label: "TikTok", format: "tiktok" },
  { value: "instagram", label: "Instagram Reels / Story", format: "reel" },
  { value: "community", label: "Post récap", format: "recap" },
] as const;

function detectSourceClient(raw: string): "twitch_vod" | "twitch_clip" | "youtube" | null {
  const tw = detectTwitchUrl(raw);
  if (tw.kind) return tw.kind;
  try {
    const u = new URL(raw.trim());
    const host = u.hostname.replace(/^www\./, "");
    if ((host === "youtube.com" || host === "m.youtube.com") && u.searchParams.get("v")) return "youtube";
    if (host === "youtu.be" && u.pathname.length > 1) return "youtube";
    return null;
  } catch {
    return null;
  }
}

/** Accepts lines like "1:23-1:45 titre" or "83-105". */
function parseTimestamps(raw: string): { start_seconds: number; end_seconds: number; title?: string }[] {
  const out: { start_seconds: number; end_seconds: number; title?: string }[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const m = trimmed.match(
      /^(\d{1,2}(?::\d{1,2}){0,2})\s*[-–]\s*(\d{1,2}(?::\d{1,2}){0,2})\s*(.*)$/,
    );
    if (!m) continue;
    const start = parseClock(m[1]);
    const end = parseClock(m[2]);
    if (start < 0 || end <= start) continue;
    out.push({
      start_seconds: start,
      end_seconds: end,
      title: m[3]?.trim() || undefined,
    });
  }
  return out;
}

function parseClock(v: string): number {
  const parts = v.split(":").map((p) => Number(p));
  if (parts.some((n) => !Number.isFinite(n))) return -1;
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return -1;
}

const VOD_REASONS = new Set([
  "vod_manual_timestamp",
  "vod_auto_suggestion",
  "twitch_clip_full",
]);

const VodImportPage = () => {
  usePageMeta({
    title: "Créer un clip · Streamnco",
    description:
      "Colle une VOD Twitch, un Clip Twitch ou importe une vidéo. Streamnco la transforme en clip vertical prêt pour TikTok, Reels et Shorts.",
  });

  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, loading: itemsLoading, refetch, updateItem } = useContentItems();
  const { activeJob, refetch: refetchActiveJob } = useActiveVideoJob();
  const [searchParams, setSearchParams] = useSearchParams();
  const [url, setUrl] = useState("");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("");
  const [target, setTarget] = useState<string>("youtube_shorts");
  const [timestampsRaw, setTimestampsRaw] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sourceMode, setSourceMode] = useState<"twitch" | "upload">("twitch");
  const [creatingUploadDraft, setCreatingUploadDraft] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<ContentItem | null>(null);
  const [editStart, setEditStart] = useState(0);
  const [editEnd, setEditEnd] = useState(0);
  const [lastImportedUrl, setLastImportedUrl] = useState<string | null>(null);
  const [prepareError, setPrepareError] = useState<string | null>(null);
  const [preparedItemOverride, setPreparedItemOverride] = useState<ContentItem | null>(null);
  // Inline preparation: id of the item to configure on this page.
  const [preparedItemId, setPreparedItemId] = useState<string | null>(
    searchParams.get("continue"),
  );
  const prepRef = useRef<HTMLDivElement | null>(null);

  const autoGenEnabled = isFeatureEnabled("TWITCH_AUTO_CLIP_GENERATION_ENABLED");
  const showClipQuotaToast = useClipQuotaToast();

  const detectedSource = useMemo(() => (url ? detectSourceClient(url) : null), [url]);

  const candidates = useMemo(() => {
    if (!lastImportedUrl) return [];
    return items
      .filter(
        (i) =>
          typeof i.reason === "string" &&
          VOD_REASONS.has(i.reason) &&
          i.source_video_url === lastImportedUrl,
      )
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [items, lastImportedUrl]);

  // Inline preparation panel target: an item the user is configuring on this page.
  const preparedItem = useMemo(
    () => {
      if (!preparedItemId) return null;
      if (preparedItemOverride?.id === preparedItemId) return preparedItemOverride;
      return items.find((i) => i.id === preparedItemId) ?? null;
    },
    [items, preparedItemId, preparedItemOverride],
  );

  useEffect(() => {
    if (!preparedItem) return;
    setUrl(preparedItem.source_video_url ?? "");
    setSubject(preparedItem.title ?? "");
    setTarget(preparedItem.platform ?? "youtube_shorts");
  }, [preparedItem]);

  // Premium loading microcopy for the preparation CTA / panel hydration.
  const [prepMessageIndex, setPrepMessageIndex] = useState(0);
  const [prepStartAt, setPrepStartAt] = useState<number | null>(null);
  const hasScrolledToPrepRef = useRef(false);
  const isPrepLoading = submitting || (!!preparedItemId && !preparedItem && itemsLoading);

  useEffect(() => {
    if (!isPrepLoading) {
      if (prepStartAt) setPrepStartAt(null);
      setPrepMessageIndex(0);
      return;
    }
    if (!prepStartAt) setPrepStartAt(Date.now());
    const messageInterval = window.setInterval(
      () => setPrepMessageIndex((i) => (i + 1) % PREPARATION_MESSAGES.length),
      1200,
    );
    return () => window.clearInterval(messageInterval);
  }, [isPrepLoading]);


  const prepElapsed = prepStartAt ? Date.now() - prepStartAt : 0;
  const prepMessage =
    prepElapsed > 10000 ? PREPARATION_SLOW_MESSAGE : PREPARATION_MESSAGES[prepMessageIndex % PREPARATION_MESSAGES.length];

  // Scroll to the configuration panel once it becomes available.
  useEffect(() => {
    if (preparedItem && !hasScrolledToPrepRef.current) {
      hasScrolledToPrepRef.current = true;
      setTimeout(
        () => prepRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
        120,
      );
    }
  }, [preparedItem]);


  // Poll while jobs are processing + drive a clock for stuck-job detection.
  const [now, setNow] = useState(() => Date.now());
  const [processingSince, setProcessingSince] = useState<Record<string, number>>({});
  useEffect(() => {
    const inFlight = candidates.some(
      (c) =>
        c.generation_status === "queued" || c.generation_status === "processing",
    );
    if (!inFlight) return;
    const id = window.setInterval(() => {
      setNow(Date.now());
      refetch();
    }, 5000);
    return () => window.clearInterval(id);
  }, [candidates, refetch]);
  // Record when each item first entered processing so we can detect stuck jobs.
  useEffect(() => {
    setProcessingSince((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const c of candidates) {
        const inFlight =
          c.generation_status === "queued" || c.generation_status === "processing";
        if (inFlight && !next[c.id]) {
          next[c.id] = Date.now();
          changed = true;
        } else if (!inFlight && next[c.id]) {
          delete next[c.id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [candidates]);

  const handleSubmit = async () => {
    if (!url.trim()) {
      toast({ title: "Lien manquant", description: "Colle un lien Twitch.", variant: "destructive" });
      return;
    }
    if (!subject.trim()) {
      toast({ title: "Titre manquant", description: "Ajoute un titre pour ton clip.", variant: "destructive" });
      return;
    }
    if (detectedSource === "youtube") {
      toast({
        title: "YouTube arrive bientôt",
        description: "Utilise une VOD Twitch, un Clip Twitch ou importe une vidéo.",
      });
      return;
    }
    if (detectedSource !== "twitch_vod" && detectedSource !== "twitch_clip") {
      toast({
        title: "Lien non reconnu",
        description: "Colle un lien de VOD Twitch ou de Clip Twitch valide.",
        variant: "destructive",
      });
      return;
    }
    const parsed = detectedSource === "twitch_vod" ? parseTimestamps(timestampsRaw) : [];
    if (detectedSource === "twitch_vod" && timestampsRaw.trim() && parsed.length === 0) {
      toast({
        title: "Timestamps invalides",
        description: "Utilise le format mm:ss-mm:ss ou laisse vide pour préparer les 60 premières secondes.",
        variant: "destructive",
      });
      return;
    }
    const timestamps = detectedSource === "twitch_vod"
      ? (parsed.length > 0 ? [parsed[0]] : [{ start_seconds: 0, end_seconds: 60, title: subject.trim() }])
      : undefined;
    setPrepareError(null);
    setSubmitting(true);
    try {
      const targetMeta = TARGET_PLATFORMS.find((t) => t.value === target);
      const { data, error } = await supabase.functions.invoke("vod-import-create", {
        body: {
          source_url: url.trim(),
          subject: subject.trim() || undefined,
          category: category.trim() || undefined,
          target_platform: target,
          format: targetMeta?.format,
          timestamps,
        },
      });
      if (error) throw error;
      const result = data as {
        success?: boolean;
        message?: string;
        count?: number;
        reason?: string;
        items?: ContentItem[];
      };
      if (!result?.success) {
        throw new Error(result?.message ?? "Impossible d'analyser cette VOD.");
      }
      setLastImportedUrl(url.trim());
      await refetch();

      const returnedItem = result.items?.[0] ?? null;
      const returnedId = returnedItem?.id ?? null;
      // Fallback: look up the most recently created item for this URL (covers
      // dedup paths where the edge function returned no fresh inserts).
      let newId: string | null = returnedId;
      let resolvedItem: ContentItem | null = returnedItem;
      if (!newId && user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: latest } = await (supabase as any)
          .from("creator_content_items")
          .select("*")
          .eq("user_id", user.id)
          .eq("source_video_url", url.trim())
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        newId = (latest as { id?: string } | null)?.id ?? null;
        resolvedItem = (latest as ContentItem | null) ?? null;
      }
      if (newId) {
        setPreparedItemOverride(resolvedItem);
        setPreparedItemId(newId);
        setSearchParams({ continue: newId }, { replace: true });
        toast({ title: "Clip prêt à configurer", description: "Configure la caméra et les sous-titres ci-dessous." });
        return;
      }
      setPrepareError(PREPARATION_ERROR_MESSAGE);
    } catch (err) {
      setPrepareError(PREPARATION_ERROR_MESSAGE);
      toast({
        title: "Échec",
        description: err instanceof Error ? err.message : "Réessaie dans quelques instants.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerate = async (item: ContentItem) => {
    if (!autoGenEnabled) {
      toast({
        title: "Génération bientôt disponible",
        description: "Tu peux ajuster les moments en attendant.",
      });
      return;
    }
    if (!item.source_video_url || item.source_start_time === null || item.source_end_time === null) {
      toast({ title: "Données manquantes", description: "Modifie le moment du clip.", variant: "destructive" });
      return;
    }
    if (activeJob && activeJob.content_item_id !== item.id) {
      toast({
        title: "Génération déjà en cours",
        description: "Une génération est déjà en cours. Attends la fin avant d’en lancer une autre.",
        variant: "destructive",
      });
      return;
    }
    const source = detectSourceClient(item.source_video_url);
    const sourceType =
      source === "twitch_clip" ? "twitch_clip" :
      source === "twitch_vod" ? "twitch_vod" :
      source === "youtube" ? "youtube_vod" : "direct_url";

    setGeneratingId(item.id);
    try {
      const { data, error } = await supabase.functions.invoke("clip-job-create", {
        body: {
          content_item_id: item.id,
          source_type: sourceType,
          source_url: item.source_video_url,
          start_time_seconds: item.source_start_time,
          end_time_seconds: item.source_end_time,
        },
      });
      // Try to surface a structured error payload from non-2xx responses.
      let payload: unknown = data;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (error && (error as any)?.context?.response) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          payload = await (error as any).context.response.clone().json();
        } catch { /* ignore */ }
      }
      const p = payload as { success?: boolean; error?: string; message?: string } | null;
      if (p?.error === "quota_exceeded" || p?.error === "quota_and_credits_exceeded" || p?.error === "streamcoins_insufficient" || payload?.error === "streamcoins_insufficient") {
        showClipQuotaToast();
        return;
      }
      if (error) throw error;
      if (p && p.success === false) {
        throw new Error(p.message ?? "Échec de génération");
      }
      toast({
        title: "Génération lancée",
        description: "Le clip est en cours de génération.",
        action: (
          <ToastAction altText="Voir la queue" onClick={() => navigate("/content-queue")}>
            Voir la queue
          </ToastAction>
        ),
      });
      await refetch();
      await refetchActiveJob();
    } catch (err) {
      const message = err instanceof Error && err.message.includes("non-2xx")
        ? getGenerationErrorMessage("active_job_exists")
        : err instanceof Error ? err.message : "Réessaie avec un autre moment.";
      toast({
        title: "Impossible de lancer la génération",
        description: message,
        variant: "destructive",
      });
    } finally {
      setGeneratingId(null);
    }
  };

  const openEdit = (item: ContentItem) => {
    setEditing(item);
    setEditStart(item.source_start_time ?? 0);
    setEditEnd(item.source_end_time ?? 0);
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (editEnd <= editStart || editEnd - editStart < 5 || editEnd - editStart > 180) {
      toast({
        title: "Durée invalide",
        description: "Le clip doit durer entre 5 et 180 secondes.",
        variant: "destructive",
      });
      return;
    }
    try {
      await updateItem(editing.id, {
        source_start_time: Math.round(editStart),
        source_end_time: Math.round(editEnd),
        source_duration: Math.round(editEnd - editStart),
      });
      toast({ title: "Moment mis à jour" });
      setEditing(null);
    } catch (err) {
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Impossible d'enregistrer.",
        variant: "destructive",
      });
    }
  };

  const handleSendAsIdea = async (item: ContentItem) => {
    try {
      await updateItem(item.id, { status: "idea" });
      toast({
        title: "Ajouté à tes clips",
        description: "Le clip est marqué « À préparer ».",
      });
    } catch (err) {
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Impossible d'envoyer.",
        variant: "destructive",
      });
    }
  };

  const handleIgnore = async (item: ContentItem) => {
    try {
      await updateItem(item.id, { status: "ignored" });
      toast({ title: "Clip ignoré" });
    } catch (err) {
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Impossible d'ignorer.",
        variant: "destructive",
      });
    }
  };

  const hasManualTimestamps = parseTimestamps(timestampsRaw).length > 0;
  const showLegacyCandidates = false;

  return (
    <AppShell>
      <PageContainer size="lg">
        <PageHeader
          eyebrow="Clipping"
          title="Créer un clip"
          description="Colle une VOD Twitch, un Clip Twitch ou importe une vidéo. Streamnco la transforme en clip vertical prêt pour TikTok, Reels et Shorts."
        />

        <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px]">
          <Badge variant="outline" className="border-success/40 bg-success/10 text-success">
            VOD Twitch — Disponible
          </Badge>
          <Badge variant="outline" className="border-success/40 bg-success/10 text-success">
            Clip Twitch — Disponible
          </Badge>
          <Badge variant="outline" className="border-success/40 bg-success/10 text-success">
            Vidéo importée — Disponible
          </Badge>
          <Badge variant="outline" className="border-muted bg-muted/30 text-muted-foreground">
            YouTube — Bientôt
          </Badge>
        </div>

        {/* Source switcher: Lien Twitch / Import vidéo */}
        <div className="mb-3 inline-flex rounded-md border border-border/60 bg-card/60 p-1">
          <button
            type="button"
            onClick={() => setSourceMode("twitch")}
            className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition ${sourceMode === "twitch" ? "bg-primary/15 text-primary-strong" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Link2 className="h-3.5 w-3.5" /> Lien Twitch
          </button>
          <button
            type="button"
            onClick={() => setSourceMode("upload")}
            className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition ${sourceMode === "upload" ? "bg-primary/15 text-primary-strong" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Upload className="h-3.5 w-3.5" /> Import vidéo
          </button>
        </div>

        {sourceMode === "upload" ? (
          <Card className="mb-5 border-border/60 bg-card/60">
            <CardContent className="space-y-4 p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="upload-subject" className="text-xs font-semibold">Titre du clip</Label>
                  <Input
                    id="upload-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Ex. Ma meilleure action"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Objectif du contenu</Label>
                  <Select value={target} onValueChange={setTarget}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TARGET_PLATFORMS.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <p className="text-[11px] text-muted-foreground">
                  Tu choisiras le fichier .mp4/.mov dans le panneau de préparation. Par défaut, Streamnco prépare les 60 premières secondes.
                </p>
                <Button
                  onClick={async () => {
                    if (!user) return;
                    const title = subject.trim() || "Nouveau clip";
                    setCreatingUploadDraft(true);
                    setPrepareError(null);
                    try {
                      const targetMeta = TARGET_PLATFORMS.find((t) => t.value === target);
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const { data, error } = await (supabase as any)
                        .from("creator_content_items")
                        .insert({
                          user_id: user.id,
                          platform: target,
                          title,
                          status: "to_produce",
                          format: targetMeta?.format ?? null,
                          source_platform: "manual",
                          source_video_url: null,
                          source_start_time: 0,
                          source_end_time: 60,
                          source_duration: 60,
                          hashtags: [],
                        })
                        .select()
                        .single();
                      if (error) throw error;
                      const created = data as ContentItem;
                      setPreparedItemOverride(created);
                      setPreparedItemId(created.id);
                      setSearchParams({ continue: created.id }, { replace: true });
                      await refetch();
                      toast({ title: "Brouillon créé", description: "Importe ta vidéo ci-dessous." });
                      setTimeout(() => prepRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
                    } catch (err) {
                      toast({
                        title: "Impossible de créer le brouillon",
                        description: err instanceof Error ? err.message : "Réessaie.",
                        variant: "destructive",
                      });
                    } finally {
                      setCreatingUploadDraft(false);
                    }
                  }}
                  disabled={creatingUploadDraft}
                  className="gap-2"
                >
                  {creatingUploadDraft ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {creatingUploadDraft ? "Ça arrive…" : "Préparer le clip"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
        <Card className="mb-5 border-border/60 bg-card/60">
          <CardContent className="space-y-4 p-5">

            <div className="space-y-1.5">
              <Label htmlFor="vod-url" className="text-xs font-semibold">
                Lien Twitch
              </Label>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="vod-url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Colle une VOD Twitch ou un Clip Twitch"
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <span>Fonctionne avec les VOD Twitch et les Clips Twitch.</span>
                {detectedSource === "twitch_vod" && (
                  <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary-strong text-[10px]">
                    VOD Twitch détectée
                  </Badge>
                )}
                {detectedSource === "twitch_clip" && (
                  <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary-strong text-[10px]">
                    Clip Twitch détecté
                  </Badge>
                )}
                {detectedSource === "youtube" && (
                  <Badge variant="outline" className="border-muted bg-muted/30 text-muted-foreground text-[10px]">
                    YouTube — Bientôt
                  </Badge>
                )}
              </div>
              {detectedSource === "twitch_clip" && (
                <p className="text-[11px] text-primary-strong">
                  Clip Twitch détecté. Streamnco utilisera le clip complet, sans timestamps.
                </p>
              )}
              {detectedSource === "youtube" && (
                <p className="text-[11px] text-warning">
                  YouTube arrive bientôt. Utilise une VOD Twitch, un Clip Twitch ou importe une vidéo.
                </p>
              )}
            </div>


            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="vod-subject" className="text-xs font-semibold">
                  Titre du clip
                </Label>
                <Input
                  id="vod-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ex. Ma meilleure action du live"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vod-category" className="text-xs font-semibold">
                  Jeu / catégorie <span className="font-normal text-muted-foreground">(optionnel)</span>
                </Label>
                <Input
                  id="vod-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Ex. Elden Ring"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Objectif du contenu</Label>
                <Select value={target} onValueChange={setTarget}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TARGET_PLATFORMS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {detectedSource !== "twitch_clip" && (
                <div className="space-y-1.5">
                  <Label htmlFor="vod-timestamps" className="text-xs font-semibold">
                    Timestamp du clip <span className="font-normal text-muted-foreground">(optionnel)</span>
                  </Label>
                  <Textarea
                    id="vod-timestamps"
                    value={timestampsRaw}
                    onChange={(e) => setTimestampsRaw(e.target.value)}
                    placeholder={"Ex. 1:23-1:48 Réaction"}
                    rows={3}
                    className="font-mono text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Format : <code>mm:ss-mm:ss</code> ou <code>hh:mm:ss-hh:mm:ss</code>. Si vide, les 60 premières secondes seront préparées.
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <p className="text-[11px] text-muted-foreground">
                {detectedSource === "twitch_clip"
                  ? "Streamnco va utiliser tout le Clip Twitch pour générer ton clip vertical."
                  : hasManualTimestamps
                  ? "Ce timestamp sera utilisé pour préparer ton clip."
                  : "Sans timestamp, Streamnco prépare les 60 premières secondes de la VOD."}
              </p>
              <Button
                onClick={handleSubmit}
                disabled={submitting || detectedSource === "youtube"}
                className="gap-2"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                {submitting ? "Ça arrive…" : "Continuer la préparation"}
              </Button>
            </div>

            {submitting && (
              <div className="mt-2 flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-[11px] text-primary-strong/80">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {prepMessage}
              </div>
            )}


          </CardContent>
        </Card>
        )}


        {prepareError && !preparedItemId && (
          <Card className="mb-5 border-destructive/40 bg-destructive/10">
            <CardContent className="flex flex-col gap-3 p-5 text-sm">
              <div className="flex items-start gap-2 text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4" />
                <div>
                  <p className="font-semibold">{PREPARATION_ERROR_MESSAGE}</p>
                  <p className="mt-1 text-xs text-destructive/80">Réessaie ou consulte la Queue si le clip a déjà été créé.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={handleSubmit} disabled={submitting}>
                  Réessayer
                </Button>
                <Button asChild size="sm" variant="ghost">
                  <Link to="/content-queue">Voir dans la Queue</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Inline preparation panel — same page as the analyze form. */}
        {preparedItemId && (
          <div ref={prepRef} className="mb-5">
            {preparedItem ? (
              <ClipPreparationPanel
                item={preparedItem}
                variant="inline"
                onLaunched={() => {
                  void refetch();
                  void refetchActiveJob();
                }}
              />
            ) : itemsLoading ? (
              <Card className="border-primary/30 bg-primary/[0.04]">
                <CardContent className="flex items-center gap-3 p-5">
                  <Loader2 className="h-5 w-5 animate-spin text-primary-strong" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Ça arrive…</p>
                    <p className="text-[11px] text-muted-foreground">{prepMessage}</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-destructive/40 bg-destructive/10">
                <CardContent className="flex flex-col gap-3 p-5 text-sm">
                  <div className="flex items-start gap-2 text-destructive">
                    <AlertCircle className="mt-0.5 h-4 w-4" />
                    <div>
                      <p className="font-semibold">{PREPARATION_ERROR_MESSAGE}</p>
                      <p className="mt-1 text-xs text-destructive/80">Réessaie ou consulte la Queue si le clip a déjà été créé.</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => void refetch()}>
                      Réessayer
                    </Button>
                    <Button asChild size="sm" variant="ghost">
                      <Link to="/content-queue">Voir dans la Queue</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}




        {showLegacyCandidates && candidates.length > 0 && (
          <Card className="mb-4 border-primary/30 bg-primary/[0.03]">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15">
                  <Scissors className="h-4 w-4 text-primary-strong" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    Clips proposés ({candidates.length})
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ajuste les moments puis génère le MP4. Le clip arrive dans tes clips.
                  </p>
                </div>
              </div>

              {candidates.some((c) => c.reason === "vod_auto_suggestion") && (
                <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/[0.06] px-3 py-2 text-xs">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                  <span>
                    Sélection VOD automatique — ajoute un timestamp précis pour de meilleurs résultats.
                  </span>
                </div>
              )}

              <div className="space-y-2">
                {candidates.map((item) => {
                  const badge = getContentStatusBadge(item);
                  const tone = TONE_CLASS[badge.tone] ?? "";
                  const duration = item.source_duration ?? 0;
                  const isProcessing =
                    item.generation_status === "queued" ||
                    item.generation_status === "processing" ||
                    generatingId === item.id;
                  const isReady = item.generation_status === "succeeded";
                  const deepLink = buildVodDeepLink(item.source_video_url, item.source_start_time);
                  const isError = item.generation_status === "failed";
                  const startedAt = processingSince[item.id];
                  const anotherJobIsActive = !!activeJob && activeJob.content_item_id !== item.id;
                  const activeStageLabel = activeJob?.content_item_id === item.id
                    ? getGenerationStageLabel(activeJob.generation_stage)
                    : null;
                  const isLongRunning = isProcessing && !!startedAt && now - startedAt > 3 * 60 * 1000;

                  return (
                    <div key={item.id} className="rounded-lg border border-border/60 bg-card/60 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="muted" className="text-[10px]">
                          {PLATFORM_LABEL[item.platform] ?? item.platform}
                        </Badge>
                        <Badge className={`text-[10px] ${tone}`} variant="outline">
                          {badge.label}
                        </Badge>
                        {item.opportunity_score !== null && (
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                            {getConfidenceLabel(item.opportunity_score)} · {item.opportunity_score}/100
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 text-sm font-medium text-foreground">{item.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.opportunity_reason ?? item.reason} · Moment à{" "}
                        {formatVodTimestamp(item.source_start_time)} · {duration}s
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {isReady ? (
                          <Button asChild size="sm">
                            <Link to="/clipping">
                              <Sparkles className="h-3.5 w-3.5" />
                              Voir le clip généré
                            </Link>
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleGenerate(item)}
                            disabled={isProcessing || anotherJobIsActive}
                          >
                            {isProcessing ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Scissors className="h-3.5 w-3.5" />
                            )}
                            Générer le clip
                          </Button>
                        )}

                        <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>
                          <Pencil className="h-3.5 w-3.5" />
                          Modifier le moment
                        </Button>

                        {deepLink && (
                          <Button asChild variant="ghost" size="sm">
                            <a href={deepLink} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3.5 w-3.5" />
                              Ouvrir la VOD
                            </a>
                          </Button>
                        )}

                        {item.status === "to_generate" && (
                          <Button variant="ghost" size="sm" onClick={() => handleSendAsIdea(item)}>
                            <Send className="h-3.5 w-3.5" />
                            Envoyer comme idée
                          </Button>
                        )}

                        {item.status !== "ignored" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => handleIgnore(item)}
                          >
                            Ignorer
                          </Button>
                        )}
                      </div>

                      {activeStageLabel && isProcessing && (
                        <p className="mt-2 text-[11px] text-primary-strong">
                          {activeStageLabel}
                        </p>
                      )}
                      {anotherJobIsActive && !isReady && (
                        <p className="mt-2 text-[11px] text-warning">
                          Une génération est déjà en cours. Attends la fin avant d’en lancer une autre.
                        </p>
                      )}
                      {isLongRunning && (
                        <p className="mt-2 text-[11px] text-warning">
                          La génération est plus longue que prévu, mais elle continue.
                        </p>
                      )}
                      {isError && item.generation_error && (
                        <p className="mt-2 text-[11px] text-destructive">
                          {item.generation_error}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-border/60 bg-card/40">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Upload className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Pas de lien Twitch ? Tu peux aussi importer un fichier vidéo et le transformer en clip.
              </span>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/content-queue">Importer une vidéo</Link>
            </Button>
          </CardContent>
        </Card>


        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier le moment du clip</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="start" className="text-xs">
                  Début (secondes depuis le début de la VOD)
                </Label>
                <Input
                  id="start"
                  type="number"
                  min={0}
                  value={editStart}
                  onChange={(e) => setEditStart(Number(e.target.value))}
                />
                <p className="text-[11px] text-muted-foreground">{formatVodTimestamp(editStart)}</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="end" className="text-xs">
                  Fin (secondes)
                </Label>
                <Input
                  id="end"
                  type="number"
                  min={0}
                  value={editEnd}
                  onChange={(e) => setEditEnd(Number(e.target.value))}
                />
                <p className="text-[11px] text-muted-foreground">
                  Durée : {Math.max(0, editEnd - editStart)}s (entre 5 et 180s)
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setEditing(null)}>
                Annuler
              </Button>
              <Button onClick={saveEdit}>Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageContainer>
    </AppShell>
  );
};

export default VodImportPage;
