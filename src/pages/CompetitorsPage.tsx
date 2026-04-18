import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Trophy, Users, Info, Bug } from "lucide-react";
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
import { fetchLiveTwitchProfile } from "@/services/twitchLiveProfile";
import {
  buildCompetitorGroups,
  inspectCompetitorPool,
  type CandidateChannel,
  type CompetitorPoolDebug,
  type TargetSignal,
} from "@/services/competitorEngine";
import type { AnalysisReport, CompetitorGroup, CompetitorMatch } from "@/types/analysis";

interface RenderSection {
  key: string;
  title: string;
  description: string;
  badge: string;
  matches: CompetitorMatch[];
  emptyHint: string;
}

const CompetitorsPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { account, loading: connectionLoading } = useTwitchConnection();
  const [report, setReport] = useState<SavedReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [nicheLeaders, setNicheLeaders] = useState<LeaderChannel[]>([]);
  const [liveGroups, setLiveGroups] = useState<CompetitorGroup[] | null>(null);
  const [debug, setDebug] = useState<CompetitorPoolDebug | null>(null);

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
      }

      if (!cancelled && account?.platform_user_id) {
        try {
          const liveProfile = await fetchLiveTwitchProfile();
          const target: TargetSignal = {
            login:
              account.platform_login ??
              liveProfile.profile?.login ??
              r?.report.identity?.platform_login ??
              r?.report.channel_summary.channel_name ??
              "",
            language: "fr",
            dominant_category:
              liveProfile.dominant_category ?? r?.report.channel_summary.category ?? null,
            recent_titles: liveProfile.videos.slice(0, 10).map((v) => v.title),
            channel_type: "solo",
            content_format: "unknown",
            size_proxy:
              liveProfile.follower_count ??
              liveProfile.profile?.view_count ??
              r?.report.channel_summary.follower_count ??
              r?.report.channel_summary.avg_viewers * 1000 ??
              0,
          };
          const candidates = liveProfile.competitors.map<CandidateChannel>((c) => ({
            id: c.id,
            login: c.login,
            display_name: c.display_name,
            broadcaster_type: c.broadcaster_type,
            description: c.description,
            is_live: c.is_live,
            live_title: c.title,
            live_viewer_count: c.live_viewer_count ?? null,
            game_name: c.game_name,
            language: c.language,
            recent_titles: c.title ? [c.title] : [],
            view_count: c.view_count,
          }));

          const computedGroups = buildCompetitorGroups({
            target,
            candidates,
            teaser: false,
          });
          const poolDebug = inspectCompetitorPool({
            target,
            candidates,
            teaser: false,
          });

          if (!cancelled) {
            setLiveGroups(computedGroups);
            setDebug(poolDebug);
          }
        } catch {
          if (!cancelled) {
            setLiveGroups(null);
            setDebug(null);
          }
        }
      } else if (!cancelled) {
        setLiveGroups(null);
        setDebug(null);
      }

      if (!cancelled) {
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, account, authLoading, connectionLoading]);

  const effectiveGroups = useMemo(() => {
    if (liveGroups && liveGroups.length > 0) return liveGroups;
    return report?.report.competitor_groups ?? [];
  }, [liveGroups, report]);

  const allMatches = useMemo(
    () => effectiveGroups.flatMap((group) => group.matches),
    [effectiveGroups],
  );

  const directMatches = useMemo(
    () => allMatches.filter((m) => m.group === "direct"),
    [allMatches],
  );
  const confirmedDirect = useMemo(
    () => directMatches.filter((m) => !m.is_potential),
    [directMatches],
  );
  const potentialDirect = useMemo(
    () => directMatches.filter((m) => m.is_potential),
    [directMatches],
  );
  const catchUpMatches = useMemo(
    () => allMatches.filter((m) => m.group === "catch-up"),
    [allMatches],
  );
  const inspirationMatches = useMemo(
    () => allMatches.filter((m) => m.group === "inspiration"),
    [allMatches],
  );

  const benchmarkReport: AnalysisReport | null = useMemo(() => {
    if (!report) return null;
    if (liveGroups) {
      return { ...report.report, competitor_groups: liveGroups };
    }
    return report.report;
  }, [report, liveGroups]);

  const opportunities = useMemo(
    () => (benchmarkReport ? buildCopyableOpportunities(benchmarkReport) : []),
    [benchmarkReport],
  );

  const renderSections: RenderSection[] = useMemo(() => {
    const sections: RenderSection[] = [];

    if (confirmedDirect.length > 0) {
      sections.push({
        key: "direct-confirmed",
        title: "Concurrents directs",
        description:
          "Chaînes de taille comparable, mêmes format/langue, audience qui pourrait te regarder à la place.",
        badge: "Direct",
        matches: confirmedDirect,
        emptyHint: "",
      });
    }

    if (potentialDirect.length > 0) {
      sections.push({
        key: "direct-potential",
        title: confirmedDirect.length > 0 ? "Concurrents directs potentiels" : "À observer de près",
        description:
          "Profils crédibles et proches, mais avec un ou plusieurs signaux encore incomplets. À confirmer via l'inspection de profil.",
        badge: "Direct potentiel",
        matches: potentialDirect,
        emptyHint: "",
      });
    }

    if (catchUpMatches.length > 0) {
      sections.push({
        key: "catch-up",
        title: "Chaînes à rattraper",
        description:
          "Un cran au-dessus, mais réalistes. Observe ce qui les a fait passer à l'étape suivante.",
        badge: "À rattraper",
        matches: catchUpMatches,
        emptyHint: "",
      });
    }

    if (inspirationMatches.length > 0) {
      sections.push({
        key: "inspiration",
        title: "Inspirations",
        description:
          "Chaînes plus avancées, utiles pour s'inspirer de patterns éditoriaux à long terme.",
        badge: "Inspiration",
        matches: inspirationMatches,
        emptyHint: "",
      });
    }

    return sections;
  }, [confirmedDirect, potentialDirect, catchUpMatches, inspirationMatches]);

  useEffect(() => {
    if (!benchmarkReport) return;
    const totalMatches = benchmarkReport.competitor_groups.reduce(
      (n, g) => n + g.matches.length,
      0,
    );
    const cat = benchmarkReport.channel_summary.category || null;
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
  }, [benchmarkReport]);

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

  const directIsWeak = confirmedDirect.length === 0;
  const onlyPotentials = directIsWeak && potentialDirect.length > 0;
  const category = benchmarkReport?.channel_summary.category ?? report.report.channel_summary.category;
  const hasRenderableBenchmark = renderSections.length > 0;
  const copyMechanicsCount = opportunities.length;

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

        {import.meta.env.DEV && debug && (
          <Card className="mb-6 border-border/70 bg-card/60">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center gap-2">
                <Bug className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Benchmark debug</p>
                <Badge variant="outline" className="text-[10px] text-primary">DEV only</Badge>
              </div>
              <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
                <p>Total candidats: <span className="text-foreground">{debug.total_candidates}</span></p>
                <p>Direct confirmés: <span className="text-foreground">{debug.direct_confirmed}</span></p>
                <p>Direct potentiels: <span className="text-foreground">{debug.direct_potential}</span></p>
                <p>À rattraper: <span className="text-foreground">{debug.catch_up}</span></p>
                <p>Inspirations: <span className="text-foreground">{debug.inspiration}</span></p>
                <p>Copy mechanics: <span className="text-foreground">{copyMechanicsCount}</span></p>
              </div>
              {debug.filtered_out.length > 0 && (
                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">Filtrés</p>
                  {debug.filtered_out.slice(0, 8).map((item) => (
                    <p key={`${item.stage}-${item.login}`}>
                      @{item.login} · {item.stage === "excluded" ? "exclu" : "confiance faible"} · {item.reason}
                    </p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {directIsWeak && (
          <Card className="mb-6 border-primary/30 bg-primary/5">
            <CardContent className="flex items-start gap-3 p-4">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {onlyPotentials
                    ? "Concurrents directs potentiels — à confirmer."
                    : "Pas de concurrent direct très proche pour le moment."}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {onlyPotentials
                    ? "Le moteur a identifié des profils crédibles mais sans tous les signaux nécessaires pour les confirmer. Inspecte chaque profil pour valider la pertinence."
                    : "Voici plutôt des chaînes à observer, des inspirations, et des mécaniques à copier — adaptées à ton stade actuel. Le benchmark reste utile même sans match parfait."}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {hasRenderableBenchmark ? (
          renderSections.map((section) => (
            <section key={section.key} className="mb-8">
              <div className="mb-3 flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] text-primary">
                  {section.badge}
                </Badge>
                <SectionHeader
                  title={section.title}
                  description={section.description}
                  align="left"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {section.matches.map((m) => (
                  <StreamerBenchmarkCard
                    key={m.id}
                    competitor={m}
                    groupLabel={section.badge}
                  />
                ))}
              </div>
            </section>
          ))
        ) : (
          <section className="mb-8">
            <div className="mb-3 flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] text-primary">
                Benchmark
              </Badge>
              <SectionHeader
                title="Aucun match confirmé pour l'instant"
                description="Le moteur n'a pas validé de concurrent visible dans les groupes principaux. Les leaders de niche et les opportunités restent affichés pour garder une page utile."
                align="left"
              />
            </div>
            <Card>
              <CardContent className="flex items-start gap-3 p-5 text-sm text-muted-foreground">
                <Users className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Aucun concurrent confirmé, potentiel, à rattraper ou inspiration n'a été rendu depuis le benchmark actif. Consulte les leaders de niche et les opportunités à copier ci-dessous.
                </p>
              </CardContent>
            </Card>
          </section>
        )}

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
