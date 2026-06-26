import { useEffect, useState, type CSSProperties } from "react";
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
  Printer,
  Compass,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";

import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import PageHeader from "@/components/PageHeader";
import SiteNav from "@/components/site/SiteNav";
import { Container, Orb } from "@/components/site/el";
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
import { usePageMeta } from "@/hooks/usePageMeta";
import { analytics } from "@/services/analytics";
import { metaPixel } from "@/services/metaPixel";
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
import DimensionResources from "@/components/DimensionResources";

// ── Animated score ring (same as TeaserResultLayout) ─────────────────────────

const AnimatedScoreRing = ({ score }: { score: number }) => {
  const radius = 78;
  const sw = 7;
  const circumference = 2 * Math.PI * radius;
  const [offset, setOffset] = useState(circumference);

  useEffect(() => {
    const t = setTimeout(
      () => setOffset(circumference - (score / 100) * circumference),
      350,
    );
    return () => clearTimeout(t);
  }, [score, circumference]);

  return (
    <div className="relative h-52 w-52 shrink-0">
      <div className="pointer-events-none absolute inset-6 rounded-full bg-primary/20 blur-2xl" />
      <svg viewBox="0 0 200 200" className="relative h-full w-full -rotate-90">
        <defs>
          <linearGradient id="rrRingGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--primary)/0.4)" />
          </linearGradient>
          <filter id="rrGlow">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <circle cx="100" cy="100" r={radius} fill="none" stroke="hsl(var(--border))" strokeOpacity="0.3" strokeWidth={sw} />
        <circle cx="100" cy="100" r={radius} fill="none" stroke="url(#rrRingGrad)" strokeWidth={sw + 0.5} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset} filter="url(#rrGlow)"
          style={{ transition: "stroke-dashoffset 1.6s cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[3.25rem] font-bold leading-none tabular-nums tracking-tight text-foreground">{score}</span>
        <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">StreamScore</span>
      </div>
    </div>
  );
};

// Editorial light shell for the public teaser result (matches the site). The
// inner `light` + ink-primary override remaps the product tokens used inside
// TeaserResultLayout so the diagnostic reads as the editorial site, not the app.
const TEASER_INK_VARS = {
  "--primary": "20 14% 4%",
  "--primary-foreground": "0 0% 100%",
  "--ring": "20 14% 4%",
} as CSSProperties;

const TeaserResultShell = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-el-canvas font-el-sans text-el-ink antialiased">
    <SiteNav theme="light" />
    <section className="relative overflow-hidden px-4 pt-28 pb-24 md:pt-32 md:px-6">
      <Orb color="bg-el-mint" className="left-[-4rem] top-10 h-[26rem] w-[26rem] opacity-40" />
      <Orb color="bg-el-peach" className="right-[-6rem] top-32 h-[24rem] w-[24rem] opacity-40" animate="fast" />
      <Container className="relative">
        <div className="light" style={TEASER_INK_VARS}>{children}</div>
      </Container>
    </section>
  </div>
);

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
  const [mounted, setMounted] = useState(false);

  const currentUrl = typeof window !== "undefined" ? window.location.href : "";

  const reportChannelName =
    report?.channel_summary?.display_name ??
    report?.identity?.platform_login ??
    teaserChannel ??
    channel ??
    null;
  usePageMeta({
    title: reportChannelName
      ? `Diagnostic Twitch — ${reportChannelName}`
      : "Diagnostic Twitch",
    description: reportChannelName
      ? `StreamScore, points faibles et plan d'action pour la chaîne Twitch ${reportChannelName}.`
      : "StreamScore, points faibles et plan d'action pour ta chaîne Twitch.",
    // Per-channel report pages are user/teaser specific — keep them out of the index.
    robots: "noindex,follow",
  });

  // Fire Meta Pixel ViewContent once the teaser diagnostic is actually rendered.
  useEffect(() => {
    if (!isTeaser || !report || loading) return;
    metaPixel.viewContentTeaser(teaserId ?? teaserChannel ?? "teaser");
  }, [isTeaser, report, loading, teaserId, teaserChannel]);
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

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

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
    if (teaserId) {
      return (
        <TeaserResultShell>
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-el-hairline-strong border-t-el-ink" />
            <p className="font-el-sans text-[15px] text-el-body">Chargement de ton diagnostic…</p>
          </div>
        </TeaserResultShell>
      );
    }
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
              <Sparkles className="h-5 w-5 text-primary-strong" />
              <h3 className="text-base font-semibold text-foreground">
                Aucun diagnostic disponible pour le moment
              </h3>
              <p className="mx-auto max-w-md text-sm text-muted-foreground">
                Ton premier StreamScore sera calculé automatiquement dès la fin
                de ton premier live. En attendant, prépare ta chaîne depuis le
                tableau de bord.
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                <Button asChild>
                  <Link to="/dashboard">
                    <Zap className="h-4 w-4" /> Aller au tableau de bord
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </PageContainer>
      </AppShell>
    );
  }

  if (notFound || !report) {
    if (teaserId || !user) {
      return (
        <TeaserResultShell>
          <div className="mx-auto flex max-w-md flex-col items-center gap-5 rounded-2xl border border-el-hairline bg-el-card p-10 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-el-strong">
              <Sparkles className="h-5 w-5 text-el-ink" />
            </span>
            <div className="space-y-2">
              <h2 className="font-el-display text-[24px] font-light text-el-ink">Ce diagnostic n'est plus disponible</h2>
              <p className="font-el-sans text-[15px] leading-[1.6] text-el-body">
                L'aperçu a peut-être expiré. Relance une analyse gratuite depuis l'accueil.
              </p>
            </div>
            <Link to="/" className="mt-1 inline-flex h-11 items-center rounded-full bg-el-ink px-6 font-el-sans text-[15px] font-medium text-el-on-dark transition-colors hover:bg-el-ink-soft">
              Analyser une chaîne
            </Link>
          </div>
        </TeaserResultShell>
      );
    }
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
    // Strong intent signal: the user clicked a CTA after seeing the teaser
    // result to unlock more — this is the Meta Pixel "Lead" moment.
    analytics.leadUnlock(teaserId ?? teaserCtaChannel ?? "unknown");
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

  // ── Premium teaser layout (editorial light shell) ────────────────────────
  if (isTeaser) {
    return (
      <TeaserResultShell>
        {renderDebugPanel()}
        <TeaserResultLayout
          report={report}
          onUnlock={handleUnlock}
          isAuthenticated={!!user}
          hasTwitchConnected={!!twitchAccount}
        />
      </TeaserResultShell>
    );
  }

  const anim = (delay = 0) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(20px)",
    transition: `opacity 650ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 650ms cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
  });

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

        {/* Top bar: back + PDF */}
        <div className="mb-4 flex items-center justify-between print:hidden" style={anim(0)}>
          {user && (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="-ml-2 text-muted-foreground hover:text-foreground"
            >
              <Link to="/dashboard">
                <ArrowLeft className="h-3.5 w-3.5" />
                Tableau de bord
              </Link>
            </Button>
          )}
          <div className="ml-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.print()}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <Printer className="h-3.5 w-3.5" />
              Imprimer
            </Button>
          </div>
        </div>

        {/* Hero card */}
        <div
          style={anim(80)}
          className="relative mb-4 overflow-hidden rounded-3xl border border-white/[0.08] bg-card/40 backdrop-blur-xl shadow-[0_32px_100px_-32px_hsl(var(--primary)/0.35)]"
        >
          <div className="pointer-events-none absolute -top-32 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/12 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 right-0 h-64 w-64 rounded-full bg-primary/8 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_55%)]" />

          <div className="relative flex flex-col items-center gap-5 px-4 py-8 text-center sm:px-6 sm:py-12 md:py-16">

            {/* Avatar */}
            <div className="relative">
              <div className="absolute -inset-4 rounded-full bg-primary/12 blur-2xl" />
              <Avatar className="relative h-24 w-24 border-2 border-primary/25 shadow-[0_0_56px_hsl(var(--primary)/0.3)] ring-[3px] ring-primary/10">
                {report.identity?.avatar_url && (
                  <AvatarImage src={report.identity.avatar_url} alt={`Avatar ${summary.display_name}`} />
                )}
                <AvatarFallback className="bg-muted text-xl font-bold text-muted-foreground">
                  {(summary.display_name || "?").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {summary.is_live && (
                <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-destructive">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                </span>
              )}
            </div>

            {/* Identity */}
            <div className="flex flex-col items-center gap-2">
              <h1 className="font-display bg-gradient-to-b from-foreground to-foreground/80 bg-clip-text text-3xl font-bold tracking-tight text-transparent md:text-4xl">
                {summary.display_name}
              </h1>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="text-sm text-muted-foreground">
                  @{report.identity?.platform_login ?? summary.channel_name}
                </span>
                {summary.category && summary.category !== "unknown" && (
                  <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary-strong">
                    {summary.category}
                  </span>
                )}
                {summary.broadcaster_type === "affiliate" && (
                  <span className="rounded-full border border-white/10 bg-card/60 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Affilié
                  </span>
                )}
                {summary.broadcaster_type === "partner" && (
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary-strong">
                    Partenaire
                  </span>
                )}
              </div>
            </div>

            {/* Score ring or foundation mode */}
            {isReconstruction ? (
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 shadow-[0_0_32px_hsl(var(--primary)/0.25)]">
                  <Compass className="h-8 w-8 text-primary-strong" />
                </div>
                <div className="max-w-sm">
                  <p className="text-sm font-semibold uppercase tracking-wider text-primary-strong">
                    Mode structuration
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    Pas encore assez de signal pour un score fiable. L'objectif : créer une régularité de stream.
                  </p>
                </div>
              </div>
            ) : (
              <AnimatedScoreRing score={score.overall} />
            )}

            {/* Dimension chips */}
            {!isReconstruction && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                {[
                  { label: "Régularité", value: score.regularity },
                  { label: "Contenu", value: score.content },
                  { label: "Structure", value: score.structure },
                  { label: "Momentum", value: score.momentum },
                ].map(({ label, value }, i) => (
                  <div
                    key={label}
                    className="rounded-xl border border-white/[0.07] bg-card/50 px-3.5 py-2 backdrop-blur-sm"
                    style={{
                      opacity: mounted ? 1 : 0,
                      transform: mounted ? "translateY(0)" : "translateY(10px)",
                      transition: `opacity 500ms ease-out ${650 + i * 80}ms, transform 500ms ease-out ${650 + i * 80}ms`,
                    }}
                  >
                    <span className="block text-[10px] text-muted-foreground">{label}</span>
                    <span className="text-sm font-bold tabular-nums text-foreground">{value}%</span>
                  </div>
                ))}
              </div>
            )}

            {/* Live indicator */}
            {summary.is_live && (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-destructive/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-destructive">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" />
                En live
                {(summary.live_viewer_count ?? 0) > 0 && ` · ${formatNumber(summary.live_viewer_count!)} viewers`}
                {summary.live_title ? ` · ${summary.live_title}` : ""}
              </div>
            )}
          </div>
        </div>

        {/* Banners & warnings */}
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
                  <Link to="/analyse">
                    <RefreshCw className="h-3.5 w-3.5" /> Voir mon analyse
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
          <FoundationModeBanner streams30d={displayMode.streams30d} />
        )}

        {/* Signal bento */}
        <div style={anim(280)} className="mb-4 grid gap-3 lg:grid-cols-6">

          {nextAction && (
            <div className="col-span-full lg:col-span-4">
              <div className="h-full rounded-2xl border border-primary/20 bg-primary/[0.06] p-6 shadow-[inset_0_1px_0_hsl(var(--primary)/0.12)] backdrop-blur-xl">
                <div className="mb-3 flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 shadow-[0_0_20px_hsl(var(--primary)/0.3)]">
                    <Zap className="h-4 w-4 text-primary-strong" />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-strong">
                    Action prioritaire
                  </span>
                </div>
                <p className="text-lg font-semibold leading-snug text-foreground md:text-xl">
                  {nextAction.title}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {nextAction.reason}
                </p>
              </div>
            </div>
          )}

          <div className={`col-span-full ${nextAction ? "lg:col-span-2" : "lg:col-span-6"}`}>
            <div className="h-full rounded-2xl border border-white/[0.07] bg-card/40 p-5 backdrop-blur-xl">
              <span className="mb-4 block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Métriques clés
              </span>
              <div className="space-y-3.5">
                {[
                  {
                    label: "Viewers moyens",
                    display: summary.avg_viewers > 0 ? `~${formatNumber(summary.avg_viewers)}` : "—",
                    pct: summary.avg_viewers > 0 ? Math.min(100, (summary.avg_viewers / 100) * 100) : 0,
                    delay: 0.8,
                  },
                  {
                    label: "Régularité",
                    display: `${score.regularity}%`,
                    pct: score.regularity,
                    delay: 0.9,
                  },
                  {
                    label: "Contenu",
                    display: `${score.content}%`,
                    pct: score.content,
                    delay: 1.0,
                  },
                ].map(({ label, display, pct, delay }) => (
                  <div key={label}>
                    <div className="mb-1.5 flex items-baseline justify-between">
                      <span className="text-[11px] text-muted-foreground">{label}</span>
                      <span className="text-[11px] font-semibold tabular-nums text-foreground">{display}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted/30">
                      <div
                        className="h-full rounded-full bg-primary/70"
                        style={{ width: `${pct}%`, transition: `width 1.2s ease-out ${delay}s` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {!isReconstruction && (
            <div className="col-span-full">
              <ScoreInsightCard score={score} />
            </div>
          )}
        </div>

        {/* Learning resources targeting weak dimensions */}
        {!isReconstruction && score.breakdown.length > 0 && (
          <DimensionResources breakdown={score.breakdown} maxDimensions={2} />
        )}

        {!isReconstruction && (
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
                { label: "Affiliation", pct: score.monetization },
              ].map((s) => (
                <ProgressRow key={s.label} label={s.label} value={`${s.pct}%`} pct={s.pct} tinted />
              ))}
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
                  message="Connecte Twitch pour voir tous les concurrents pertinents"
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

        {/* Stage-aware progression module */}
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
                          : Math.min(100, Math.round((followersValue / ap.followers.target) * 100)),
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

          if (stage === "rookie") return null;

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
                    <div key={s.label} className="rounded-lg border border-border/60 bg-muted/20 p-4">
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

        {/* Recommendations — glassmorphism */}
        <section className="mb-8" style={anim(400)}>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Actions recommandées
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {priorityRecs.map((rec, i) => {
              const locked = !isPersisted && i >= 2;
              const Icon = categoryIcons[rec.category] || Lightbulb;
              return (
                <div
                  key={rec.id}
                  className={`group relative overflow-hidden rounded-2xl border p-5 backdrop-blur-xl transition-all duration-300 ${
                    locked
                      ? "border-white/[0.04] bg-card/15"
                      : "border-white/[0.08] bg-card/40 hover:border-primary/25 hover:shadow-[0_0_40px_hsl(var(--primary)/0.12)]"
                  }`}
                >
                  {locked && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-background/55 backdrop-blur-sm">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.08] bg-card/70">
                        <Lock className="h-3.5 w-3.5 text-muted-foreground/60" />
                      </div>
                      <p className="text-[11px] text-muted-foreground/60">
                        Connecte Twitch pour débloquer
                      </p>
                    </div>
                  )}
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                      locked ? "bg-muted/20" : "bg-primary/15 group-hover:bg-primary/25"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${locked ? "text-muted-foreground/25" : "text-primary-strong"}`} />
                  </div>
                  <h3
                    className={`mt-3 text-sm font-semibold leading-snug ${
                      locked ? "text-foreground/25" : "text-foreground"
                    }`}
                  >
                    {rec.title}
                  </h3>
                  <p
                    className={`mt-1.5 text-xs leading-relaxed ${
                      locked ? "text-muted-foreground/15" : "text-muted-foreground"
                    }`}
                  >
                    {rec.reason}
                  </p>
                  {!locked && rec.action && (
                    <p className="mt-3 text-xs font-medium text-primary-strong">{rec.action}</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {!isPersisted && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
              <Lock className="h-5 w-5 text-primary-strong" />
              <h3 className="text-base font-semibold text-foreground">
                Tu veux l'analyse complète ?
              </h3>
              <p className="mx-auto max-w-md text-sm text-muted-foreground">
                {user
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
