import { useEffect, useState, useCallback } from "react";
import { markOnboardingStepVisited } from "@/components/OnboardingGuide";
import { analytics } from "@/services/analytics";
import {
  Clock,
  Target,
  Lightbulb,
  Zap,
  Trophy,
  AlertCircle,
  ChevronDown,
  TrendingDown,
  ArrowRight,
  Users,
  Radio,
  Calendar,
} from "lucide-react";
import ShareScoreButton from "@/components/ShareScoreButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import PageHeader from "@/components/PageHeader";
import SectionHeader from "@/components/SectionHeader";
import CompetitorCard from "@/components/CompetitorCard";
import CompetitorFeedbackBar from "@/components/CompetitorFeedbackBar";
import EmptyReportState from "@/components/EmptyReportState";
import { LoadingState } from "@/components/StateView";
import ProgressRow from "@/components/ProgressRow";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useTwitchConnection } from "@/hooks/useTwitchConnection";
import {
  getLatestReport,
  getLatestReportForPlatformUser,
  type SavedReport,
} from "@/services/reportRepository";
import type { AnalysisReport } from "@/types/analysis";
import { getAccountDisplayMode } from "@/services/accountDisplayMode";
import { formatNumber, formatCompact } from "@/lib/format";
import { runAnalysis } from "@/services/analysisRunner";
import { Loader2 } from "lucide-react";
import StreamScoreEvolutionCard from "@/components/StreamScoreEvolutionCard";
import { getScoreTier, getTierTheme, buildScoreNarrative } from "@/services/streamScoreTier";
import { cn } from "@/lib/utils";

const AnimatedScoreRing = ({
  score,
  strokeVar,
  size = 168,
}: {
  score: number;
  strokeVar: string;
  size?: number;
}) => {
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
    <div className="relative shrink-0" style={{ height: size, width: size }}>
      <div className="pointer-events-none absolute inset-6 rounded-full blur-2xl" style={{ background: `hsl(${strokeVar} / 0.2)` }} />
      <svg viewBox="0 0 200 200" className="relative h-full w-full -rotate-90">
        <defs>
          <linearGradient id="anRingGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={`hsl(${strokeVar})`} />
            <stop offset="100%" stopColor={`hsl(${strokeVar} / 0.4)`} />
          </linearGradient>
          <filter id="anGlow">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <circle cx="100" cy="100" r={radius} fill="none" stroke="hsl(var(--border))" strokeOpacity="0.3" strokeWidth={sw} />
        <circle cx="100" cy="100" r={radius} fill="none" stroke="url(#anRingGrad)" strokeWidth={sw + 0.5} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset} filter="url(#anGlow)"
          style={{ transition: "stroke-dashoffset 1.6s cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[2.75rem] font-bold leading-none tabular-nums tracking-tight text-foreground">{score}</span>
        <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">StreamScore</span>
      </div>
    </div>
  );
};

const categoryIcons: Record<string, typeof Clock> = {
  regularity: Clock,
  content: Lightbulb,
  positioning: Target,
  structure: Clock,
  monetization: Trophy,
  momentum: Zap,
  general: Lightbulb,
};

