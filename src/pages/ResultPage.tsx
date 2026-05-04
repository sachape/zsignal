import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import {
  Clock,
  Target,
  Lightbulb,
  Lock,
  Zap,
  Trophy,
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  Sparkles,
  CalendarCheck,
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
import { ErrorState, LoadingState } from "@/components/StateView";
import ProgressRow from "@/components/ProgressRow";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTwitchConnection } from "@/hooks/useTwitchConnection";
import { teaserStore } from "@/services/teaserStore";
import { validateReportConsistency } from "@/services/reportConsistency";
import {
  getLatestReport,
  getLatestReportForPlatformUser,
  getReportById,
  getReportByJobId,
  type SavedReport,
} from "@/services/reportRepository";
import type { AnalysisReport } from "@/types/analysis";
import MainBlockerCard from "@/components/MainBlockerCard";
import { useAuthModal } from "@/contexts/AuthModalContext";
import FoundationModeBanner from "@/components/FoundationModeBanner";
import QualitativeScoreCard from "@/components/QualitativeScoreCard";
import ScoreInsightCard from "@/components/ScoreInsightCard";
import TeaserResultLayout from "@/components/TeaserResultLayout";
import { diagnoseFoundationMode } from "@/services/foundationMode";
import { getAccountDisplayMode } from "@/services/accountDisplayMode";
import { onboardingFlags } from "@/services/onboardingFlags";
import { formatNumber, formatCompact } from "@/lib/format";

