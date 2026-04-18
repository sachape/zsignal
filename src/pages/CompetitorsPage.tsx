import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Users } from "lucide-react";
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
import type { CompetitorMatch } from "@/types/analysis";

interface GroupConfig {
  type: "direct" | "catch-up" | "inspiration";
  title: string;
  description: string;
  badge: string;
}

const GROUPS: GroupConfig[] = [
  {
    type: "direct",
    title: "Concurrents directs",
    description: "Chaînes de taille comparable, mêmes format/langue, audience qui pourrait te regarder à la place.",
    badge: "Direct",
  },
  {
    type: "catch-up",
    title: "Chaînes à rattraper",
    description: "Un cran au-dessus, mais réalistes. Observe ce qui les a fait passer à l'étape suivante.",
    badge: "À rattraper",
  },
  {
    type: "inspiration",
    title: "Inspirations",
    description: "Chaînes plus avancées, utiles pour s'inspirer de patterns éditoriaux à long terme.",
    badge: "Inspiration",
  },
];

function copyMechanicFor(c: CompetitorMatch): string | undefined {
  if (c.content_format === "ranked") return "Une session ranked dédiée par semaine, sans variety au milieu.";
  if (c.content_format === "casting") return "Un format d'analyse court (10 min) en début ou fin de stream.";
  if (c.content_format === "chill") return "Un créneau 'chill' identifiable dans le planning.";
  if (c.content_format === "variety") return "Annoncer chaque variation 24h avant pour préparer l'audience.";
  return undefined;
}

const CompetitorsPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { account, loading: connectionLoading } = useTwitchConnection();
  const [report, setReport] = useState<SavedReport | null>(null);
  const [loading, setLoading] = useState(true);

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

  const opportunities = report.report.competitor_groups
    .flatMap((g) => g.matches)
    .filter((m) => copyMechanicFor(m))
    .slice(0, 3);

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
        />

        {GROUPS.map((g) => {
          const matches = report.report.competitor_groups.find((x) => x.type === g.type)?.matches ?? [];
          return (
            <section key={g.type} className="mb-8">
              <SectionHeader title={g.title} description={g.description} align="left" />
              {matches.length === 0 ? (
                <Card>
                  <CardContent className="flex items-center gap-3 p-5 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    Aucun match crédible pour le moment dans cette catégorie.
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

        {opportunities.length > 0 && (
          <section>
            <SectionHeader
              title="Opportunités à copier"
              description="Mécaniques précises observées sur des chaînes du benchmark."
              align="left"
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {opportunities.map((m) => (
                <StreamerBenchmarkCard
                  key={`copy-${m.id}`}
                  competitor={m}
                  copyMechanic={copyMechanicFor(m)}
                />
              ))}
            </div>
          </section>
        )}
      </PageContainer>
    </AppShell>
  );
};

export default CompetitorsPage;
