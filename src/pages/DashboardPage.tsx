import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Zap,
  TrendingDown,
  Trophy,
  Lightbulb,
  Clock,
  Target,
  Users,
  Link2,
  ArrowRight,
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
import CompetitorFeedbackBar from "@/components/CompetitorFeedbackBar";
import { LoadingState } from "@/components/StateView";
import ProgressRow from "@/components/ProgressRow";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const direct = report.competitor_groups.find((g) => g.type === "direct");

  return (
    <AppShell>
      <PageContainer>
        <PageHeader
          eyebrow="Tableau de bord"
          title={summary.display_name}
          description={`Dernière analyse : ${formatDate(latest.created_at)}`}
          action={
            <Button asChild>
              <Link to="/analyze">
                Relancer une analyse <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          }
        />

        {!isConnected && (
          <Card className="mb-6 border-primary/30 bg-primary/5">
            <CardContent className="flex items-center justify-between gap-4 p-4">
              <div className="flex items-center gap-3">
                <Link2 className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Connecte Twitch pour des analyses live
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Tes prochaines analyses utiliseront tes vraies données.
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to="/connect-twitch">Connecter</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="mb-8 grid gap-4 sm:grid-cols-4">
          <ScoreCard score={score.overall} />
          <div className="flex flex-col gap-3 sm:col-span-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <StatBlock
                label="Viewers moyens"
                value={String(summary.avg_viewers)}
                subtext="30 derniers jours"
              />
              <StatBlock
                label="Régularité"
                value={`${score.regularity}%`}
                subtext={`${ap.stream_days.current}/${ap.stream_days.target} jours`}
              />
              <StatBlock
                label="Contenu"
                value={`${score.content}%`}
                subtext={`${report.facts.find((f) => f.key === "clips_30d")?.value ?? 0} clips`}
                accent
              />
            </div>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-warning" />
                  <p className="text-sm font-semibold text-foreground">
                    Point faible : {report.weak_point.label}
                  </p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {report.weak_point.description}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {report.next_best_action && (
          <Card className="mb-8 border-accent/30 bg-accent/5">
            <CardContent className="p-5">
              <div className="mb-1.5 flex items-center gap-2">
                <Zap className="h-4 w-4 text-accent" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-accent">
                  Action prioritaire
                </h3>
              </div>
              <p className="text-sm font-semibold text-foreground">
                {report.next_best_action.title}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {report.next_best_action.reason}
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Progression vers l'affiliation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Followers", current: ap.followers.current, target: ap.followers.target },
              { label: "Viewers moyens", current: ap.avg_viewers.current, target: ap.avg_viewers.target },
              { label: "Jours de stream", current: ap.stream_days.current, target: ap.stream_days.target },
              { label: "Heures de stream", current: ap.stream_hours.current, target: ap.stream_hours.target },
            ].map((item) => {
              const pct = Math.min(100, Math.round((item.current / item.target) * 100));
              return (
                <div key={item.label}>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{item.label}</span>
                    <span className="text-foreground">
                      {item.current} / {item.target}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <section className="mb-8">
          <SectionHeader title="Top 3 recommandations" align="left" />
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

        {direct && direct.matches.length > 0 && (
          <section className="mb-8">
            <SectionHeader title="Concurrents directs" align="left" />
            <div className="space-y-3">
              {direct.matches.slice(0, 3).map((c) => (
                <Card key={c.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
                        <Users className="h-5 w-5 text-accent" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">
                          {c.display_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(c.follower_count / 1000).toFixed(1)}K abonnés ·{" "}
                          {c.match_reasons.join(" · ")}
                        </p>
                      </div>
                      <div className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                        {c.similarity_score}% similaire
                      </div>
                    </div>
                    <CompetitorFeedbackBar
                      reportId={latest.id}
                      competitorKey={c.competitor_login}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        <section>
          <SectionHeader title="Analyses récentes" align="left" />
          <ReportHistoryList reports={history} />
        </section>
      </PageContainer>
    </AppShell>
  );
};

export default DashboardPage;