type SelectionSource =
  | "explicit_report_id"
  | "job_id"
  | "latest_matching_twitch_report"
  | "legacy_fallback"
  | "no_matching_report"
  | null;

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
  const { openAuthModal } = useAuthModal();
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
  const [selectionSource, setSelectionSource] = useState<SelectionSource>(null);

  const currentUrl = typeof window !== "undefined" ? window.location.href : "";
  // Debug panel is opt-in via ?debug=1 so it never leaks into the real user UX.
  const showDebugPanel =
    import.meta.env.DEV && searchParams.get("debug") === "1";

  useEffect(() => {
    if (authLoading || twitchLoading) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setNotFound(false);
      setNoLiveReport(false);
      setSelectionSource(null);
      setSaved(null);
      setReport(null);
      setIsTeaser(false);
      setTeaserChannel(null);

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
        setSelectionSource("explicit_report_id");
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
        setSelectionSource("job_id");
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
        if (twitchAccount?.platform_user_id) {
          const r = await getLatestReportForPlatformUser(
            user.id,
            twitchAccount.platform_user_id,
          );
          if (cancelled) return;
          if (r) {
            setSelectionSource("latest_matching_twitch_report");
            setSaved(r);
            setReport(r.report);
            navigate(`/result?report_id=${r.id}`, { replace: true });
          } else {
            setSelectionSource("no_matching_report");
            setNoLiveReport(true);
          }
          setLoading(false);
          return;
        }

        const r = await getLatestReport(user.id);
        if (cancelled) return;
        setSelectionSource("legacy_fallback");
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

  const renderDebugPanel = () => {
    if (!showDebugPanel) return null;

    return (
      <Card className="mb-4 border-accent/30 bg-accent/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-accent">
            Debug /result
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-xs sm:grid-cols-2">
            <div>
              <span className="text-muted-foreground">current URL:</span>{" "}
              <span className="font-mono break-all text-foreground">{currentUrl || "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">selection source:</span>{" "}
              <span className="font-mono text-foreground">{selectionSource ?? "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">report_id:</span>{" "}
              <span className="font-mono text-foreground">{reportId ?? "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">jobId:</span>{" "}
              <span className="font-mono text-foreground">{legacyJobId ?? "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">connected platform_user_id:</span>{" "}
              <span className="font-mono text-foreground">{twitchAccount?.platform_user_id ?? "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">connected login:</span>{" "}
              <span className="font-mono text-foreground">{twitchAccount?.platform_login ?? "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">selected report id:</span>{" "}
              <span className="font-mono text-foreground">{saved?.id ?? "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">selected report platform_user_id:</span>{" "}
              <span className="font-mono text-foreground">{saved?.platform_user_id ?? "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">selected report platform_login:</span>{" "}
              <span className="font-mono text-foreground">{saved?.platform_login ?? "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">selected report payload login:</span>{" "}
              <span className="font-mono text-foreground">{report?.channel_summary.channel_name ?? "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">selected report channel:</span>{" "}
              <span className="font-mono text-foreground">{report?.channel_summary.display_name ?? "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">selected report is_demo:</span>{" "}
              <span className="font-mono text-foreground">{saved ? String(saved.is_demo) : "—"}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <AppShell>
        <LoadingState />
      </AppShell>
    );
  }

  if (noLiveReport && twitchAccount) {
    const displayName =
      twitchAccount.platform_display_name || twitchAccount.platform_login || "ton compte";

    return (
      <AppShell>
        <PageContainer size="sm">
          {renderDebugPanel()}
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
          <PageHeader
            eyebrow="Diagnostic détaillé"
            title={displayName}
            avatarLogin={twitchAccount.platform_login}
            description="Comprends ton StreamScore, tes blocages, et ce qu'il faut corriger."
          />
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="text-base font-semibold text-foreground">
                Aucun diagnostic disponible pour le moment
              </h3>
              <p className="mx-auto max-w-md text-sm text-muted-foreground">
                Connecte Twitch et lance la première analyse pour découvrir ton
                StreamScore, le détail de tes blocages, et les actions
                prioritaires.
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                <Button asChild>
                  <Link to="/analyze">
                    <Zap className="h-4 w-4" /> Lancer ma première analyse
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/dashboard">Retour au tableau de bord</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </PageContainer>
      </AppShell>
    );
  }

  if (notFound || !report) {
    return (
      <AppShell>
        <PageContainer size="sm">
          {renderDebugPanel()}
          <PageHeader
            eyebrow="Diagnostic détaillé"
            title="Diagnostic détaillé"
            description="Comprends ton StreamScore, tes blocages, et ce qu'il faut corriger."
          />
          <EmptyReportState
            title="Aucun diagnostic disponible pour le moment"
            description="Connecte Twitch et lance la première analyse pour générer ton diagnostic."
          />
        </PageContainer>
      </AppShell>
    );
  }

  const isPersisted = !!saved;
  const consistency = isPersisted && saved
    ? validateReportConsistency(saved, report)
    : { isConsistent: true, reason: "ok" as const };
  const isCorruptedLiveReport = isPersisted && saved && !saved.is_demo && !consistency.isConsistent;

  if (isCorruptedLiveReport) {
    return (
      <AppShell>
        <PageContainer size="sm">
          {renderDebugPanel()}
          <ErrorState
            title="Ce rapport est incohérent"
            description="Les données de ce rapport ne correspondent pas à l'identité de la chaîne analysée. Régénère un rapport propre pour continuer."
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button asChild>
                  <Link to="/analyze">
                    <RefreshCw className="h-4 w-4" /> Régénérer le rapport
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/dashboard">Retour au tableau de bord</Link>
                </Button>
              </div>
            }
          />
        </PageContainer>
      </AppShell>
    );
  }

  const teaserCtaChannel = teaserChannel ?? channel ?? "";
  const fromOnboarding = searchParams.get("from") === "onboarding";
  const handleUnlock = () => {
    // Persist teaser id across the auth round-trip so the post-signup flow can
    // redirect the user back to /result?teaser=...&from=onboarding and present
    // an enriched version of the same diagnostic.
    if (teaserId) {
      onboardingFlags.setPendingTeaserId(teaserId);
    }
    // (channel hint is passed directly via openAuthModal below)

    // Case 3: fully connected — go to the deeper product surface directly.
    if (user && twitchAccount) {
      navigate("/dashboard");
      return;
    }

    // Case 2: Streamnco account exists, Twitch not yet linked — open the
    // Twitch connection page (which presents the dedicated Twitch CTA).
    if (user && !twitchAccount) {
      navigate(`/connect-twitch${teaserId ? `?teaser=${teaserId}` : ""}`);
      return;
    }

    // Case 1: not authenticated — open the Streamnco signup modal.
    // Twitch will be proposed as a second step, after the session is created.
    openAuthModal({
      mode: "signup",
      redirectTo: `/connect-twitch${teaserId ? `?teaser=${teaserId}` : ""}`,
      pendingChannel: teaserCtaChannel || null,
      contextText:
        "Crée ton compte Streamnco pour sauvegarder ce diagnostic. Tu pourras connecter Twitch juste après.",
    });
  };

  const summary = report.channel_summary;
  const score = report.score;
  const ap = report.affiliate_progress;
  const displayMode = getAccountDisplayMode(report);
  const isReconstruction = displayMode.mode === "reconstruction";
  const isExploration = displayMode.mode === "exploration";
  const stage =
    summary.broadcaster_type === "partner"
      ? "partner"
      : summary.broadcaster_type === "affiliate"
        ? "affiliate"
        : "rookie";
  // Affiliates / partners never show the "progression vers l'affiliation" tracker.
  // For rookies, we also hide it in reconstruction mode (no meaningful progress yet).
  const showAffiliateProgression = stage === "rookie" && !isReconstruction;
  const priorityRecs = report.recommendations
    .filter((r) => r.type === "priority")
    .slice(0, 3);
  const nextAction = report.next_best_action;
  const directCompetitors = report.competitor_groups.find((g) => g.type === "direct");
  const rawVisibleCompetitors = isTeaser
    ? (directCompetitors?.matches ?? []).slice(0, 1)
    : (directCompetitors?.matches ?? []);
  // Reconstruction: no reliable competitor fit possible → hide section entirely.
  const visibleCompetitors = isReconstruction ? [] : rawVisibleCompetitors;
  const showCompetitorsSection = !isReconstruction;
  const accountMismatch = Boolean(
    isPersisted &&
      saved &&
      twitchAccount?.platform_user_id &&
      saved.platform_user_id &&
      saved.platform_user_id !== twitchAccount.platform_user_id,
  );
  const isMismatchedOrDemo = Boolean(
    isPersisted && saved && twitchAccount && (saved.is_demo || accountMismatch),
  );

  // ── Premium teaser layout ────────────────────────────────────────────────
  if (isTeaser) {
    return (
      <AppShell>
        <PageContainer>
          {renderDebugPanel()}
          <TeaserResultLayout
            report={report}
            onUnlock={handleUnlock}
            isAuthenticated={!!user}
            hasTwitchConnected={!!twitchAccount}
          />
        </PageContainer>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageContainer>
        {renderDebugPanel()}

        {showDebugPanel && isMismatchedOrDemo && (
          <Card className="mb-4 border-destructive/40 bg-destructive/10">
            <CardContent className="flex items-center gap-3 p-4">
              <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
              <p className="text-sm font-semibold text-foreground">
                DEBUG: mismatched or demo report is being rendered
              </p>
            </CardContent>
          </Card>
        )}

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
          eyebrow={
            isTeaser
              ? summary.is_partial
                ? "Aperçu public · données Twitch publiques"
                : "Aperçu gratuit"
              : "Diagnostic détaillé"
          }
          title={summary.display_name}
          avatarUrl={report.identity?.avatar_url ?? null}
          avatarLogin={report.identity?.platform_login ?? summary.channel_name}
          badges={[
            ...(summary.broadcaster_type === "partner"
              ? [{ label: "Partenaire", variant: "accent" as const }]
              : summary.broadcaster_type === "affiliate"
                ? [{ label: "Affilié", variant: "secondary" as const }]
                : []),
            ...(summary.is_live
              ? [{ label: "Live", variant: "destructive" as const }]
              : []),
            ...(summary.category && summary.category !== "unknown"
              ? [{ label: summary.category, variant: "outline" as const }]
              : []),
          ]}
          description={
            summary.is_partial
              ? summary.followers_available === false
                ? "Diagnostic à partir de tes données publiques · total followers visible une fois Twitch connecté"
                : "Diagnostic à partir de tes données publiques"
              : (() => {
                  const viewersPart =
                    summary.avg_viewers > 0
                      ? `~${formatNumber(summary.avg_viewers)} viewers en moyenne`
                      : null;
                  const followersPart =
                    summary.followers_available === false
                      ? "followers masqués en attendant la reconnexion Twitch"
                      : summary.follower_count > 0
                        ? `${formatNumber(summary.follower_count)} followers`
                        : null;
                  const parts = [viewersPart, followersPart].filter(Boolean);
                  return parts.length > 0 ? parts.join(" · ") : "Diagnostic de ta chaîne";
                })()
          }
        />

        {summary.is_live && (summary.live_viewer_count ?? 0) > 0 && (
          <div className="-mt-3 mb-4 inline-flex items-center gap-1.5 rounded-full bg-destructive/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-destructive">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" />
            En live · {formatNumber(summary.live_viewer_count)} viewers
            {summary.live_title ? ` · ${summary.live_title}` : ""}
          </div>
        )}

        {summary.is_live && (summary.live_viewer_count ?? 0) === 0 && (
          <div className="-mt-3 mb-4 inline-flex items-center gap-1.5 rounded-full bg-destructive/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-destructive">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" />
            En live
            {summary.live_title ? ` · ${summary.live_title}` : ""}
          </div>
        )}

        {summary.is_partial && (
          <Card className="mb-4 border-accent/30 bg-accent/5">
            <CardContent className="flex flex-wrap items-start gap-3 p-4">
              <Zap className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  Aperçu à partir des données publiques de ta chaîne
                </p>
                <p className="text-xs text-muted-foreground">
                  Le total de followers, les chatters uniques et l'historique live complet ne sont
                  lisibles qu'une fois Twitch connecté. Connecte ta chaîne pour passer sur le diagnostic complet.
                </p>
              </div>
              <Button size="sm" onClick={handleUnlock}>
                Passer au diagnostic complet
              </Button>
            </CardContent>
          </Card>
        )}

        {summary.followers_available === false && !saved?.is_demo && !summary.is_partial && (
          <Card className="mb-4 border-warning/30 bg-warning/5">
            <CardContent className="flex flex-wrap items-center gap-3 p-3">
              <AlertCircle className="h-4 w-4 shrink-0 text-warning" />
              <p className="min-w-0 flex-1 text-xs text-foreground">
                {summary.followers_missing_scope
                  ? "Ton total de followers n'est pas encore lisible. Reconnecte Twitch pour l'afficher avec précision."
                  : "Ton total de followers n'a pas pu être lu lors de cette analyse. Relance une analyse pour réessayer."}
              </p>
              {summary.followers_missing_scope && (
                <Button asChild size="sm" variant="outline">
                  <Link to="/connect-twitch">Reconnecter Twitch</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {isPersisted && saved && twitchAccount && (saved.is_demo || accountMismatch) && (
          <Card className="mb-6 border-warning/30 bg-warning/5">
            <CardContent className="flex items-start gap-3 p-4">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {saved.is_demo ? "Analyse de démonstration" : "Analyse d'un autre canal"}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {saved.is_demo
                    ? `Ce rapport a été généré avec des données de démo (${summary.display_name}). Il ne reflète pas ton compte Twitch connecté @${twitchAccount.platform_login}.`
                    : `Ce rapport concerne ${summary.display_name}, pas ton compte Twitch connecté @${twitchAccount.platform_login}.`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link to="/connect-twitch">Voir mon compte connecté</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link to="/analyze">
                    <RefreshCw className="h-3.5 w-3.5" /> Analyser mon compte
                  </Link>
                </Button>
                <Button asChild size="sm" variant="ghost">
                  <Link to="/dashboard">Retour au tableau de bord</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {(isReconstruction || isExploration) && (
          <FoundationModeBanner reasons={displayMode.reasons} />
        )}

        <div className="mb-8 grid gap-4 sm:grid-cols-4">
          {isReconstruction ? (
            <QualitativeScoreCard />
          ) : (
            <ScoreCard
              score={score.overall}
              label={isExploration ? "StreamScore · estimation" : "StreamScore"}
            />
          )}
          <div className="flex flex-col gap-3 sm:col-span-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <StatBlock
                label="Vues moyennes par VOD"
                value={summary.avg_viewers > 0 ? formatNumber(summary.avg_viewers) : "—"}
                subtext={
                  summary.avg_viewers > 0
                    ? summary.is_partial
                      ? "Sur 30 jours · influencé par les rediffusions"
                      : "Sur 30 jours · pas un compteur live"
                    : "Pas assez de VOD récentes pour mesurer"
                }
              />
              <StatBlock
                label="Régularité"
                value={`${score.regularity}%`}
                subtext={
                  ap.stream_days.current > 0
                    ? `${formatNumber(ap.stream_days.current)} jours streamés sur 30`
                    : "Aucun live détecté sur 30 jours"
                }
              />
              {(() => {
                const clipsCount = Number(
                  report.facts.find((f) => f.key === "clips_30d")?.value ?? 0,
                );
                return (
                  <StatBlock
                    label="Contenu"
                    value={`${score.content}%`}
                    subtext={
                      clipsCount > 0
                        ? `${formatNumber(clipsCount)} clips récents`
                        : "Aucun clip récent à exploiter"
                    }
                    accent
                  />
                );
              })()}
            </div>
          </div>
        </div>

        {/* "Pourquoi ce score" — product-grade reading.
            Replaces the previous one-line weak point card with a structured
            narrative: tier headline + drags/supports + priority action. */}
        {!isReconstruction && (
          <div className="mb-8">
            <ScoreInsightCard score={score} />
          </div>
        )}

        {/* No MainBlocker / plan bridge here: the cockpit is the single
            home that surfaces the current blocker and the weekly plan link.
            Result must stay focused on deep diagnosis. */}


        {!isTeaser && !isReconstruction && (
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
                <ProgressRow key={s.label} label={s.label} value={`${s.pct}%`} pct={s.pct} tinted />
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

        {showCompetitorsSection && (
        <section className="mb-8">
          <SectionHeader title="Concurrents similaires" align="left" />
          <div className="space-y-3">
            {visibleCompetitors.map((c) => (
              <div key={c.id}>
                <CompetitorCard
                  name={c.display_name}
                  followers={formatCompact(c.follower_count)}
                  similarity={c.similarity_score}
                  reasons={c.match_reasons}
                />
                {isPersisted && saved && (
                  <CompetitorFeedbackBar reportId={saved.id} competitorKey={c.competitor_login} />
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
                    ? "Connecte Twitch pour voir tous les concurrents pertinents"
                    : "Connecte Twitch pour voir plus de concurrents"
                }
                cta={
                  !user
                    ? "Créer mon compte Streamnco"
                    : !twitchAccount
                      ? "Connecter Twitch"
                      : "Voir mon dashboard"
                }
                onUnlock={handleUnlock}
              />
            </div>
          )}
        </section>
        )}

        {/* Stage-aware progression module:
            - rookie    → progression vers l'affiliation
            - affiliate → "Déjà affilié — bravo" with mature signals
            - partner   → "Statut partenaire confirmé" with finer signals  */}
        {(() => {
          if (showAffiliateProgression) {
            const followersValue =
              ap.followers.available === false
                ? null
                : Math.min(ap.followers.current ?? 0, ap.followers.target);
            return (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Progression vers l'affiliation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    {
                      label: "Followers",
                      value:
                        followersValue === null
                          ? "Visible une fois Twitch connecté"
                          : `${formatNumber(followersValue)} / ${formatNumber(ap.followers.target)}`,
                      pct:
                        followersValue === null
                          ? 0
                          : Math.min(
                              100,
                              Math.round((followersValue / ap.followers.target) * 100),
                            ),
                    },
                    {
                      label: "Viewers moyens",
                      value: `${formatNumber(Math.min(ap.avg_viewers.current, ap.avg_viewers.target))} / ${formatNumber(ap.avg_viewers.target)}`,
                      pct: Math.min(100, Math.round((ap.avg_viewers.current / ap.avg_viewers.target) * 100)),
                    },
                    {
                      label: "Jours de stream",
                      value: `${formatNumber(Math.min(ap.stream_days.current, ap.stream_days.target))} / ${formatNumber(ap.stream_days.target)}`,
                      pct: Math.min(100, Math.round((ap.stream_days.current / ap.stream_days.target) * 100)),
                    },
                    {
                      label: "Heures de stream",
                      value: `${formatNumber(Math.min(ap.stream_hours.current, ap.stream_hours.target))} / ${formatNumber(ap.stream_hours.target)}`,
                      pct: Math.min(100, Math.round((ap.stream_hours.current / ap.stream_hours.target) * 100)),
                    },
                  ].map((item) => (
                    <ProgressRow key={item.label} label={item.label} value={item.value} pct={item.pct} />
                  ))}
                </CardContent>
              </Card>
            );
          }

          // Rookie in reconstruction mode: no progression tracker shown —
          // the FoundationModeBanner already framed the context.
          if (stage === "rookie") {
            return null;
          }

          // Affiliate or partner: replace affiliate tracker with stage-grade signals.
          const isPartner = stage === "partner";
          const signals = [
            { label: "Régularité", value: Math.round(score.regularity) },
            { label: "Momentum", value: Math.round(score.momentum) },
            { label: "Structure de live", value: Math.round(score.structure) },
            { label: "Contenu recyclable", value: Math.round(score.content) },
          ];
          return (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-foreground">
                  {isPartner ? "Statut partenaire confirmé" : "Déjà affilié — bravo"}
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isPartner
                    ? "Ton enjeu n'est plus de franchir un seuil, mais de piloter ta performance avec plus de précision."
                    : "Tu as franchi le premier cap. L'enjeu maintenant est de stabiliser ta progression et de renforcer ce qui fait vraiment grandir ta chaîne."}
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {signals.map((s) => (
                    <div
                      key={s.label}
                      className="rounded-lg border border-border/60 bg-muted/20 p-4"
                    >
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {s.label}
                      </div>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-foreground">{s.value}</span>
                        <span className="text-xs text-muted-foreground">/ 100</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })()}

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
                {isTeaser
                  ? "Connecte Twitch pour sauvegarder ton analyse, débloquer les données enrichies et suivre ta progression."
                  : user
                    ? "Connecte ton compte Twitch pour débloquer tous les concurrents, des recommandations personnalisées et un suivi hebdomadaire."
                    : "Connecte Twitch pour sauvegarder tes analyses et débloquer tous les concurrents et recommandations."}
              </p>
              <Button onClick={handleUnlock} className="mt-2">
                {!user
                  ? "Créer mon compte Streamnco"
                  : !twitchAccount
                    ? "Connecter Twitch"
                    : "Voir mon dashboard"}
              </Button>
            </CardContent>
          </Card>
        )}
      </PageContainer>
    </AppShell>
  );
};

export default ResultPage;
