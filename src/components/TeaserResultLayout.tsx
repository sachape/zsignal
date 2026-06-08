import { useState, useEffect } from "react";
import {
  Clock,
  Lightbulb,
  Target,
  Trophy,
  Zap,
  Lock,
  Sparkles,
  TrendingUp,
  Calendar,
  Users,
  Eye,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  Compass,
  TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { AnalysisReport } from "@/types/analysis";
import { getAccountDisplayMode } from "@/services/accountDisplayMode";
import { buildScoreNarrative, getScoreTier, getTierTheme } from "@/services/streamScoreTier";

// ─── Score ring ───────────────────────────────────────────────────────────

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
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-6 rounded-full bg-primary/20 blur-2xl" />
      <svg viewBox="0 0 200 200" className="relative h-full w-full -rotate-90">
        <defs>
          <linearGradient id="trRingGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--primary)/0.4)" />
          </linearGradient>
          <filter id="trGlow">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Track */}
        <circle
          cx="100" cy="100" r={radius}
          fill="none"
          stroke="hsl(var(--border))"
          strokeOpacity="0.3"
          strokeWidth={sw}
        />
        {/* Score arc */}
        <circle
          cx="100" cy="100" r={radius}
          fill="none"
          stroke="url(#trRingGrad)"
          strokeWidth={sw + 0.5}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          filter="url(#trGlow)"
          style={{ transition: "stroke-dashoffset 1.6s cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      {/* Center */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[3.25rem] font-bold leading-none tabular-nums tracking-tight text-foreground">
          {score}
        </span>
        <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          StreamScore
        </span>
      </div>
    </div>
  );
};

// ─── Inline score insight (lighter than full ScoreInsightCard) ────────────

