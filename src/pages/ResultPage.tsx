import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  User,
  TrendingDown,
  Clock,
  Target,
  Lightbulb,
  Lock,
  Zap,
  Trophy,
  Users,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import AppShell from "@/components/AppShell";
import ScoreCard from "@/components/ScoreCard";
import CompetitorCard from "@/components/CompetitorCard";
import RecommendationCard from "@/components/RecommendationCard";
import LockedOverlay from "@/components/LockedOverlay";
import StatBlock from "@/components/StatBlock";
import SectionHeader from "@/components/SectionHeader";
import EmptyReportState from "@/components/EmptyReportState";
import CompetitorFeedbackBar from "@/components/CompetitorFeedbackBar";
import { assembleReport } from "@/services/reportAssembler";
import { allMockStreamers, nexaGaming } from "@/data/mockStreamers";
import {
  getLatestReport,
  getReportById,
  getReportByJobId,
  type SavedReport,
} from "@/services/reportRepository";
import type { AnalysisReport, MockStreamerData } from "@/types/analysis";

const categoryIcons: Record<string, typeof Clock> = {
  regularity: Clock,
  content: Lightbulb,
  positioning: Target,
  structure: Clock,
  monetization: Trophy,
  momentum: Zap,
  general: Lightbulb,
};

const ResultPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const reportId = searchParams.get("report_id");
  const legacyJobId = searchParams.get("jobId");
  const channel = searchParams.get("channel");

  const [saved, setSaved] = useState<SavedReport | null>(null);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setNotFound(false);
      setSaved(null);
      setReport(null);

      // 1. Persisted report path by stable report_id
      if (reportId && user) {
        const r = await getReportById(reportId, user.id);
        if (cancelled) return;
        if (r) {
          setSaved(r);
          setReport(r.report);
          setNotFound(false);
        } else {
          setNotFound(true);
        }
        setLoading(false);
        return;
      }

      // 2. Backward compatibility for old jobId links
      if (legacyJobId && user) {
        const r = await getReportByJobId(legacyJobId, user.id);
        if (cancelled) return;
        if (r) {
          setSaved(r);
          setReport(r.report);
          setNotFound(false);
          navigate(`/result?report_id=${r.id}`, { replace: true });
        } else {
          setNotFound(true);
        }
        setLoading(false);
        return;
      }

      // 3. Authenticated fallback: latest persisted report
      if (user) {
        const r = await getLatestReport(user.id);
        if (cancelled) return;
        if (r) {
          setSaved(r);
          setReport(r.report);
          setNotFound(false);
          navigate(`/result?report_id=${r.id}`, { replace: true });
        } else {
          setNotFound(true);
        }
        setLoading(false);
        return;
      }

      // 4. Teaser path (landing flow): mock data by channel name
      if (channel) {
        const data: MockStreamerData =
          (allMockStreamers as Record<string, MockStreamerData>)[channel.toLowerCase()] ||
          nexaGaming;
        setReport(assembleReport(data, `teaser-${channel}`));
        setNotFound(false);
        setLoading(false);
        return;
      }

      // 5. No params, no data
      setNotFound(true);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [reportId, legacyJobId, channel, user, authLoading, navigate]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[70vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (notFound || !report) {
    return (
      <AppShell>
        <div className="container mx-auto max-w-3xl px-4 py-16">
          <EmptyReportState
            title="Aucun rapport trouvé"
            description="Le rapport demandé n'existe pas ou ne t'appartient pas. Lance une nouvelle analyse pour commencer."
          />
        </div>
      </AppShell>
    );
  }

  const isPersisted = !!saved;
  const ctaLink = user ? "/connect-twitch" : "/auth?redirect=/connect-twitch";
  const summary = report.channel_summary;
  const score = report.score;
  const ap = report.affiliate_progress;
  const priorityRecs = report.recommendations.filter((r) => r.type === "priority").slice(0, 3);
  const nextAction = report.next_best_action;
  const directCompetitors = report.competitor_groups.find((g) => g.type === "direct");

  return (
    <AppShell>
      <div className="container mx-auto max-w-4xl px-4 py-10">
        {/* Channel Identity */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 flex items-center gap-4 rounded-xl border border-border bg-card p-6"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <User className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">{summary.display_name}</h1>
            <p className="text-sm text-muted-foreground">
              {summary.category} · ~{summary.avg_viewers} viewers moyens · {summary.follower_count} followers
              {summary.broadcaster_type === "affiliate" && " · Affilié"}
            </p>
          </div>
        </motion.div>

        {/* Score + Stats */}
        <div className="mb-10 grid gap-6 sm:grid-cols-4">
          <ScoreCard score={score.overall} />
          <div className="flex flex-col gap-3 sm:col-span-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <StatBlock label="Viewers moyens" value={String(summary.avg_viewers)} subtext="30 derniers jours" />
              <StatBlock label="Régularité" value={`${score.regularity}%`} subtext={`${ap.stream_days.current}/${ap.stream_days.target} jours`} />
              <StatBlock label="Contenu" value={`${score.content}%`} subtext={`${report.facts.find(f => f.key === 'clips_30d')?.value ?? 0} clips`} accent />
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-warning" />
                <p className="text-sm font-semibold text-foreground">Point faible clé : {report.weak_point.label}</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{report.weak_point.description}</p>
            </div>
          </div>
        </div>

        {/* Next Best Action */}
        {nextAction && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10 rounded-xl border border-accent/30 bg-accent/5 p-6"
          >
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-5 w-5 text-accent" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-accent">Action suivante</h3>
            </div>
            <p className="text-sm font-semibold text-foreground">{nextAction.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{nextAction.reason}</p>
          </motion.div>
        )}

        {/* Competitor Teaser */}
        <div className="mb-10">
          <SectionHeader title="Concurrents similaires" align="left" />
          {directCompetitors?.matches[0] && (
            <div>
              <CompetitorCard
                name={directCompetitors.matches[0].display_name}
                followers={`${(directCompetitors.matches[0].follower_count / 1000).toFixed(1)}K`}
                similarity={directCompetitors.matches[0].similarity_score}
                reasons={directCompetitors.matches[0].match_reasons}
              />
              {isPersisted && saved && (
                <CompetitorFeedbackBar
                  reportId={saved.id}
                  competitorKey={directCompetitors.matches[0].competitor_login}
                />
              )}
            </div>
          )}
          {!isPersisted && (
            <div className="relative mt-3">
              <CompetitorCard name="" followers="" similarity={0} locked />
              <LockedOverlay message="Connecte Twitch pour voir plus de concurrents" cta="Débloquer" />
            </div>
          )}
        </div>

        {/* Affiliate Progress */}
        <div className="relative mb-10 rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Progression vers l'affiliation
          </h3>
          <div className="space-y-3">
            {[
              { label: "Followers", value: `${ap.followers.current} / ${ap.followers.target}`, pct: Math.min(100, Math.round((ap.followers.current / ap.followers.target) * 100)) },
              { label: "Viewers moyens", value: `${ap.avg_viewers.current} / ${ap.avg_viewers.target}`, pct: Math.min(100, Math.round((ap.avg_viewers.current / ap.avg_viewers.target) * 100)) },
              { label: "Jours de stream", value: `${ap.stream_days.current} / ${ap.stream_days.target}`, pct: Math.min(100, Math.round((ap.stream_days.current / ap.stream_days.target) * 100)) },
              { label: "Heures de stream", value: `${ap.stream_hours.current} / ${ap.stream_hours.target}`, pct: Math.min(100, Math.round((ap.stream_hours.current / ap.stream_hours.target) * 100)) },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{item.label}</span>
                  <span className="text-foreground">{item.value}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-muted">
                  <div className="h-full rounded-full gradient-primary" style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div className="mb-10">
          <SectionHeader title="Actions recommandées" align="left" />
          <div className="grid gap-4 sm:grid-cols-3">
            {priorityRecs.map((rec, i) => (
              <RecommendationCard
                key={rec.id}
                icon={categoryIcons[rec.category] || Lightbulb}
                title={rec.title}
                reason={rec.reason}
                action={rec.action}
                locked={!isPersisted && i >= 2}
              />
            ))}
          </div>
        </div>

        {/* CTA */}
        {!isPersisted && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-xl border border-primary/20 bg-primary/5 p-8 text-center"
          >
            <Lock className="mx-auto mb-3 h-6 w-6 text-primary" />
            <h3 className="text-xl font-bold text-foreground">Tu veux l'analyse complète ?</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              {user
                ? "Connecte ton compte Twitch pour débloquer tous les concurrents, des recommandations personnalisées et un suivi hebdomadaire."
                : "Crée un compte pour sauvegarder tes analyses et débloquer tous les concurrents et recommandations."}
            </p>
            <a
              href={ctaLink}
              className="mt-5 inline-flex items-center gap-2 rounded-lg gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              {user ? "Connecter Twitch" : "Créer un compte gratuit"}
            </a>
          </motion.div>
        )}
      </div>
    </AppShell>
  );
};

export default ResultPage;
