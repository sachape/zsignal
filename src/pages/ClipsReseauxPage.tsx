import { useCallback, useEffect, useRef, useState, type ElementType } from "react";
import { Link } from "react-router-dom";
import {
  Clapperboard,
  Sparkles,
  Upload,
  Tv,
  Wand2,
  Video,
  Download,
  Send,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/hooks/usePlan";
import { hasPlanAtLeast } from "@/lib/planAccess";
import { supabase } from "@/integrations/supabase/client";
import { usePageMeta } from "@/hooks/usePageMeta";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { useActiveVideoJob } from "@/hooks/useVideoJobs";
import { getGenerationStageLabel } from "@/services/videoGeneration";
import { downloadClip } from "@/lib/downloadClip";
import { toast } from "@/hooks/use-toast";

interface RecentClip {
  id: string;
  status: string;
  output_storage_path: string | null;
  output_url: string | null;
  created_at: string;
  output_format: string;
}

const GENERATED_CLIPS_BUCKET = "creator-generated-clips";
const RECENT_CLIP_URL_TTL_SECONDS = 60 * 60;

const withFreshClipUrl = async (clip: RecentClip): Promise<RecentClip> => {
  if (!clip.output_storage_path) return clip;

  const { data, error } = await supabase.storage
    .from(GENERATED_CLIPS_BUCKET)
    .createSignedUrl(clip.output_storage_path, RECENT_CLIP_URL_TTL_SECONDS);

  return {
    ...clip,
    output_url: error ? clip.output_url : data?.signedUrl ?? clip.output_url,
  };
};

const ClipsReseauxPage = () => {
  usePageMeta({
    title: "Clips réseaux · Streamnco",
    description:
      "Transforme une VOD ou une vidéo en clip vertical prêt pour TikTok, Reels et Shorts.",
  });

  const { user } = useAuth();
  const { plan, loading: planLoading } = usePlan();
  const canAccess = hasPlanAtLeast(plan, "pro");

  const [recent, setRecent] = useState<RecentClip[]>([]);
  const [cameraDialogOpen, setCameraDialogOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = useCallback(async (clip: RecentClip) => {
    setDownloadingId(clip.id);
    try {
      await downloadClip({
        clipId: clip.id,
        storageBucket: GENERATED_CLIPS_BUCKET,
        storagePath: clip.output_storage_path,
        fallbackUrl: clip.output_url,
        platform: clip.output_format,
        createdAt: clip.created_at,
      });
    } catch {
      toast({
        title: "Téléchargement impossible",
        description: "Impossible de télécharger le clip. Réessaie.",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  }, []);

  const loadRecent = useCallback(async () => {
    if (!user) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from("creator_video_generation_jobs")
      .select("id, status, output_storage_path, output_url, created_at, output_format")
      .eq("user_id", user.id)
      .in("status", ["completed", "failed"])
      .order("created_at", { ascending: false })
      .limit(6);
    const clips = (data as RecentClip[] | null) ?? [];
    setRecent(
      await Promise.all(
        clips.map((c) => (c.status === "completed" ? withFreshClipUrl(c) : Promise.resolve(c))),
      ),
    );
  }, [user]);

  useEffect(() => {
    void loadRecent();
  }, [loadRecent]);

  // Show in-progress generation (after upload) so the user sees it's working.
  const { activeJob } = useActiveVideoJob();
  const prevActiveRef = useRef<string | null>(null);
  useEffect(() => {
    const cur = activeJob?.id ?? null;
    // A job just finished → refresh the completed clips grid.
    if (prevActiveRef.current && !cur) void loadRecent();
    prevActiveRef.current = cur;
  }, [activeJob, loadRecent]);

  const primaryCta = (
    <Button asChild className="gap-2" disabled={!canAccess}>
      <Link to={canAccess ? "/clips/vod-import" : "/billing"}>
        <Sparkles className="h-4 w-4" />
        Créer un clip
      </Link>
    </Button>
  );

  return (
    <AppShell>
      <PageContainer size="lg">
        <PageHeader
          title="Clips réseaux"
          description="Transforme une VOD ou une vidéo en clip vertical prêt pour TikTok, Reels et Shorts."
          action={primaryCta}
        />

        {!planLoading && !canAccess && (
          <Card className="mb-6 border-primary/30 bg-primary/5">
            <CardContent className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Badge variant="outline" className="mb-2 border-primary/40 bg-primary/10 text-primary">
                  Fonctionnalité Pro
                </Badge>
                <p className="text-sm font-medium text-foreground">
                  Génère des clips verticaux 9:16 prêts à publier.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Disponible avec les plans Pro et Growth.
                </p>
              </div>
              <Button asChild>
                <Link to="/billing">Passer au Pro</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Source picker removed — section tabs (Mes clips / Créer / Queue / Moments proposés) handle navigation. */}

        {/* Recent clips */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Mes clips</h2>

          </div>

          {activeJob && (
            <div className="mb-3 rounded-xl border border-primary/30 bg-primary/[0.06] p-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">Génération de ton clip en cours…</p>
                  <p className="text-xs text-muted-foreground">
                    {getGenerationStageLabel(activeJob.generation_stage)} · tu peux fermer, ça continue en arrière-plan.
                  </p>
                </div>
                {typeof activeJob.progress === "number" && (
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-primary">{activeJob.progress}%</span>
                )}
              </div>
              <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
                {typeof activeJob.progress === "number" ? (
                  <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${activeJob.progress}%` }} />
                ) : (
                  <div className="h-full w-1/3 animate-pulse rounded-full bg-primary/60" />
                )}
              </div>
            </div>
          )}

          {recent.length === 0 && !activeJob ? (
            <EmptyState
              icon={Clapperboard}
              title="Tes clips générés apparaîtront ici."
              description="Crée ton premier clip vertical depuis l'onglet Créer — Streamnco le prépare avec facecam, gameplay et sous-titres."
              ctaLabel={canAccess ? "Créer un clip" : "Passer au Pro"}
              ctaTo={canAccess ? "/clips/vod-import" : "/billing"}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {recent.map((clip) => (
                clip.status === "failed" ? (
                  <Card key={clip.id} className="overflow-hidden border-destructive/40 bg-destructive/[0.05]">
                    <div className="flex aspect-[9/16] w-full flex-col items-center justify-center gap-2 p-4 text-center">
                      <AlertTriangle className="h-6 w-6 text-destructive" />
                      <p className="text-sm font-semibold text-foreground">Génération échouée</p>
                      <p className="text-[11px] text-muted-foreground">Ce clip n'a pas pu être généré. Tu peux réessayer.</p>
                    </div>
                    <CardContent className="flex items-center justify-between gap-2 p-3">
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(clip.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                      </p>
                      <Button asChild size="sm" variant="outline" className="h-7 gap-1 px-2 text-[11px]">
                        <Link to="/clips/vod-import">Réessayer</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                <Card key={clip.id} className="overflow-hidden border-border/60 bg-card/60">
                  <div className="relative aspect-[9/16] w-full bg-muted">
                    {clip.output_url ? (
                      <video
                        src={clip.output_url}
                        className="h-full w-full object-cover"
                        controls
                        preload="metadata"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <Video className="h-6 w-6" />
                      </div>
                    )}
                    <div className="absolute left-2 top-2 flex gap-1.5">
                      <Badge variant="outline" className="border-primary/40 bg-background/80 text-[10px] text-primary">
                        9:16
                      </Badge>
                      <Badge variant="outline" className="border-border/60 bg-background/80 text-[10px] text-muted-foreground">
                        Caméra + gameplay
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="flex items-center justify-between gap-2 p-3">
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(clip.created_at).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                    <div className="flex gap-1.5">
                      {(clip.output_url || clip.output_storage_path) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 px-2 text-[11px]"
                          onClick={() => handleDownload(clip)}
                          disabled={downloadingId === clip.id}
                        >
                          {downloadingId === clip.id ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" /> Préparation…
                            </>
                          ) : (
                            <>
                              <Download className="h-3 w-3" /> Télécharger
                            </>
                          )}
                        </Button>
                      )}
                      <Button asChild size="sm" className="h-7 gap-1 px-2 text-[11px]">
                        <Link to="/composer">
                          <Send className="h-3 w-3" /> Publier
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                )
              ))}
            </div>
          )}
        </section>
      </PageContainer>
    </AppShell>
  );
};

interface SourceCardProps {
  icon: ElementType;
  title: string;
  description: string;
  to: string;
  disabled?: boolean;
}

const SourceCard = ({ icon: Icon, title, description, to, disabled }: SourceCardProps) => {
  const content = (
    <Card
      className={cn(
        "h-full border-border/60 bg-card/60 transition-all",
        disabled
          ? "opacity-60"
          : "hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5",
      )}
    >
      <CardContent className="flex flex-col gap-2 p-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
  if (disabled) return content;
  return (
    <Link to={to} className="block">
      {content}
    </Link>
  );
};

export default ClipsReseauxPage;