const InlineScoreInsight = ({ score }: { score: AnalysisReport["score"] }) => {
  const narrative = buildScoreNarrative(score);
  const tier = getScoreTier(score.overall);
  const theme = getTierTheme(tier);

  return (
    <div className={`h-full rounded-2xl border p-5 backdrop-blur-xl ${theme.surfaceClass}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Pourquoi ce score
      </p>
      <p className="mt-2 text-sm font-semibold leading-snug text-foreground">
        {narrative.headline}
      </p>

      {(narrative.drags.length > 0 || narrative.supports.length > 0) && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {narrative.drags.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                <TrendingDown className="h-3 w-3" />
                Ce qui tire vers le bas
              </div>
              <ul className="mt-1.5 space-y-1">
                {narrative.drags.map((d) => (
                  <li key={d} className="text-xs text-foreground">· {d}</li>
                ))}
              </ul>
            </div>
          )}
          {narrative.supports.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                Ce qui soutient
              </div>
              <ul className="mt-1.5 space-y-1">
                {narrative.supports.map((s) => (
                  <li key={s} className="text-xs text-foreground">· {s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {narrative.miniBreakdown.length > 0 && (
        <div className="mt-4 space-y-1.5 border-t border-border/30 pt-3">
          {narrative.miniBreakdown.map((d) => {
            const dt = getTierTheme(d.tier);
            return (
              <div key={d.label} className="flex items-center gap-3">
                <span className="w-28 text-[11px] text-muted-foreground">{d.label}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted/40">
                  <div
                    className={`h-full ${dt.progressClass}`}
                    style={{ width: `${d.score}%`, transition: "width 1s ease-out 0.6s" }}
                  />
                </div>
                <span className={`w-8 text-right text-[11px] font-semibold tabular-nums ${dt.textClass}`}>
                  {d.score}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Category icons ───────────────────────────────────────────────────────

const categoryIcons: Record<string, React.ElementType> = {
  regularity: Clock,
  content: Lightbulb,
  positioning: Target,
  structure: Clock,
  monetization: Trophy,
  momentum: Zap,
  general: Lightbulb,
};

// ─── Main component ───────────────────────────────────────────────────────

interface Props {
  report: AnalysisReport;
  onUnlock: () => void;
  isAuthenticated: boolean;
  hasTwitchConnected: boolean;
}

const TeaserResultLayout = ({
  report,
  onUnlock,
  isAuthenticated,
  hasTwitchConnected,
}: Props) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const summary = report.channel_summary;
  const score = report.score;
  const identity = report.identity;
  const ap = report.affiliate_progress;
  const displayMode = getAccountDisplayMode(report);
  const isReconstruction = displayMode.mode === "reconstruction";
  const isExploration = displayMode.mode === "exploration";

  const priorityRecs = report.recommendations
    .filter((r) => r.type === "priority")
    .slice(0, 3);
  const nextAction = report.next_best_action;
  const login = identity?.platform_login ?? summary.channel_name;
  const avatarUrl = identity?.avatar_url ?? null;
  const category = summary.category && summary.category !== "unknown" ? summary.category : null;

  const unlockLabel = !isAuthenticated
    ? "Créer mon compte Streamnco"
    : !hasTwitchConnected
    ? "Connecter Twitch"
    : "Voir mon dashboard";

  // Staggered entrance animation
  const anim = (delay = 0): React.CSSProperties => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(20px)",
    transition: `opacity 650ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 650ms cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
  });

  return (
    <div className="space-y-4">

      {/* ── 1. COMPACT APERÇU NOTICE ─────────────────────────────── */}
      <div
        style={anim(0)}
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/[0.06] px-4 py-3"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <Zap className="h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Aperçu public · données Twitch publiques
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {summary.followers_available === false
                ? "Followers, chatters et historique complets visibles une fois Twitch connecté"
                : "Connecte Twitch pour le diagnostic complet et le suivi dans le temps"}
            </p>
          </div>
        </div>
        <Button size="sm" onClick={onUnlock} className="shrink-0">
          Passer au complet
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* ── 2. HERO CARD ─────────────────────────────────────────── */}
      <div
        style={anim(80)}
        className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-card/40 backdrop-blur-xl shadow-[0_32px_100px_-32px_hsl(var(--primary)/0.35)]"
      >
        {/* Ambient glows */}
        <div className="pointer-events-none absolute -top-32 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/12 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 right-0 h-64 w-64 rounded-full bg-primary/8 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_55%)]" />

        <div className="relative flex flex-col items-center gap-5 px-4 py-8 text-center sm:px-6 sm:py-12 md:py-16">

          {/* Avatar */}
          <div className="relative">
            <div className="absolute -inset-4 rounded-full bg-primary/12 blur-2xl" />
            <Avatar className="relative h-24 w-24 border-2 border-primary/25 shadow-[0_0_56px_hsl(var(--primary)/0.3)] ring-[3px] ring-primary/10">
              {avatarUrl && (
                <AvatarImage src={avatarUrl} alt={`Avatar ${login}`} />
              )}
              <AvatarFallback className="bg-muted text-xl font-bold text-muted-foreground">
                {(login || "?").slice(0, 2).toUpperCase()}
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
              <span className="text-sm text-muted-foreground">@{login}</span>
              {category && (
                <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                  {category}
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

          {/* Score ring OR foundation mode */}
          {isReconstruction ? (
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 shadow-[0_0_32px_hsl(var(--primary)/0.25)]">
                <Compass className="h-8 w-8 text-primary" />
              </div>
              <div className="max-w-sm">
                <p className="text-sm font-semibold uppercase tracking-wider text-primary">
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

          {/* Dimension chips — staggered */}
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
        </div>
      </div>

      {/* ── 3. FOUNDATION / EXPLORATION BANNER ──────────────────── */}
      {(isReconstruction || isExploration) && (
        <div style={anim(200)}>
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15">
                <Compass className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                  Mode structuration
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  Tu n'es pas encore en phase d'optimisation.
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  L'objectif des prochaines semaines : créer un signal de croissance lisible. On avance étape par étape, pas métrique par métrique.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 4. SIGNAL BENTO ──────────────────────────────────────── */}
      <div style={anim(280)} className="grid gap-3 lg:grid-cols-6">

        {/* Next action — large */}
        {nextAction && (
          <div className="col-span-full lg:col-span-4">
            <div className="h-full rounded-2xl border border-primary/20 bg-primary/[0.06] p-6 shadow-[inset_0_1px_0_hsl(var(--primary)/0.12)] backdrop-blur-xl">
              <div className="mb-3 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 shadow-[0_0_20px_hsl(var(--primary)/0.3)]">
                  <Zap className="h-4 w-4 text-primary" />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
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

        {/* Affiliate progression mini */}
        <div className="col-span-full lg:col-span-2">
          <div className="h-full rounded-2xl border border-white/[0.07] bg-card/40 p-5 backdrop-blur-xl">
            <span className="mb-4 block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Vers l'affiliation
            </span>
            <div className="space-y-3.5">
              {[
                {
                  label: "Followers",
                  current:
                    ap.followers.available === false
                      ? null
                      : Math.min(ap.followers.current ?? 0, ap.followers.target),
                  target: ap.followers.target,
                },
                {
                  label: "Jours stream",
                  current: Math.min(ap.stream_days.current, ap.stream_days.target),
                  target: ap.stream_days.target,
                },
                {
                  label: "Heures stream",
                  current: Math.min(
                    Math.round(ap.stream_hours.current),
                    ap.stream_hours.target,
                  ),
                  target: ap.stream_hours.target,
                },
              ].map(({ label, current, target }) => {
                const pct =
                  current === null
                    ? 0
                    : Math.min(100, Math.round((current / target) * 100));
                return (
                  <div key={label}>
                    <div className="mb-1.5 flex items-baseline justify-between">
                      <span className="text-[11px] text-muted-foreground">{label}</span>
                      <span className="text-[11px] font-semibold tabular-nums text-foreground">
                        {current === null ? "—" : `${current} / ${target}`}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted/30">
                      <div
                        className="h-full rounded-full bg-primary/70"
                        style={{
                          width: `${pct}%`,
                          transition: "width 1.2s ease-out 0.8s",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Score insight — full width */}
        {!isReconstruction && (
          <div className="col-span-full">
            <InlineScoreInsight score={score} />
          </div>
        )}
      </div>

      {/* ── 5. RECOMMENDATIONS ───────────────────────────────────── */}
      {priorityRecs.length > 0 && (
        <div style={anim(400)}>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Actions recommandées
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {priorityRecs.map((rec, i) => {
              const locked = i >= 2;
              const Icon = categoryIcons[rec.category] ?? Lightbulb;
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
                      locked
                        ? "bg-muted/20"
                        : "bg-primary/15 group-hover:bg-primary/25"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 ${locked ? "text-muted-foreground/25" : "text-primary"}`}
                    />
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
                    <p className="mt-3 text-xs font-medium text-primary">{rec.action}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 6. LOCKED PREMIUM PREVIEW ────────────────────────────── */}
      <div
        style={anim(520)}
        className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-card/20 backdrop-blur-xl"
      >
        {/* Blurred decorative UI */}
        <div className="pointer-events-none select-none p-4 blur-[3.5px] sm:p-6" aria-hidden>
          <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Analyse complète
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {/* Mini bar chart */}
            <div className="rounded-2xl border border-white/[0.05] bg-card/40 p-4">
              <p className="mb-3 text-[9px] uppercase tracking-wider text-muted-foreground">
                Progression 30j
              </p>
              <div className="flex h-14 items-end gap-0.5">
                {[25, 40, 30, 55, 48, 65, 58, 72, 68, 82, 78, 91].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm"
                    style={{
                      height: `${h}%`,
                      background: `hsl(var(--primary) / ${0.18 + h / 220})`,
                    }}
                  />
                ))}
              </div>
            </div>
            {/* Competitors preview */}
            <div className="rounded-2xl border border-white/[0.05] bg-card/40 p-4">
              <p className="mb-3 text-[9px] uppercase tracking-wider text-muted-foreground">
                Concurrents directs
              </p>
              <div className="space-y-2.5">
                {[88, 74, 62].map((pct, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className="h-6 w-6 rounded-full bg-muted/40" />
                    <div className="flex-1">
                      <div className="mb-1 h-1.5 w-full rounded-full bg-muted/30" />
                      <div
                        className="h-1 rounded-full bg-primary/30"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Weekly plan preview */}
            <div className="rounded-2xl border border-white/[0.05] bg-card/40 p-4">
              <p className="mb-3 text-[9px] uppercase tracking-wider text-muted-foreground">
                Plan hebdomadaire
              </p>
              <div className="grid grid-cols-7 gap-1">
                {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <span className="text-[7px] text-muted-foreground/50">{d}</span>
                    <div
                      className="h-8 w-full rounded"
                      style={{
                        background: [1, 3, 5].includes(i)
                          ? "hsl(var(--primary) / 0.38)"
                          : "hsl(var(--muted) / 0.22)",
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Lock overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/45 backdrop-blur-[1px]">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.1] bg-card/70 shadow-[0_8px_48px_hsl(var(--primary)/0.3)]">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <p className="mt-3 text-sm font-semibold text-foreground">
            Analyse complète disponible
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Connecte Twitch pour débloquer ces données
          </p>
          <Button size="sm" variant="outline" onClick={onUnlock} className="mt-4">
            Débloquer <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* ── 7. PREMIUM UNLOCK CTA ────────────────────────────────── */}
      <div
        style={anim(640)}
        className="relative overflow-hidden rounded-3xl border border-primary/20 bg-card/30 p-8 backdrop-blur-xl shadow-[0_40px_120px_-40px_hsl(var(--primary)/0.4)] md:p-12"
      >
        {/* Backgrounds */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.13),transparent_65%)]" />
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 right-0 h-64 w-64 rounded-full bg-primary/8 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,hsl(var(--foreground)/0.03)_1px,transparent_1px)] bg-[size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)] opacity-30" />

        <div className="relative">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 shadow-[0_0_48px_hsl(var(--primary)/0.4)]">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>

            <h2 className="bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-2xl font-bold tracking-tight text-transparent md:text-3xl">
              {!isAuthenticated
                ? "Passe au diagnostic complet"
                : !hasTwitchConnected
                ? "Connecte Twitch pour continuer"
                : "Accède à ton dashboard complet"}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">
              {!isAuthenticated
                ? "Crée ton compte pour débloquer toutes les données, l'historique complet et le suivi semaine par semaine."
                : !hasTwitchConnected
                ? "Connecte ta chaîne Twitch pour activer le diagnostic complet, sans rien publier."
                : "Toutes tes données sont disponibles dans ton dashboard."}
            </p>
          </div>

          {/* Benefits grid */}
          <div className="mx-auto mt-6 grid max-w-3xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: TrendingUp,
                title: "StreamScore précis",
                desc: "Calculé sur ton historique live complet",
              },
              {
                icon: Users,
                title: "Concurrents directs",
                desc: "Chaînes similaires identifiées automatiquement",
              },
              {
                icon: Calendar,
                title: "Plan hebdomadaire",
                desc: "Actions prioritaires semaine par semaine",
              },
              {
                icon: Eye,
                title: "Progression en temps réel",
                desc: "Suivi des followers, viewers et régularité",
              },
              {
                icon: Target,
                title: "Blocage principal",
                desc: "Le frein #1 identifié précisément sur ta chaîne",
              },
              {
                icon: CheckCircle2,
                title: "Historique des lives",
                desc: "30 derniers jours analysés en détail",
              },
            ].map(({ icon: Icon, title, desc }, i) => (
              <div
                key={title}
                className="flex items-start gap-3 rounded-2xl border border-white/[0.07] bg-card/30 p-4 text-left backdrop-blur-sm"
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? "translateY(0)" : "translateY(14px)",
                  transition: `opacity 500ms ease-out ${860 + i * 60}ms, transform 500ms ease-out ${860 + i * 60}ms`,
                }}
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/15">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-8 flex flex-col items-center gap-2.5">
            <Button
              size="lg"
              onClick={onUnlock}
              className="h-12 px-8 text-sm font-semibold shadow-[0_0_48px_hsl(var(--primary)/0.5)]"
            >
              {unlockLabel}
              <ChevronRight className="h-4 w-4" />
            </Button>
            <p className="text-[11px] text-muted-foreground">
              Sans engagement · Connexion Twitch en lecture seule
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default TeaserResultLayout;
