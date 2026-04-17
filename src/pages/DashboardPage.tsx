import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Loader2,
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
import ScoreCard from "@/components/ScoreCard";
import RecommendationCard from "@/components/RecommendationCard";
import CompetitorCard from "@/components/CompetitorCard";
import StatBlock from "@/components/StatBlock";
import SectionHeader from "@/components/SectionHeader";
import EmptyReportState from "@/components/EmptyReportState";
import ReportHistoryList from "@/components/ReportHistoryList";
import CompetitorFeedbackBar from "@/components/CompetitorFeedbackBar";
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
        <div className="flex min-h-[70vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (!latest) {
    return (
      <AppShell>
        <div className="container mx-auto max-w-3xl px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 text-center"
          >
            <h1 className="text-2xl font-extrabold text-foreground">
              Bienvenue sur ton tableau de bord
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {isConnected
                ? "Lance ta première analyse pour démarrer."
                : "Tu peux lancer une analyse de démonstration ou connecter Twitch."}
            </p>
          </motion.div>
          <EmptyReportState />
        </div>
      </AppShell>
    );
  }

  const report = latest.report;
  const score = report.score;
  const ap = report.affiliate_progress;
  const summary = report.channel_summary;
  const priorityRecs = report.recommendations.filter((r) => r.type === "priority").slice(0, 3);
  const direct = report.competitor_groups.find((g) => g.type === "direct");

  return (
    <AppShell>
      <div className="container mx-auto max-w-5xl px-4 py-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-wrap items-end justify-between gap-4"
        >
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Tableau de bord
            </p>
            <h1 className="text-2xl font-extrabold text-foreground">
              {summary.display_name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Dernière analyse : {formatDate(latest.created_at)}
            </p>
          </div>
          <Link
            to="/analyze"
            className="inline-flex items-center gap-2 rounded-lg gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Relancer une analyse <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>

        {/* Twitch banner */}
        {!isConnected && (
          <div className="mb-8 flex items-center justify-between gap-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
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
            <Link
              to="/connect-twitch"
              className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
            >
              Connecter
            </Link>
          </div>
        )}

        {/* Score + stats */}
        <div className="mb-10 grid gap-6 sm:grid-cols-4">
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
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-warning" />
                <p className="text-sm font-semibold text-foreground">
                  Point faible : {report.weak_point.label}
                </p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {report.weak_point.description}
              </p>
            </div>
          </div>
        </div>

        {/* Next best action */}
        {report.next_best_action && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10 rounded-xl border border-accent/30 bg-accent/5 p-6"
          >
            <div className="mb-2 flex items-center gap-2">
              <Zap className="h-5 w-5 text-accent" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-accent">
                Action prioritaire
              </h3>
            </div>
            <p className="text-sm font-semibold text-foreground">
              {report.next_best_action.title}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {report.next_best_action.reason}
            </p>
          </motion.div>
        )}

        {/* Affiliate progress */}
        <div className="mb-10 rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Progression vers l'affiliation
          </h3>
          <div className="space-y-3">
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
                      className="h-full rounded-full gradient-primary"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recommendations */}
        <div className="mb-10">
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
        </div>

        {/* Competitors with feedback */}
        {direct && direct.matches.length > 0 && (
          <div className="mb-10">
            <SectionHeader title="Concurrents directs" align="left" />
            <div className="space-y-3">
              {direct.matches.slice(0, 3).map((c) => (
                <div key={c.id} className="rounded-xl border border-border bg-card p-4">
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
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History */}
        <div className="mb-10">
          <SectionHeader title="Analyses récentes" align="left" />
          <ReportHistoryList reports={history} />
        </div>
      </div>
    </AppShell>
  );
};

export default DashboardPage;
