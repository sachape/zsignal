import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Clapperboard,
  Sparkles,
  Upload,
  Twitch,
  Wand2,
  Video,
  Download,
  Send,
  Settings as SettingsIcon,
  Check,
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

interface RecentClip {
  id: string;
  output_url: string | null;
  created_at: string;
  output_format: string;
}

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
  const [hasCameraPreset] = useState(false); // preset feature not yet wired

  const loadRecent = useCallback(async () => {
    if (!user) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from("creator_video_generation_jobs")
      .select("id, output_url, created_at, output_format")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(6);
    setRecent((data as RecentClip[] | null) ?? []);
  }, [user]);

  useEffect(() => {
    void loadRecent();
  }, [loadRecent]);

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

        {/* Sources */}
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Choisis une source</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <SourceCard
              icon={Twitch}
              title="Coller une VOD Twitch"
              description="À partir d'une URL de VOD."
              to="/clips/vod-import"
              disabled={!canAccess}
            />
            <SourceCard
              icon={Upload}
              title="Importer une vidéo"
              description="Upload manuel d'un fichier vidéo."
              to="/clips/vod-import"
              disabled={!canAccess}
            />
            <SourceCard
              icon={Wand2}
              title="Moment proposé"
              description="Depuis un clip détecté par Streamnco."
              to="/clips"
              disabled={!canAccess}
            />
          </div>
        </section>

        {/* Camera config */}
        <section className="mb-8">
          <Card className="border-border/60 bg-card/60">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-md bg-primary/10 p-2 text-primary">
                  <Video className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Format réseaux</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Caméra en haut, gameplay en bas, prêt pour TikTok, Reels et Shorts.
                  </p>
                  {hasCameraPreset ? (
                    <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                      <Check className="h-3.5 w-3.5" /> Format caméra configuré
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Configure ta caméra une fois pour générer tes clips au bon format.
                    </p>
                  )}
                </div>
              </div>
              <Button asChild variant="outline" className="gap-2">
                <Link to="/settings">
                  <SettingsIcon className="h-4 w-4" />
                  {hasCameraPreset ? "Modifier ma caméra" : "Configurer ma caméra"}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Recent clips */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Derniers clips générés</h2>
            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link to="/content-queue">Suivre dans la Content Queue</Link>
            </Button>
          </div>
          {recent.length === 0 ? (
            <Card className="border-border/60 bg-card/40">
              <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
                <Clapperboard className="h-6 w-6 text-muted-foreground" />
                <p className="text-sm text-foreground">Aucun clip généré pour l'instant.</p>
                <p className="text-xs text-muted-foreground">
                  Lance ta première génération depuis une VOD Twitch ou un import vidéo.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {recent.map((clip) => (
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
                      {clip.output_url && (
                        <Button asChild size="sm" variant="outline" className="h-7 gap-1 px-2 text-[11px]">
                          <a href={clip.output_url} download target="_blank" rel="noopener noreferrer">
                            <Download className="h-3 w-3" /> Télécharger
                          </a>
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
              ))}
            </div>
          )}
        </section>
      </PageContainer>
    </AppShell>
  );
};

interface SourceCardProps {
  icon: React.ElementType;
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
