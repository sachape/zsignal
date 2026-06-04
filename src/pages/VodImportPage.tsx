import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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

import { useContentItems, type ContentItem } from "@/hooks/useContentItems";
import {
  getContentStatusBadge,
  getConfidenceLabel,
  formatVodTimestamp,
  buildVodDeepLink,
} from "@/services/contentStatusLabels";

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
  info: "border-primary/40 bg-primary/10 text-primary",
  success: "border-success/40 bg-success/10 text-success",
  warning: "border-warning/40 bg-warning/10 text-warning",
  destructive: "border-destructive/40 bg-destructive/10 text-destructive",
};

const TARGET_PLATFORMS = [
  { value: "youtube_shorts", label: "YouTube Shorts", format: "short" },
  { value: "tiktok", label: "TikTok", format: "tiktok" },
  { value: "instagram", label: "Instagram Reels / Story", format: "reel" },
  { value: "community", label: "Post récap", format: "recap" },
] as const;

function detectSourceClient(raw: string): "twitch" | "youtube" | null {
  try {
    const u = new URL(raw.trim());
    const host = u.hostname.replace(/^www\./, "");
    if (host === "twitch.tv" && /^\/videos\/\d+/.test(u.pathname)) return "twitch";
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
]);

const VodImportPage = () => {
  usePageMeta({
    title: "Créer depuis une VOD · Streamnco",
    description: "Colle une VOD Twitch et génère des clips prêts pour Shorts, Reels et TikTok.",
  });

  const { items, refetch, updateItem } = useContentItems();
  const [url, setUrl] = useState("");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("");
  const [target, setTarget] = useState<string>("youtube_shorts");
  const [timestampsRaw, setTimestampsRaw] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<ContentItem | null>(null);
  const [editStart, setEditStart] = useState(0);
  const [editEnd, setEditEnd] = useState(0);
  const [lastImportedUrl, setLastImportedUrl] = useState<string | null>(null);

  const autoGenEnabled = isFeatureEnabled("TWITCH_AUTO_CLIP_GENERATION_ENABLED");

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
      .sort((a, b) => (a.source_start_time ?? 0) - (b.source_start_time ?? 0));
  }, [items, lastImportedUrl]);

  // Poll while jobs are processing.
  useEffect(() => {
    const inFlight = candidates.some(
      (c) =>
        c.generation_status === "queued" || c.generation_status === "processing",
    );
    if (!inFlight) return;
    const id = window.setInterval(() => refetch(), 5000);
    return () => window.clearInterval(id);
  }, [candidates, refetch]);

  const handleSubmit = async () => {
    if (!url.trim()) {
      toast({ title: "Lien manquant", description: "Colle une VOD Twitch.", variant: "destructive" });
      return;
    }
    if (detectedSource === "youtube") {
      toast({
        title: "YouTube arrive bientôt",
        description: "Utilise une VOD Twitch ou importe un fichier vidéo pour le moment.",
      });
      return;
    }
    if (detectedSource !== "twitch") {
      toast({
        title: "Lien non reconnu",
        description: "Utilise une VOD Twitch (twitch.tv/videos/…).",
        variant: "destructive",
      });
      return;
    }
    const parsed = parseTimestamps(timestampsRaw);
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
          timestamps: parsed.length > 0 ? parsed : undefined,
        },
      });
      if (error) throw error;
      const result = data as {
        success?: boolean;
        message?: string;
        count?: number;
        reason?: string;
      };
      if (!result?.success) {
        throw new Error(result?.message ?? "Impossible d'analyser cette VOD.");
      }
      setLastImportedUrl(url.trim());
      await refetch();
      toast({
        title: result.reason === "vod_manual_timestamp" ? "Clips créés" : "Suggestions à vérifier",
        description:
          result.reason === "vod_manual_timestamp"
            ? `${result.count} clip${(result.count ?? 0) > 1 ? "s" : ""} prêt${(result.count ?? 0) > 1 ? "s" : ""} à générer.`
            : "Ajoute des timestamps pour de meilleurs résultats.",
      });
    } catch (err) {
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
    const source = detectSourceClient(item.source_video_url);
    const sourceType =
      source === "twitch" ? "twitch_vod" :
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
      if (error) throw error;
      if (data && (data as { success?: boolean }).success === false) {
        throw new Error((data as { message?: string }).message ?? "Échec de génération");
      }
      toast({ title: "Génération lancée", description: "Le clip est en cours de génération." });
      await refetch();
    } catch (err) {
      toast({
        title: "Impossible de lancer la génération",
        description: err instanceof Error ? err.message : "Réessaie ou modifie le timestamp.",
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
        title: "Envoyé dans Content Queue",
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

  return (
    <AppShell>
      <PageContainer size="lg">
        <PageHeader
          eyebrow="Content Studio"
          title="Créer depuis une VOD"
          description="Colle une VOD Twitch ou YouTube. Streamnco propose les clips, tu choisis ce qui part dans Content Queue."
        />

        <Card className="mb-5 border-border/60 bg-card/60">
          <CardContent className="space-y-4 p-5">
            <div className="space-y-1.5">
              <Label htmlFor="vod-url" className="text-xs font-semibold">
                Lien de la VOD
              </Label>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="vod-url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Colle un lien Twitch ou YouTube"
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span>Formats acceptés : twitch.tv/videos/… · youtube.com/watch?v=… · youtu.be/…</span>
                {detectedSource && (
                  <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary text-[10px]">
                    {detectedSource === "twitch" ? "Twitch VOD" : "YouTube"}
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="vod-subject" className="text-xs font-semibold">
                  Sujet de la vidéo <span className="font-normal text-muted-foreground">(optionnel)</span>
                </Label>
                <Input
                  id="vod-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ex. Run no-hit Elden Ring"
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
              <div className="space-y-1.5">
                <Label htmlFor="vod-timestamps" className="text-xs font-semibold">
                  Moments à découper <span className="font-normal text-muted-foreground">(optionnel)</span>
                </Label>
                <Textarea
                  id="vod-timestamps"
                  value={timestampsRaw}
                  onChange={(e) => setTimestampsRaw(e.target.value)}
                  placeholder={"Une ligne par clip\n1:23-1:48 Réaction\n12:05-12:30 Punchline"}
                  rows={3}
                  className="font-mono text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  Format : <code>mm:ss-mm:ss</code> ou <code>hh:mm:ss-hh:mm:ss</code>. Durée 10 à 180 s.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <p className="text-[11px] text-muted-foreground">
                {hasManualTimestamps
                  ? "Tes timestamps seront utilisés pour créer les clips."
                  : "Sans timestamps : Streamnco propose 3 fenêtres réparties dans la VOD à ajuster avant génération."}
              </p>
              <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                Analyser la VOD
              </Button>
            </div>
          </CardContent>
        </Card>

        {candidates.length > 0 && (
          <Card className="mb-4 border-primary/30 bg-primary/[0.03]">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15">
                  <Scissors className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    Clips proposés ({candidates.length})
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ajuste les moments puis génère le MP4. Le clip part dans Content Queue.
                  </p>
                </div>
              </div>

              {candidates.some((c) => c.reason === "vod_auto_suggestion") && (
                <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/[0.06] px-3 py-2 text-xs">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                  <span>
                    Suggestions à vérifier — ajoute des timestamps pour de meilleurs résultats.
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
                            <Link to="/content-queue">
                              <Sparkles className="h-3.5 w-3.5" />
                              Voir le clip généré
                            </Link>
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleGenerate(item)}
                            disabled={isProcessing}
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
                VOD inaccessible ? Tu peux aussi importer un fichier vidéo depuis Content Queue ou
                créer une idée sans générer de clip.
              </span>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/content-queue">Aller à Content Queue</Link>
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
