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
  AlertCircle,
  RefreshCw,
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
import { useTwitchConnection } from "@/hooks/useTwitchConnection";
import { teaserStore } from "@/services/teaserStore";
import {
  getLatestReport,
  getLatestReportForPlatformUser,
  getReportById,
  getReportByJobId,
  type SavedReport,
} from "@/services/reportRepository";
import type { AnalysisReport } from "@/types/analysis";

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
  const { account: twitchAccount, loading: twitchLoading } = useTwitchConnection();
  const reportId = searchParams.get("report_id");
  const legacyJobId = searchParams.get("jobId");
  const teaserId = searchParams.get("teaser");
  const channel = searchParams.get("channel");

  const [saved, setSaved] = useState<SavedReport | null>(null);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [isTeaser, setIsTeaser] = useState(false);
  const [teaserChannel, setTeaserChannel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [noLiveReport, setNoLiveReport] = useState(false);

  useEffect(() => {
    if (authLoading || twitchLoading) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setNotFound(false);
      setNoLiveReport(false);
      setSaved(null);
      setReport(null);
      setIsTeaser(false);
      setTeaserChannel(null);

      // Teaser mode (anonymous, sessionStorage)
      if (teaserId) {
        const rec = teaserStore.get(teaserId);
        if (cancelled) return;
        if (rec) {
          setReport(rec.report);
          setIsTeaser(true);
          setTeaserChannel(rec.channel);
        } else {
          setNotFound(true);
        }
        setLoading(false);
        return;
      }

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
        // Source-of-truth: if a Twitch account is connected, ONLY load a
        // report that matches that connected account. Never silently fall
        // back to demo/mock or another channel's report.
        if (twitchAccount?.platform_user_id) {
          const r = await getLatestReportForPlatformUser(
            user.id,
            twitchAccount.platform_user_id,
          );
          if (cancelled) return;
          if (r) {
            setSaved(r);
            setReport(r.report);
            navigate(`/result?report_id=${r.id}`, { replace: true });
          } else {
            setNoLiveReport(true);
          }
          setLoading(false);
          return;
        }

        // Not connected → legacy/demo fallback is acceptable
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

      // Anonymous user, no teaser id, fallback to channel param redirect to teaser flow
      if (channel) {
        navigate(`/analyze?channel=${encodeURIComponent(channel)}&mode=teaser`, { replace: true });
        return;
      }

      setNotFound(true);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [reportId, legacyJobId, teaserId, channel, user, authLoading, twitchAccount, twitchLoading, navigate]);

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
  const teaserCtaChannel = teaserChannel ?? channel ?? "";
  const ctaLink = user
    ? "/connect-twitch"
    : `/auth?redirect=${encodeURIComponent(
        `/dashboard${teaserCtaChannel ? `?channel=${encodeURIComponent(teaserCtaChannel)}` : ""}`,
      )}`;
  const summary = report.channel_summary;
  const score = report.score;
  const ap = report.affiliate_progress;
  const priorityRecs = report.recommendations
    .filter((r) => r.type === "priority")
    .slice(0, 3);
  const nextAction = report.next_best_action;
  const directCompetitors = report.competitor_groups.find((g) => g.type === "direct");
  const visibleCompetitors = isTeaser
    ? (directCompetitors?.matches ?? []).slice(0, 1)
    : (directCompetitors?.matches ?? []);

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
          eyebrow={isTeaser ? "Aperçu gratuit" : "Rapport d'analyse"}
          title={summary.display_name}
          description={`${summary.category} · ~${summary.avg_viewers} viewers moyens · ${summary.follower_count} followers${summary.broadcaster_type === "affiliate" ? " · Affilié" : ""}`}
        />

        {/* Mismatch / demo banner: clarify when this report does not belong
            to the user's currently connected Twitch account. */}
        {isPersisted && saved && twitchAccount && (
          (saved.is_demo || (
            saved.platform_user_id &&
            saved.platform_user_id !== twitchAccount.platform_user_id
          )) && (
            <Card className="mb-6 border-warning/30 bg-warning/5">
              <CardContent className="flex items-start gap-3 p-4">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {saved.is_demo
                      ? "Analyse de démonstration"
                      : "Analyse d'un autre canal"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {saved.is_demo
                      ? `Ce rapport a été généré avec des données de démo (${summary.display_name}). Il ne reflète pas ton compte Twitch connecté @${twitchAccount.platform_login}.`
                      : `Ce rapport concerne ${summary.display_name}, pas ton compte Twitch connecté @${twitchAccount.platform_login}.`}
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link to="/analyze">
                    <RefreshCw className="h-3.5 w-3.5" /> Analyser mon compte
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )
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

        {/* Detailed score breakdown — hidden in teaser to preserve curiosity */}
        {!isTeaser && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Décomposition du StreamScore
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Régularité", pct: score.regularity },
                { label: "Contenu", pct: score.content },
                { label: "Structure", pct: score.structure },
                { label: "Positionnement", pct: score.positioning },
                { label: "Momentum", pct: score.momentum },
                { label: "Monétisation", pct: score.monetization },
              ].map((s) => (
                <ProgressRow key={s.label} label={s.label} value={`${s.pct}%`} pct={s.pct} />
              ))}
            </CardContent>
          </Card>
        )}

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
          <div className="space-y-3">
            {visibleCompetitors.map((c) => (
              <div key={c.id}>
                <CompetitorCard
                  name={c.display_name}
                  followers={`${(c.follower_count / 1000).toFixed(1)}K`}
                  similarity={c.similarity_score}
                  reasons={c.match_reasons}
                />
                {isPersisted && saved && (
                  <CompetitorFeedbackBar
                    reportId={saved.id}
                    competitorKey={c.competitor_login}
                  />
                )}
              </div>
            ))}
          </div>
          {!isPersisted && (
            <div className="relative mt-3">
              <CompetitorCard name="" followers="" similarity={0} locked />
              <LockedOverlay
                message={
                  isTeaser
                    ? "Crée un compte pour voir tous les concurrents pertinents"
                    : "Connecte Twitch pour voir plus de concurrents"
                }
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
                {isTeaser
                  ? "Débloque l'analyse complète de ta chaîne"
                  : "Tu veux l'analyse complète ?"}
              </h3>
              <p className="mx-auto max-w-md text-sm text-muted-foreground">
                {user
                  ? "Connecte ton compte Twitch pour débloquer tous les concurrents, des recommandations personnalisées et un suivi hebdomadaire."
                  : isTeaser
                    ? "Crée un compte gratuit pour sauvegarder ton analyse, voir tous les concurrents, le plan d'action complet et suivre ta progression vers l'affiliation."
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
