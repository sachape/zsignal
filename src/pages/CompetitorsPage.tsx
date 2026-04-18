import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Trophy, Users } from "lucide-react";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import PageHeader from "@/components/PageHeader";
import SectionHeader from "@/components/SectionHeader";
import StreamerBenchmarkCard from "@/components/StreamerBenchmarkCard";
import EmptyReportState from "@/components/EmptyReportState";
import { LoadingState } from "@/components/StateView";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useTwitchConnection } from "@/hooks/useTwitchConnection";
import {
  getLatestReport,
  getLatestReportForPlatformUser,
  type SavedReport,
} from "@/services/reportRepository";
import {
  fetchLeaders,
  type LeaderChannel,
} from "@/services/leadersService";
import type { CompetitorMatch } from "@/types/analysis";

interface GroupConfig {
  type: "direct" | "catch-up" | "inspiration";
  title: string;
  description: string;
  badge: string;
  emptyHint: string;
}

const GROUPS: GroupConfig[] = [
  {
    type: "direct",
    title: "Concurrents directs",
    description: "Chaînes de taille comparable, mêmes format/langue, audience qui pourrait te regarder à la place.",
    badge: "Direct",
    emptyHint: "Pas de concurrent direct très proche pour le moment. Regarde plutôt les chaînes à rattraper et les inspirations ci-dessous.",
  },
  {
    type: "catch-up",
    title: "Chaînes à rattraper",
    description: "Un cran au-dessus, mais réalistes. Observe ce qui les a fait passer à l'étape suivante.",
    badge: "À rattraper",
    emptyHint: "Aucune chaîne intermédiaire crédible identifiée pour le moment.",
  },
  {
    type: "inspiration",
    title: "Inspirations",
    description: "Chaînes plus avancées, utiles pour s'inspirer de patterns éditoriaux à long terme.",
    badge: "Inspiration",
    emptyHint: "Pas d'inspiration solide identifiée. La page Classements peut t'aider à explorer ta niche.",
  },
];

function copyMechanicFor(c: CompetitorMatch): string | undefined {
  if (c.content_format === "ranked") return "Une session ranked dédiée par semaine, sans variety au milieu.";
  if (c.content_format === "casting") return "Un format d'analyse court (10 min) en début ou fin de stream.";
  if (c.content_format === "chill") return "Un créneau 'chill' identifiable dans le planning.";
  if (c.content_format === "variety") return "Annoncer chaque variation 24h avant pour préparer l'audience.";
  if (c.content_format === "educational") return "Un format tutoriel récurrent (même jour, même heure).";
  if (c.content_format === "reaction") return "Une rubrique réaction courte intégrée au début du live.";
  return undefined;
}

const GENERIC_MECHANICS = [
  "Un planning fixe affiché en bio (3 créneaux, mêmes jours chaque semaine).",
  "Un titre de stream construit en deux temps : objectif + accroche émotionnelle.",
  "Un clip court par stream, posté dans les 24h sur ton réseau le plus actif.",
  "Une catégorie principale assumée en premier titre, pour la découvrabilité.",
];

const CompetitorsPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { account, loading: connectionLoading } = useTwitchConnection();
  const [report, setReport] = useState<SavedReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [nicheLeaders, setNicheLeaders] = useState<LeaderChannel[]>([]);

  useEffect(() => {
    if (authLoading || connectionLoading || !user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const r = account?.platform_user_id
        ? await getLatestReportForPlatformUser(user.id, account.platform_user_id)
        : await getLatestReport(user.id);
      if (!cancelled) {
        setReport(r);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, account, authLoading, connectionLoading]);

  // Fallback: niche leaders pulled live from Twitch when the report has weak
  // or empty competitor groups. We use the dominant category as the seed.
  useEffect(() => {
    if (!report) return;
    const totalMatches = report.report.competitor_groups.reduce(
      (n, g) => n + g.matches.length,
      0,
    );
    if (totalMatches >= 5) {
      setNicheLeaders([]);
      return;
    }
    const cat = report.report.channel_summary.category || null;
    if (!cat) return;
    let cancelled = false;
    (async () => {
      const data = await fetchLeaders({ category: cat });
      if (!cancelled) setNicheLeaders(data.slice(0, 6));
    })();
    return () => {
      cancelled = true;
    };
  }, [report]);

  if (loading) {
    return (
      <AppShell>
        <LoadingState />
      </AppShell>
    );
  }

  if (!report) {
    return (
      <AppShell>
        <PageContainer size="sm">
          <EmptyReportState
            title="Pas encore de concurrents identifiés"
            description="Lance une analyse pour découvrir les chaînes qui comptent vraiment pour ta progression."
          />
        </PageContainer>
      </AppShell>
    );
  }

  const allMatches = report.report.competitor_groups.flatMap((g) => g.matches);
  const opportunities = allMatches
    .map((m) => ({ m, copy: copyMechanicFor(m) }))
    .filter((x) => x.copy)
    .slice(0, 3);

  // Always surface 3 mechanics worth copying. If the report didn't yield any,
  // fall back to category-level generic mechanics so the page never feels empty.
  const fallbackMechanics =
    opportunities.length >= 3
      ? []
      : GENERIC_MECHANICS.slice(0, 3 - opportunities.length);

  return (
    <AppShell>
      <PageContainer>
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2 text-muted-foreground hover:text-foreground">
          <Link to="/dashboard">
            <ArrowLeft className="h-3.5 w-3.5" /> Tableau de bord
          </Link>
        </Button>
        <PageHeader
          eyebrow="Benchmark"
          title="Concurrents & inspirations"
          description="Qui regarder, qui rattraper, et quelles mécaniques copier."
          action={
            <Button asChild variant="outline" size="sm">
              <Link to="/leaders">
                <Trophy className="h-3.5 w-3.5" /> Voir les classements
              </Link>
            </Button>
          }
        />

        {GROUPS.map((g) => {
          const matches = report.report.competitor_groups.find((x) => x.type === g.type)?.matches ?? [];
          return (
            <section key={g.type} className="mb-8">
              <SectionHeader title={g.title} description={g.description} align="left" />
              {matches.length === 0 ? (
                <Card>
                  <CardContent className="flex items-start gap-3 p-5 text-sm text-muted-foreground">
                    <Users className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>{g.emptyHint}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {matches.map((m) => (
                    <StreamerBenchmarkCard
                      key={m.id}
                      competitor={m}
                      groupLabel={g.badge}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}

        {/* Niche leaders fallback — only shown when groups are sparse */}
        {nicheLeaders.length > 0 && (
          <section className="mb-8">
            <SectionHeader
              title="Leaders de niche"
              description={`Chaînes qui pèsent dans ${report.report.channel_summary.category}. À regarder pour comprendre ce qui fonctionne en haut de la catégorie.`}
              align="left"
            />
            <div className="grid gap-3">
              {nicheLeaders.map((c, i) => (
                <Link
                  key={c.id}
                  to={`/streamer/${c.login}`}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/40"
                >
                  <span className="w-5 text-right text-xs font-semibold text-muted-foreground">
                    {i + 1}
                  </span>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/60 bg-muted text-[10px] font-semibold">
                    {c.thumbnail_url ? (
                      <img src={c.thumbnail_url} alt={c.login} className="h-full w-full object-cover" />
                    ) : (
                      c.login.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {c.display_name}{" "}
                      {c.is_live && (
                        <span className="ml-1 rounded-full bg-destructive/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-destructive">
                          Live
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      @{c.login}
                      {c.game_name ? ` · ${c.game_name}` : ""}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Opportunities to copy — always present (never empty) */}
        <section>
          <SectionHeader
            title="Opportunités à copier"
            description="Mécaniques précises observées sur des chaînes du benchmark, ou patterns génériques solides quand les données concurrents sont limitées."
            align="left"
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {opportunities.map(({ m, copy }) => (
              <StreamerBenchmarkCard
                key={`copy-${m.id}`}
                competitor={m}
                copyMechanic={copy}
              />
            ))}
            {fallbackMechanics.map((mech, i) => (
              <Card key={`generic-${i}`}>
                <CardContent className="flex h-full flex-col gap-2 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                    Mécanique générique
                  </p>
                  <p className="text-sm text-foreground">{mech}</p>
                  <p className="mt-auto text-xs text-muted-foreground">
                    À tester cette semaine, mesurer 14 jours.
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </PageContainer>
    </AppShell>
  );
};

export default CompetitorsPage;
