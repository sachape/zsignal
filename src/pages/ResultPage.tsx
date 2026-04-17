import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import {
  User,
  TrendingDown,
  Clock,
  Target,
  Lightbulb,
  Lock,
  Zap,
  Trophy,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import PageHeader from "@/components/PageHeader";
import SectionHeader from "@/components/SectionHeader";
import ScoreCard from "@/components/ScoreCard";
import CompetitorCard from "@/components/CompetitorCard";
import RecommendationCard from "@/components/RecommendationCard";
import LockedOverlay from "@/components/LockedOverlay";
import StatBlock from "@/components/StatBlock";
import EmptyReportState from "@/components/EmptyReportState";
import CompetitorFeedbackBar from "@/components/CompetitorFeedbackBar";
import { LoadingState } from "@/components/StateView";
import ProgressRow from "@/components/ProgressRow";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

      if (reportId && user) {
        const r = await getReportById(reportId, user.id);
        if (cancelled) return;
        if (r) {
          setSaved(r);
          setReport(r.report);
        } else {
          setNotFound(true);
        }
        setLoading(false);
        return;
      }

      if (legacyJobId && user) {
        const r = await getReportByJobId(legacyJobId, user.id);
        if (cancelled) return;
        if (r) {
          setSaved(r);
          setReport(r.report);
          navigate(`/result?report_id=${r.id}`, { replace: true });
        } else {
          setNotFound(true);
        }
        setLoading(false);
        return;
      }

      if (user) {
        const r = await getLatestReport(user.id);
        if (cancelled) return;
        if (r) {
          setSaved(r);
          setReport(r.report);
          navigate(`/result?report_id=${r.id}`, { replace: true });
        } else {
          setNotFound(true);
        }
        setLoading(false);
        return;
      }

      if (channel) {
        const data: MockStreamerData =
          (allMockStreamers as Record<string, MockStreamerData>)[channel.toLowerCase()] ||
          nexaGaming;
        setReport(assembleReport(data, `teaser-${channel}`));
        setLoading(false);
        return;
      }

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
        <LoadingState />
      </AppShell>
    );
  }

  if (notFound || !report) {
    return (
      <AppShell>
        <PageContainer size="sm">
          <EmptyReportState
            title="Aucun rapport trouvé"
            description="Le rapport demandé n'existe pas ou ne t'appartient pas. Lance une nouvelle analyse pour commencer."
          />
        </PageContainer>
      </AppShell>
    );
  }

  const isPersisted = !!saved;
  const ctaLink = user ? "/connect-twitch" : "/auth?redirect=/connect-twitch";
  const summary = report.channel_summary;
  const score = report.score;
  const ap = report.affiliate_progress;
  const priorityRecs = report.recommendations
    .filter((r) => r.type === "priority")
    .slice(0, 3);
  const nextAction = report.next_best_action;
  const directCompetitors = report.competitor_groups.find((g) => g.type === "direct");

  return (
    <AppShell>
      <PageContainer>
        {user && (
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
          >
            <Link to="/dashboard">
              <ArrowLeft className="h-3.5 w-3.5" />
              Tableau de bord
            </Link>
          </Button>
        )}

        <PageHeader
          eyebrow="Rapport d'analyse"
          title={summary.display_name}
          description={`${summary.category} · ~${summary.avg_viewers} viewers moyens · ${summary.follower_count} followers${summary.broadcaster_type === "affiliate" ? " · Affilié" : ""}`}
        />

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
                    Point faible clé : {report.weak_point.label}
                  </p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {report.weak_point.description}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {nextAction && (
          <Card className="mb-8 border-accent/30 bg-accent/5">
            <CardContent className="p-5">
              <div className="mb-1.5 flex items-center gap-2">
                <Zap className="h-4 w-4 text-accent" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-accent">
                  Action suivante
                </h3>
              </div>
              <p className="text-sm font-semibold text-foreground">{nextAction.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{nextAction.reason}</p>
            </CardContent>
          </Card>
        )}

        <section className="mb-8">
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
              <LockedOverlay
                message="Connecte Twitch pour voir plus de concurrents"
                cta="Débloquer"
              />
            </div>
          )}
        </section>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Progression vers l'affiliation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Followers", value: `${ap.followers.current} / ${ap.followers.target}`, pct: Math.min(100, Math.round((ap.followers.current / ap.followers.target) * 100)) },
              { label: "Viewers moyens", value: `${ap.avg_viewers.current} / ${ap.avg_viewers.target}`, pct: Math.min(100, Math.round((ap.avg_viewers.current / ap.avg_viewers.target) * 100)) },
              { label: "Jours de stream", value: `${ap.stream_days.current} / ${ap.stream_days.target}`, pct: Math.min(100, Math.round((ap.stream_days.current / ap.stream_days.target) * 100)) },
              { label: "Heures de stream", value: `${ap.stream_hours.current} / ${ap.stream_hours.target}`, pct: Math.min(100, Math.round((ap.stream_hours.current / ap.stream_hours.target) * 100)) },
            ].map((item) => (
              <ProgressRow key={item.label} label={item.label} value={item.value} pct={item.pct} />
            ))}
          </CardContent>
        </Card>

        <section className="mb-8">
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
        </section>

        {!isPersisted && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
              <Lock className="h-5 w-5 text-primary" />
              <h3 className="text-base font-semibold text-foreground">
                Tu veux l'analyse complète ?
              </h3>
              <p className="mx-auto max-w-md text-sm text-muted-foreground">
                {user
                  ? "Connecte ton compte Twitch pour débloquer tous les concurrents, des recommandations personnalisées et un suivi hebdomadaire."
                  : "Crée un compte pour sauvegarder tes analyses et débloquer tous les concurrents et recommandations."}
              </p>
              <Button asChild className="mt-2">
                <Link to={ctaLink}>
                  {user ? "Connecter Twitch" : "Créer un compte gratuit"}
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </PageContainer>
    </AppShell>
  );
};

export default ResultPage;
