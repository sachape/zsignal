import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Zap,
  Trophy,
  Lightbulb,
  Clock,
  Target,
  Link2,
  ArrowRight,
  RefreshCw,
  FileText,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import PageHeader from "@/components/PageHeader";
import SectionHeader from "@/components/SectionHeader";
import ScoreCard from "@/components/ScoreCard";
import RecommendationCard from "@/components/RecommendationCard";
import StatBlock from "@/components/StatBlock";
import EmptyReportState from "@/components/EmptyReportState";
import ReportHistoryList from "@/components/ReportHistoryList";
import { LoadingState } from "@/components/StateView";
import ProgressRow from "@/components/ProgressRow";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useTwitchConnection } from "@/hooks/useTwitchConnection";
import {
  getLatestReport,
  getRecentReports,
  type SavedReport,
} from "@/services/reportRepository";

const categoryIcons: Record<string, typeof Clock> = {
  regularity: Clock,
  content: Lightbulb,
  positioning: Target,
  structure: Clock,
  monetization: Trophy,
  momentum: Zap,
  general: Lightbulb,
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

const daysSince = (iso: string) => {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
};

const DashboardPage = () => {
  const { user } = useAuth();
  const { isConnected } = useTwitchConnection();
  const [latest, setLatest] = useState<SavedReport | null>(null);
  const [history, setHistory] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [l, h] = await Promise.all([
        getLatestReport(user.id),
        getRecentReports(user.id, 5),
      ]);
      if (cancelled) return;
      setLatest(l);
      setHistory(h);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading) {
    return (
      <AppShell>
        <LoadingState />
      </AppShell>
    );
  }

  if (!latest) {
    return (
      <AppShell>
        <PageContainer size="sm">
          <PageHeader
            title="Bienvenue sur ton tableau de bord"
            description={
              isConnected
                ? "Lance ta première analyse pour démarrer."
                : "Tu peux lancer une analyse de démonstration ou connecter Twitch."
            }
          />
          <EmptyReportState />
        </PageContainer>
      </AppShell>
    );
  }

  const report = latest.report;
  const score = report.score;
  const ap = report.affiliate_progress;
  const summary = report.channel_summary;
  const priorityRecs = report.recommendations
    .filter((r) => r.type === "priority")
    .slice(0, 3);

  // Score delta vs previous report
  const previous = history.find((r) => r.id !== latest.id);
  const delta = previous ? score.overall - previous.report.score.overall : null;

  // Freshness
  const ageDays = daysSince(latest.created_at);
  const isFresh = ageDays <= 7;

  // Next milestone (the closest-to-target affiliate progress item)
  const milestones = [
    { label: "Followers", current: ap.followers.current, target: ap.followers.target },
    { label: "Viewers moyens", current: ap.avg_viewers.current, target: ap.avg_viewers.target },
    { label: "Jours de stream", current: ap.stream_days.current, target: ap.stream_days.target },
    { label: "Heures de stream", current: ap.stream_hours.current, target: ap.stream_hours.target },
  ];
  const nextMilestone = milestones
    .map((m) => ({ ...m, pct: Math.min(100, Math.round((m.current / m.target) * 100)) }))
    .filter((m) => m.pct < 100)
    .sort((a, b) => b.pct - a.pct)[0] ?? milestones.map((m) => ({ ...m, pct: 100 }))[0];

  return (
    <AppShell>
      <PageContainer>
        <PageHeader
          eyebrow="Tableau de bord"
          title={summary.display_name}
          description="Ton aperçu rapide — consulte le rapport complet pour le détail."
          action={
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to={`/result?report_id=${latest.id}`}>
                  <FileText className="h-4 w-4" /> Rapport complet
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/analyze">
                  <RefreshCw className="h-4 w-4" /> Relancer
                </Link>
              </Button>
            </div>
          }
        />

        {/* Status row: freshness + Twitch connection */}
        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              {isFresh ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-warning" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {isFresh ? "Analyse à jour" : "Analyse à rafraîchir"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Dernière analyse : {formatDate(latest.created_at)}
                  {ageDays > 0 && ` · il y a ${ageDays} j`}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Link2
                className={`h-4 w-4 shrink-0 ${isConnected ? "text-success" : "text-warning"}`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {isConnected ? "Twitch connecté" : "Twitch non connecté"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isConnected
                    ? "Tes prochaines analyses utiliseront tes vraies données."
                    : "Connecte Twitch pour des analyses personnalisées."}
                </p>
              </div>
              {!isConnected && (
                <Button asChild variant="outline" size="sm">
                  <Link to="/connect-twitch">Connecter</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Hero: score + delta + key stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-4">
          <ScoreCard score={score.overall} />
          <div className="flex flex-col gap-3 sm:col-span-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <StatBlock
                label="Évolution"
                value={delta === null ? "—" : delta > 0 ? `+${delta}` : String(delta)}
                subtext={
                  delta === null
                    ? "Première analyse"
                    : delta > 0
                      ? "depuis la dernière analyse"
                      : delta < 0
                        ? "depuis la dernière analyse"
                        : "stable"
                }
                accent={delta !== null && delta > 0}
              />
              <StatBlock
                label="Viewers moyens"
                value={String(summary.avg_viewers)}
                subtext="30 derniers jours"
              />
              <StatBlock
                label="Followers"
                value={String(summary.follower_count)}
                subtext={summary.broadcaster_type === "affiliate" ? "Affilié" : "Non affilié"}
              />
            </div>

            {/* Today's priority — single most important next action */}
            {report.next_best_action && (
              <Card className="border-accent/30 bg-accent/5">
                <CardContent className="p-4">
                  <div className="mb-1 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-accent" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-accent">
                      À faire aujourd'hui
                    </h3>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {report.next_best_action.title}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Next milestone (compact teaser, full breakdown lives on /result) */}
        <Card className="mb-8">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Prochain palier : {nextMilestone.label}
                </h3>
                <p className="text-xs text-muted-foreground">Progression vers l'affiliation</p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to={`/result?report_id=${latest.id}`}>
                  Détail <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
            <ProgressRow
              label={nextMilestone.label}
              value={`${nextMilestone.current} / ${nextMilestone.target}`}
              pct={nextMilestone.pct}
            />
          </CardContent>
        </Card>

        {/* Top 3 recos (teasers) */}
        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <SectionHeader title="À prioriser" align="left" />
            <Button asChild variant="ghost" size="sm">
              <Link to={`/result?report_id=${latest.id}`}>
                Toutes les actions <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {priorityRecs.map((rec) => (
              <RecommendationCard
                key={rec.id}
                icon={categoryIcons[rec.category] || Lightbulb}
                title={rec.title}
                reason={rec.reason}
                action={rec.action}
              />
            ))}
          </div>
        </section>

        {/* Recent analyses */}
        <section>
          <SectionHeader title="Analyses récentes" align="left" />
          <ReportHistoryList reports={history} />
        </section>
      </PageContainer>
    </AppShell>
  );
};

export default DashboardPage;