const AnalysePage = () => {
  const { user, loading: authLoading } = useAuth();
  const { account, loading: twitchLoading } = useTwitchConnection();
  const [saved, setSaved] = useState<SavedReport | null>(null);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [autoRunning, setAutoRunning] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [openDim, setOpenDim] = useState<string | null>(null);
  const [showAllDims, setShowAllDims] = useState(false);

  const applyReport = useCallback((r: SavedReport) => {
    setSaved(r);
    setReport(r.report);
    analytics.reportViewed(
      r.report.identity?.platform_login ?? r.report.channel_summary?.channel_name ?? "",
      r.report.score?.overall ?? 0,
    );
    const weakest = [
      { key: "regularity", pct: r.report.score.regularity },
      { key: "content", pct: r.report.score.content },
      { key: "structure", pct: r.report.score.structure },
      { key: "positioning", pct: r.report.score.positioning },
      { key: "momentum", pct: r.report.score.momentum },
      { key: "monetization", pct: r.report.score.monetization },
    ].sort((a, b) => a.pct - b.pct)[0];
    setOpenDim(weakest?.key ?? null);
    setNotFound(false);
  }, []);

  useEffect(() => {
    if (authLoading || twitchLoading || !user) return;
    markOnboardingStepVisited(user.id, "analyse");
    let cancelled = false;
    (async () => {
      setLoading(true);
      const platformUserId = account?.platform_user_id ?? null;
      const r = platformUserId
        ? await getLatestReportForPlatformUser(user.id, platformUserId)
        : await getLatestReport(user.id);
      if (cancelled) return;
      if (r) {
        applyReport(r);
        setLoading(false);
      } else if (account?.platform_login) {
        // No report found but Twitch is connected — auto-trigger analysis.
        setLoading(false);
        setAutoRunning(true);
        try {
          const result = await runAnalysis({
            channelName: account.platform_login,
            userId: user.id,
            platform: "twitch",
            platformUserId: account.platform_user_id ?? undefined,
            platformLogin: account.platform_login,
            platformDisplayName: account.platform_display_name ?? account.platform_login,
          });
          if (cancelled) return;
          const fresh = result.reportId
            ? await getLatestReport(user.id)
            : null;
          if (fresh) {
            applyReport(fresh);
          } else {
            setNotFound(true);
          }
        } catch {
          if (!cancelled) setNotFound(true);
        } finally {
          if (!cancelled) setAutoRunning(false);
        }
      } else {
        setNotFound(true);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, authLoading, twitchLoading, account?.platform_user_id, account?.platform_login, applyReport]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (loading) {
    return (
      <AppShell>
        <LoadingState />
      </AppShell>
    );
  }

  if (autoRunning) {
    return (
      <AppShell>
        <PageContainer size="sm">
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-foreground">Analyse en cours…</p>
            <p className="text-xs text-muted-foreground">On lit tes 30 derniers jours de stream et on calcule ton StreamScore.</p>
          </div>
        </PageContainer>
      </AppShell>
    );
  }

  if (notFound || !report || !saved) {
    const isConnected = !!account?.platform_login;
    return (
      <AppShell>
        <PageContainer size="sm">
          <PageHeader
            eyebrow="Analyse"
            title="Analyse"
            description="Comprends ton StreamScore, tes blocages, et ce qu'il faut corriger."
          />
          {isConnected ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                  <AlertCircle className="h-4 w-4 text-primary" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-base font-semibold text-foreground">Diagnostic introuvable</h2>
                  <p className="mx-auto max-w-md text-sm text-muted-foreground">
                    Une erreur est survenue lors de la génération. Actualise la page pour relancer automatiquement.
                  </p>
                </div>
                <Button className="mt-2" onClick={() => window.location.reload()}>
                  Actualiser
                </Button>
              </CardContent>
            </Card>
          ) : (
            <EmptyReportState
              title="Aucun diagnostic disponible"
              description="Connecte ta chaîne Twitch pour générer ton diagnostic automatiquement."
              ctaLabel="Connecter Twitch"
              ctaHref="/connect-twitch"
            />
          )}
        </PageContainer>
      </AppShell>
    );
  }

  const summary = report.channel_summary;
  const score = report.score;
  const ap = report.affiliate_progress;
  const tier = getScoreTier(score.overall);
  const theme = getTierTheme(tier);
  const displayMode = getAccountDisplayMode(report);
  const isReconstruction = displayMode.mode === "reconstruction";
  const isExploration = displayMode.mode === "exploration";
  const stage =
    summary.broadcaster_type === "partner"
      ? "partner"
      : summary.broadcaster_type === "affiliate"
        ? "affiliate"
        : "rookie";
  const showAffiliateProgression = stage === "rookie" && !isReconstruction;
  const priorityRecs = report.recommendations
    .filter((r) => r.type === "priority")
    .slice(0, 3);
  const nextAction = report.next_best_action;
  const narrative = buildScoreNarrative(score);
  const streams30d = Number(report.facts?.find((f) => f.key === "streams_30d")?.value ?? 0);
  const directCompetitors = report.competitor_groups.find((g) => g.type === "direct");
  const visibleCompetitors = isReconstruction
    ? []
    : (directCompetitors?.matches ?? []);
  const showCompetitorsSection = !isReconstruction;

  const anim = (delay = 0) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(20px)",
    transition: `opacity 650ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 650ms cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
  });

  return (
    <AppShell>
      <PageContainer>

        {/* Top bar: share */}
        <div className="mb-4 flex items-center justify-end" style={anim(0)}>
          <ShareScoreButton
            score={score}
            displayName={summary.display_name}
            login={report.identity?.platform_login ?? null}
            date={new Date(saved.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
            variant="button"
          />
        </div>

        {/* Hero card — compact analysis summary */}
        <div
          style={anim(80)}
          className="relative mb-4 overflow-hidden rounded-3xl border border-white/[0.08] bg-card/40 backdrop-blur-xl shadow-[0_32px_100px_-32px_hsl(var(--primary)/0.35)]"
        >
          <div className="pointer-events-none absolute -top-24 left-1/3 h-64 w-64 rounded-full bg-primary/12 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 right-0 h-56 w-56 rounded-full bg-primary/8 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(var(--primary)/0.07),transparent_55%)]" />

          <div className="relative grid gap-6 p-5 sm:p-6 md:grid-cols-[1fr_auto] md:gap-8 md:p-7">
            {/* Left: identity + KPIs */}
            <div className="flex min-w-0 flex-col gap-5">
              {/* Identity */}
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <div className="absolute -inset-3 rounded-full bg-primary/12 blur-xl" />
                  <Avatar className="relative h-16 w-16 border-2 border-primary/25 shadow-[0_0_40px_hsl(var(--primary)/0.28)] ring-2 ring-primary/10 sm:h-[72px] sm:w-[72px]">
                    {report.identity?.avatar_url && (
                      <AvatarImage src={report.identity.avatar_url} alt={`Avatar ${summary.display_name}`} />
                    )}
                    <AvatarFallback className="bg-muted text-base font-bold text-muted-foreground">
                      {(summary.display_name || "?").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {summary.is_live && (
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-background bg-destructive">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
                    Résumé d'analyse
                  </p>
                  <h1 className="mt-0.5 truncate bg-gradient-to-b from-foreground to-foreground/80 bg-clip-text text-2xl font-bold tracking-tight text-transparent md:text-[28px]">
                    {summary.display_name}
                  </h1>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-xs text-muted-foreground">
                      @{report.identity?.platform_login ?? summary.channel_name}
                    </span>
                    {summary.category && summary.category !== "unknown" && (
                      <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                        {summary.category}
                      </span>
                    )}
                    {summary.broadcaster_type === "affiliate" && (
                      <span className="rounded-full border border-white/10 bg-card/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        Affilié
                      </span>
                    )}
                    {summary.broadcaster_type === "partner" && (
                      <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                        Partenaire
                      </span>
                    )}
                    {summary.is_live && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-destructive">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" />
                        En live
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* KPIs inside the hero */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[
                  {
                    icon: Radio,
                    label: "Viewers moyens",
                    value: summary.avg_viewers > 0 ? `~${formatNumber(summary.avg_viewers)}` : "—",
                    sub: "Derniers 30 jours",
                  },
                  {
                    icon: Calendar,
                    label: "Sessions",
                    value: `${streams30d}`,
                    sub: "Lives en 30 jours",
                  },
                  {
                    icon: Users,
                    label: "Followers",
                    value: summary.follower_count != null && summary.follower_count > 0
                      ? formatNumber(summary.follower_count)
                      : "—",
                    sub: "Total Twitch",
                  },
                ].map(({ icon: Icon, label, value, sub }) => (
                  <div
                    key={label}
                    className="flex min-w-0 flex-col gap-1 rounded-xl border border-white/[0.06] bg-background/30 p-3"
                  >
                    <div className="flex items-center gap-1.5">
                      <Icon className="h-3 w-3 text-muted-foreground/50" />
                      <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                        {label}
                      </p>
                    </div>
                    <p className="text-lg font-bold tabular-nums leading-tight text-foreground sm:text-xl">
                      {value}
                    </p>
                    <p className="text-[10px] text-muted-foreground/50">{sub}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Score */}
            <div className="flex flex-col items-center justify-center gap-3 md:min-w-[200px] md:border-l md:border-white/[0.06] md:pl-8">
              <AnimatedScoreRing score={score.overall} strokeVar={theme.strokeVar} size={168} />
              <span
                className={cn(
                  "rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider",
                  theme.surfaceClass,
                  theme.textClass,
                )}
                style={{ opacity: mounted ? 1 : 0, transition: "opacity 500ms ease-out 700ms" }}
              >
                {theme.label}
              </span>
            </div>
          </div>
        </div>


        {/* Score evolution */}
        <div style={anim(160)} className="mb-4">
          <StreamScoreEvolutionCard userId={user!.id} platformUserId={account?.platform_user_id ?? null} />
        </div>

        {/* Score decomposition accordion */}
        <div style={anim(200)} className="mb-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-semibold text-foreground">
                  Décomposition du StreamScore
                </CardTitle>
              </div>
              {narrative.headline && (
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">{narrative.headline}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-0.5 pt-0">
              {[
                { key: "regularity", label: "Régularité", pct: score.regularity },
                { key: "content", label: "Contenu", pct: score.content },
                { key: "structure", label: "Structure", pct: score.structure },
                { key: "positioning", label: "Positionnement", pct: score.positioning },
                { key: "momentum", label: "Momentum", pct: score.momentum },
                { key: "monetization", label: "Monétisation", pct: score.monetization },
              ]
                .sort((a, b) => a.pct - b.pct)
                .slice(0, showAllDims ? 6 : 3)
                .map(({ key, label, pct }) => {
                const bdItem = score.breakdown.find(
                  (b) => b.dimension === key || b.dimension === label.toLowerCase(),
                );
                const isOpen = openDim === key;
                const dimTier = getScoreTier(pct);
                const dimTheme = getTierTheme(dimTier);
                const reasons = bdItem?.reasons ?? [];
                const levers = bdItem?.levers ?? [];
                return (
                  <div key={key}>
                    <button
                      onClick={() => {
                        if (!isOpen) analytics.scoreDimensionExpanded(key, pct);
                        setOpenDim(isOpen ? null : key);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/20 transition-colors rounded-xl group"
                    >
                      {/* Score bubble */}
                      <div
                        className={cn(
                          "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-shadow duration-300",
                          dimTheme.surfaceClass,
                          dimTheme.glowClass,
                        )}
                      >
                        <span className={cn("text-xs font-bold tabular-nums leading-none", dimTheme.textClass)}>
                          {pct}
                        </span>
                      </div>
                      {/* Label */}
                      <span className="w-28 shrink-0 text-sm font-medium text-foreground">{label}</span>
                      {/* Bar */}
                      <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-muted/30">
                        <div
                          className={cn("h-full rounded-full transition-all duration-700", dimTheme.progressClass)}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      {/* Expand hint */}
                      <div className="flex shrink-0 items-center gap-1">
                        {!isOpen && (
                          <span className="text-[10px] text-muted-foreground/50 group-hover:text-muted-foreground/80 transition-colors hidden sm:inline">
                            Détails
                          </span>
                        )}
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform duration-200 group-hover:text-muted-foreground/80",
                            isOpen && "rotate-180 text-muted-foreground/80",
                          )}
                        />
                      </div>
                    </button>
                    {isOpen && (
                      <div className="mx-1 mb-2 grid gap-2 rounded-xl border border-border/40 bg-muted/10 p-3 sm:grid-cols-2">
                        <div>
                          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                            <TrendingDown className="h-3 w-3" /> Ce qui freine
                          </p>
                          {reasons.length > 0 ? (
                            <ul className="space-y-1">
                              {reasons.map((r) => (
                                <li key={r} className="text-xs text-foreground/90 leading-snug">• {r}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">Pas assez de données pour cette période.</p>
                          )}
                        </div>
                        <div>
                          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary/70 mb-1.5">
                            <ArrowRight className="h-3 w-3" /> Pour progresser
                          </p>
                          {levers.length > 0 ? (
                            <ul className="space-y-1">
                              {levers.map((l) => (
                                <li key={l} className="text-xs text-foreground/90 leading-snug">• {l}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">Lance des streams pour débloquer des conseils personnalisés.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <button
                onClick={() => setShowAllDims((v) => !v)}
                className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs text-muted-foreground/50 transition-colors hover:text-muted-foreground"
              >
                {showAllDims ? "Réduire" : "Voir les 3 dimensions restantes"}
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", showAllDims && "rotate-180")} />
              </button>
            </CardContent>
          </Card>
        </div>

        {/* Followers unavailable warning */}
        {summary.followers_available === false && !saved.is_demo && !summary.is_partial && (
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

        {/* Focus card — merges Foundation mode + Action prioritaire */}
        {((isReconstruction || isExploration) || nextAction) && (
          <div style={anim(280)} className="mb-4">
            <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-5 shadow-[inset_0_1px_0_hsl(var(--primary)/0.10)]">
              {/* Header row: mode chip only — no technical signal chips. */}
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {(isReconstruction || isExploration) && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                    <Zap className="h-2.5 w-2.5" />
                    {isReconstruction ? "Mode structuration" : "Mode exploration"}
                  </span>
                )}
              </div>
              {/* Priority action */}
              {nextAction && (
                <>
                  <p className="text-base font-semibold leading-snug text-foreground">
                    {nextAction.title}
                  </p>
                  {nextAction.reason && (
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                      {nextAction.reason}
                    </p>
                  )}
                </>
              )}
              {/* CTA */}
              <div className="mt-3 flex items-center justify-end">
                <Button asChild size="sm" variant="ghost" className="h-7 gap-1 text-xs text-primary hover:bg-primary/10">
                  <Link to="/plan">
                    Voir le plan <ArrowRight className="h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="mb-10" />


        {/* Competitors */}
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
                  <CompetitorFeedbackBar reportId={saved.id} competitorKey={c.competitor_login} />
                </div>
              ))}
              {visibleCompetitors.length === 0 && (
                <div className="rounded-xl border border-border/40 bg-muted/20 px-4 py-5 text-center">
                  <p className="text-sm font-medium text-foreground">Aucun concurrent détecté</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Le positionnement de ta chaîne est encore trop peu défini pour trouver des profils similaires. Stream régulièrement dans une catégorie principale pour que l'algorithme puisse te situer.
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Affiliate / partner progression */}
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

        {/* Recommendations */}
        <section className="mb-8" style={anim(400)}>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Actions recommandées
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {priorityRecs.map((rec) => {
              const Icon = categoryIcons[rec.category] || Lightbulb;
              return (
                <div
                  key={rec.id}
                  className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-card/40 p-5 backdrop-blur-xl transition-all duration-300 hover:border-primary/25 hover:shadow-[0_0_40px_hsl(var(--primary)/0.12)]"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 transition-colors group-hover:bg-primary/25">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="mt-3 text-sm font-semibold leading-snug text-foreground">
                    {rec.title}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {rec.reason}
                  </p>
                  {rec.action && (
                    <p className="mt-3 text-xs font-medium text-primary">{rec.action}</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

      </PageContainer>
    </AppShell>
  );
};

export default AnalysePage;
