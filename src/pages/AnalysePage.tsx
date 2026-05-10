import { useEffect, useState } from "react";
import { markOnboardingStepVisited } from "@/components/OnboardingGuide";
import {
  Clock,
  Target,
  Lightbulb,
  Zap,
  Trophy,
  AlertCircle,
  Printer,
  ChevronDown,
  TrendingDown,
  ArrowRight,
  Users,
  Radio,
  Calendar,
} from "lucide-react";
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
import DimensionResources from "@/components/DimensionResources";
import StreamScoreEvolutionCard from "@/components/StreamScoreEvolutionCard";
import { getScoreTier, getTierTheme, buildScoreNarrative } from "@/services/streamScoreTier";
import { cn } from "@/lib/utils";

const AnimatedScoreRing = ({ score, strokeVar }: { score: number; strokeVar: string }) => {
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
        <span className="text-[3.25rem] font-bold leading-none tabular-nums tracking-tight text-foreground">{score}</span>
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
  const [mounted, setMounted] = useState(false);
  const [openDim, setOpenDim] = useState<string | null>(null);

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
        setSaved(r);
        setReport(r.report);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, authLoading, twitchLoading, account?.platform_user_id]);

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

  if (notFound || !report || !saved) {
    return (
      <AppShell>
        <PageContainer size="sm">
          <PageHeader
            eyebrow="Analyse"
            title="Analyse"
            description="Comprends ton StreamScore, tes blocages, et ce qu'il faut corriger."
          />
          <EmptyReportState
            title="Aucun diagnostic disponible"
            description="Lance une analyse depuis la page d'accueil pour générer ton diagnostic."
          />
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

        {/* Top bar: print */}
        <div className="mb-4 flex items-center justify-end print:hidden" style={anim(0)}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.print()}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <Printer className="h-3.5 w-3.5" />
            Télécharger en PDF
          </Button>
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
              <h1 className="bg-gradient-to-b from-foreground to-foreground/80 bg-clip-text text-3xl font-bold tracking-tight text-transparent md:text-4xl">
                {summary.display_name}
              </h1>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="text-sm text-muted-foreground">
                  @{report.identity?.platform_login ?? summary.channel_name}
                </span>
                {summary.category && summary.category !== "unknown" && (
                  <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                    {summary.category}
                  </span>
                )}
                {summary.broadcaster_type === "affiliate" && (
                  <span className="rounded-full border border-white/10 bg-card/60 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Affilié
                  </span>
                )}
                {summary.broadcaster_type === "partner" && (
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                    Partenaire
                  </span>
                )}
              </div>
            </div>

            {/* Score ring */}
            <AnimatedScoreRing score={score.overall} strokeVar={theme.strokeVar} />

            {/* Tier label */}
            <span
              className={cn("rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider", theme.surfaceClass, theme.textClass)}
              style={{ opacity: mounted ? 1 : 0, transition: "opacity 500ms ease-out 700ms" }}
            >
              {theme.label}
            </span>

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

        {/* Score decomposition accordion */}
        <div style={anim(160)} className="mb-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Décomposition du StreamScore
              </CardTitle>
              {narrative.headline && (
                <p className="text-xs text-muted-foreground leading-relaxed">{narrative.headline}</p>
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
              ].map(({ key, label, pct }) => {
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
                      onClick={() => setOpenDim(isOpen ? null : key)}
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
                      {/* Chevron */}
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 shrink-0 text-muted-foreground/30 transition-transform duration-200 group-hover:text-muted-foreground/60",
                          isOpen && "rotate-180 text-muted-foreground/60",
                        )}
                      />
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
            </CardContent>
          </Card>
        </div>

        {/* Score evolution */}
        <div style={anim(200)} className="mb-4">
          <StreamScoreEvolutionCard userId={user!.id} />
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
              {/* Header row: mode chip + signals */}
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {(isReconstruction || isExploration) && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                    <Zap className="h-2.5 w-2.5" />
                    {isReconstruction ? "Mode structuration" : "Mode exploration"}
                  </span>
                )}
                {displayMode.reasons.slice(0, 2).map((r) => (
                  <span key={r} className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground">
                    {r}
                  </span>
                ))}
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

        {/* 3 stat cards — unique metrics not in score decomposition */}
        <div style={anim(320)} className="mb-14 grid grid-cols-3 gap-3">
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
              className="flex flex-col gap-1.5 rounded-2xl border border-white/[0.07] bg-card/40 p-4 backdrop-blur-xl"
            >
              <div className="flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 text-muted-foreground/50" />
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">{label}</p>
              </div>
              <p className="text-2xl font-bold tabular-nums text-foreground">{value}</p>
              <p className="text-[10px] text-muted-foreground/40">{sub}</p>
            </div>
          ))}
        </div>

        {/* Learning resources */}
        {score.breakdown.length > 0 && (
          <DimensionResources breakdown={score.breakdown} maxDimensions={2} />
        )}

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
                <p className="text-sm text-muted-foreground">
                  Aucun concurrent similaire trouvé pour cette chaîne.
                </p>
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
