import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Trophy, Users, Info } from "lucide-react";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import PageHeader from "@/components/PageHeader";
import SectionHeader from "@/components/SectionHeader";
import StreamerBenchmarkCard from "@/components/StreamerBenchmarkCard";
import OpportunityCard from "@/components/OpportunityCard";
import EmptyReportState from "@/components/EmptyReportState";
import { LoadingState } from "@/components/StateView";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useTwitchConnection } from "@/hooks/useTwitchConnection";
import {
  getLatestReport,
  getLatestReportForPlatformUser,
  type SavedReport,
} from "@/services/reportRepository";
import { fetchLeaders, type LeaderChannel } from "@/services/leadersService";
import { buildCopyableOpportunities } from "@/services/opportunityEngine";

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
    description:
      "Chaînes de taille comparable, mêmes format/langue, audience qui pourrait te regarder à la place.",
    badge: "Direct",
    emptyHint:
      "Pas de concurrent direct très proche pour le moment. Voici plutôt des chaînes à observer, des inspirations, et des mécaniques à copier.",
  },
  {
    type: "catch-up",
    title: "Chaînes à rattraper",
    description:
      "Un cran au-dessus, mais réalistes. Observe ce qui les a fait passer à l'étape suivante.",
    badge: "À rattraper",
    emptyHint:
      "Aucune chaîne intermédiaire crédible identifiée pour le moment. Regarde les leaders de niche plus bas pour repérer ce qui marche en haut.",
  },
  {
    type: "inspiration",
    title: "Inspirations",
    description:
      "Chaînes plus avancées, utiles pour s'inspirer de patterns éditoriaux à long terme.",
    badge: "Inspiration",
    emptyHint:
      "Pas d'inspiration solide identifiée. Les leaders de niche ci-dessous sont une bonne base d'observation.",
  },
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

  // Always try to fetch niche leaders when groups are sparse, so the page
  // never collapses to an empty benchmark experience for low-data accounts.
  useEffect(() => {
    if (!report) return;
    const totalMatches = report.report.competitor_groups.reduce(
      (n, g) => n + g.matches.length,
      0,
    );
    const cat = report.report.channel_summary.category || null;
    if (!cat) return;
    if (totalMatches >= 6) {
      setNicheLeaders([]);
      return;
    }
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

  const directMatches = report.report.competitor_groups.find(
    (g) => g.type === "direct",
  )?.matches ?? [];
  const directIsWeak = directMatches.length === 0;

  const opportunities = buildCopyableOpportunities(report.report);
  const category = report.report.channel_summary.category;

  return (
    <AppShell>
      <PageContainer>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
        >
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

        {/* Reframed header when no strong direct competitor exists */}
        {directIsWeak && (
          <Card className="mb-6 border-primary/30 bg-primary/5">
            <CardContent className="flex items-start gap-3 p-4">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  Pas de concurrent direct très proche pour le moment.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Voici plutôt des chaînes à observer, des inspirations, et des
                  mécaniques à copier — adaptées à ton stade actuel. Le
                  benchmark reste utile même sans match parfait.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {GROUPS.map((g) => {
          const matches =
            report.report.competitor_groups.find((x) => x.type === g.type)
              ?.matches ?? [];
          return (
            <section key={g.type} className="mb-8">
              <div className="mb-3 flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] text-primary">
                  {g.badge}
                </Badge>
                <SectionHeader title={g.title} description={g.description} align="left" />
              </div>
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

        {/* Niche leaders fallback — surfaced whenever groups are sparse */}
        {nicheLeaders.length > 0 && (
          <section className="mb-8">
            <div className="mb-3 flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] text-primary">
                Leader de niche
              </Badge>
              <SectionHeader
                title="Leaders de niche"
                description={
                  category
                    ? `Chaînes qui pèsent dans ${category}. À regarder pour comprendre ce qui fonctionne en haut de la catégorie.`
                    : "Chaînes qui pèsent dans ta catégorie principale."
                }
                align="left"
              />
            </div>
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
                    {c.profile_image_url ? (
                      <img
                        src={c.profile_image_url}
                        alt={c.login}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      c.login.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {c.display_name}
                      </p>
                      <Badge
                        variant="outline"
                        className="shrink-0 text-[9px] text-primary"
                      >
                        Leader de niche
                      </Badge>
                      {c.is_live && (
                        <span className="rounded-full bg-destructive/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-destructive">
                          Live
                        </span>
                      )}
                    </div>
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

        {/* Opportunities to copy — always present, never empty */}
        <section>
          <SectionHeader
            title="Opportunités à copier"
            description="Mécaniques précises à mettre en place cette semaine. Tirées de ton blocage actuel et, quand c'est possible, de chaînes du benchmark."
            align="left"
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {opportunities.map((op) => (
              <OpportunityCard key={op.id} opportunity={op} />
            ))}
          </div>
        </section>
      </PageContainer>
    </AppShell>
  );
};

export default CompetitorsPage;
