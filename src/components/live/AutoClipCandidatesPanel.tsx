import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Scissors,
  Sparkles,
  Loader2,
  ExternalLink,
  Pencil,
  Send,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

import { useContentItems, type ContentItem } from "@/hooks/useContentItems";
import {
  getContentStatusBadge,
  getConfidenceLabel,
  formatVodTimestamp,
  buildVodDeepLink,
} from "@/services/contentStatusLabels";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { useClipQuotaToast } from "@/hooks/useClipQuotaToast";
import type { LiveSession } from "@/services/liveSessions";

interface Props {
  session: LiveSession;
}

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

const AutoClipCandidatesPanel = ({ session }: Props) => {
  const { items, refetch, updateItem } = useContentItems();
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [retryingVod, setRetryingVod] = useState(false);
  const [editing, setEditing] = useState<ContentItem | null>(null);
  const [editStart, setEditStart] = useState(0);
  const [editEnd, setEditEnd] = useState(0);

  const candidates = useMemo(
    () =>
      items
        .filter(
          (i) =>
            i.live_session_id === session.id &&
            typeof i.reason === "string" &&
            i.reason.startsWith("auto_signal:"),
        )
        .sort((a, b) => (a.source_start_time ?? 0) - (b.source_start_time ?? 0)),
    [items, session.id],
  );

  const hasVod = useMemo(
    () => candidates.some((c) => !!c.source_video_url),
    [candidates],
  );

  const autoGenEnabled = isFeatureEnabled("TWITCH_AUTO_CLIP_GENERATION_ENABLED");

  // Auto-refresh while jobs are processing
  useEffect(() => {
    const inFlight = candidates.some(
      (c) =>
        c.generation_status === "queued" || c.generation_status === "processing",
    );
    if (!inFlight) return;
    const id = window.setInterval(() => refetch(), 5000);
    return () => window.clearInterval(id);
  }, [candidates, refetch]);

  const handleGenerate = async (item: ContentItem) => {
    if (!autoGenEnabled) {
      toast({
        title: "Génération automatique bientôt disponible",
        description: "Tu peux ajouter une VOD manuellement en attendant.",
      });
      return;
    }
    if (!item.source_video_url) {
      toast({
        title: "VOD indisponible",
        description: "Ajoute une VOD manuellement ou attends qu'elle soit disponible sur Twitch.",
        variant: "destructive",
      });
      return;
    }
    if (item.source_start_time === null || item.source_end_time === null) {
      toast({
        title: "Timestamp manquant",
        description: "Modifie le moment du clip avant de lancer la génération.",
        variant: "destructive",
      });
      return;
    }

    setGeneratingId(item.id);
    try {
      const isTwitchVod = /twitch\.tv\/videos\/\d+/.test(item.source_video_url);
      const { data, error } = await supabase.functions.invoke("clip-job-create", {
        body: {
          content_item_id: item.id,
          source_type: isTwitchVod ? "twitch_vod" : "direct_url",
          source_url: item.source_video_url,
          start_time_seconds: item.source_start_time,
          end_time_seconds: item.source_end_time,
        },
      });
      let payload: unknown = data;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (error && (error as any)?.context?.response) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          payload = await (error as any).context.response.clone().json();
        } catch { /* ignore */ }
      }
      const p = payload as { success?: boolean; error?: string; message?: string } | null;
      if (p?.error === "quota_exceeded") {
        toast({
          title: "Tu as atteint ta limite de clips générés ce mois-ci.",
          description: "Passe à un plan supérieur pour augmenter ton quota.",
          variant: "destructive",
        });
        return;
      }
      if (error) throw error;
      if (p && p.success === false) {
        throw new Error(p.message ?? "Échec de génération");
      }
      toast({
        title: "Génération lancée",
        description: "Le clip est en cours de génération. Tu seras notifié.",
      });
      await refetch();
    } catch (err) {
      toast({
        title: "Impossible de lancer la génération",
        description:
          err instanceof Error
            ? err.message
            : "Réessaie ou modifie le timestamp.",
        variant: "destructive",
      });
    } finally {
      setGeneratingId(null);
    }
  };

  const handleSendAsIdea = async (item: ContentItem) => {
    try {
      await updateItem(item.id, { status: "idea" });
      toast({
        title: "Envoyé dans la file de contenu",
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

  const handleRetryVod = async () => {
    setRetryingVod(true);
    try {
      const { data, error } = await supabase.functions.invoke("twitch-fetch-last-vod", {
        body: { live_session_id: session.id },
      });
      if (error) throw error;
      const result = data as { vod_url?: string | null; reason?: string };
      if (result?.vod_url) {
        toast({ title: "VOD trouvée", description: "Les clips sont prêts à être générés." });
      } else {
        toast({
          title: "VOD pas encore disponible",
          description: "Réessaie dans quelques minutes ou ajoute une VOD manuellement.",
        });
      }
      await refetch();
    } catch (err) {
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Impossible de récupérer la VOD.",
        variant: "destructive",
      });
    } finally {
      setRetryingVod(false);
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

  if (candidates.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="mb-4 border-primary/30 bg-primary/[0.03]">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15">
              <Scissors className="h-4 w-4 text-primary-strong" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-foreground">
                  Clips proposés ({candidates.length})
                </p>
                {!hasVod && (
                  <Badge variant="muted" className="text-[10px]">
                    VOD indisponible
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Ces clips sont proposés à partir des signaux du live. Tu peux ajuster les
                moments avant génération.
              </p>
            </div>
          </div>

          {!hasVod && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/30 bg-warning/[0.06] px-3 py-2 text-xs">
              <div className="flex items-center gap-2 text-foreground">
                <AlertCircle className="h-4 w-4 text-warning" />
                La VOD Twitch n'est pas encore disponible. Tu peux réessayer ou envoyer
                ces clips comme idées dans la file de contenu.
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetryVod}
                disabled={retryingVod}
              >
                {retryingVod ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Rechercher la VOD
              </Button>
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
              const isReady = item.generation_status === "succeeded" && !!item.generated_video_url;
              const deepLink = buildVodDeepLink(item.source_video_url, item.source_start_time);

              return (
                <div
                  key={item.id}
                  className="rounded-lg border border-border/60 bg-card/60 p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="muted" className="text-[10px]">
                      {PLATFORM_LABEL[item.platform] ?? item.platform}
                    </Badge>
                    <Badge className={`text-[10px] ${tone}`} variant="outline">
                      {badge.label}
                    </Badge>
                    {item.opportunity_score !== null && (
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                        {getConfidenceLabel(item.opportunity_score)} ·{" "}
                        {item.opportunity_score}/100
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm font-medium text-foreground">{item.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.opportunity_reason ?? item.reason} · Moment estimé à{" "}
                    {formatVodTimestamp(item.source_start_time)} · {duration}s
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {isReady ? (
                      <Button asChild size="sm" variant="default">
                        <Link to="/content-queue">
                          <Sparkles className="h-3.5 w-3.5" />
                          Voir le clip généré
                        </Link>
                      </Button>
                    ) : autoGenEnabled && item.source_video_url ? (
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
                    ) : (
                      <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning text-[10px]">
                        Génération bientôt
                      </Badge>
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
                  </div>

                  {item.generation_error && (
                    <p className="mt-2 text-[11px] text-destructive">
                      La génération automatique a échoué. Tu peux modifier le timestamp ou
                      réessayer.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
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
                Début (secondes depuis le début du live)
              </Label>
              <Input
                id="start"
                type="number"
                min={0}
                value={editStart}
                onChange={(e) => setEditStart(Number(e.target.value))}
              />
              <p className="text-[11px] text-muted-foreground">
                {formatVodTimestamp(editStart)}
              </p>
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
    </>
  );
};

export default AutoClipCandidatesPanel;
