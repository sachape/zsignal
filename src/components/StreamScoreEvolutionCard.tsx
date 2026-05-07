import { useEffect, useState } from "react";
import { Minus, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getWeekOverWeekDelta,
  type ScoreLevel,
  type WeekOverWeekDelta,
} from "@/services/streamScoreHistory";
import { getScoreTier, getTierTheme } from "@/services/streamScoreTier";

// ── Static maps ───────────────────────────────────────────────────────────────

const DIM_KEYS = [
  "regularity",
  "structure",
  "content",
  "positioning",
  "momentum",
  "monetization",
] as const;

type DimKey = (typeof DIM_KEYS)[number];

const DIM_LABEL: Record<DimKey, string> = {
  regularity: "Régularité",
  structure: "Structure",
  content: "Contenu",
  positioning: "Positionnement",
  momentum: "Momentum",
  monetization: "Monétisation",
};

const CONFIDENCE_COPY: Record<ScoreLevel, string> = {
  low: "Fiabilité faible : il manque encore des données.",
  medium: "Fiabilité correcte : assez de signaux pour une première lecture.",
  high: "Fiabilité élevée : plusieurs signaux confirment l'analyse.",
};

const SIGNAL_COPY: Record<ScoreLevel, string> = {
  low: "Peu de signaux récents.",
  medium: "Signaux suffisants.",
  high: "Signaux riches et récents.",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDelta(d: number | null): string | null {
  if (d === null) return null;
  const abs = Math.abs(d);
  if (d > 0) return `+${d} pt${abs > 1 ? "s" : ""}`;
  if (d < 0) return `${d} pt${abs > 1 ? "s" : ""}`;
  return "0 pt";
}

function buildNarrativeSentence(d: WeekOverWeekDelta): string {
  const { overall_delta, explanation } = d;
  if (overall_delta === null) return explanation;
  const abs = Math.abs(overall_delta);
  const sign = overall_delta > 0 ? `+${overall_delta}` : `${overall_delta}`;
  const ptLabel = `pt${abs > 1 ? "s" : ""}`;
  if (overall_delta > 0)
    return `Ton StreamScore progresse de ${sign} ${ptLabel}. ${explanation}`;
  if (overall_delta < 0)
    return `Ton StreamScore baisse de ${sign} ${ptLabel}. ${explanation}`;
  return `Ton StreamScore est stable. ${explanation}`;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

const Skeleton = () => (
  <div className="mb-6 animate-pulse rounded-xl border border-border/60 bg-card/40 p-5">
    <div className="mb-4 h-4 w-48 rounded bg-muted/60" />
    <div className="mb-4 h-3 w-3/4 rounded bg-muted/40" />
    <div className="space-y-3">
      {DIM_KEYS.map((k) => (
        <div key={k} className="flex items-center gap-3">
          <div className="h-2.5 w-24 rounded bg-muted/40" />
          <div className="h-1.5 flex-1 rounded-full bg-muted/30" />
          <div className="h-2.5 w-6 rounded bg-muted/40" />
          <div className="h-2.5 w-10 rounded bg-muted/30" />
        </div>
      ))}
    </div>
  </div>
);

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  userId: string;
}

const StreamScoreEvolutionCard = ({ userId }: Props) => {
  const [data, setData] = useState<WeekOverWeekDelta | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setFetchError(false);
    getWeekOverWeekDelta(userId)
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setFetchError(true); setLoading(false); });
  }, [userId]);

  if (loading) return <Skeleton />;
  if (fetchError) return null; // graceful — don't crash dashboard on network error

  const latest = data?.latest ?? null;

  // ── A: no snapshot — render nothing.
  // The score ring above already shows the current score from analysis_reports.
  // Showing "StreamScore pas encore disponible" here while the ring shows a score
  // creates a direct contradiction that destroys user trust.
  // The evolution card only appears when there is actual snapshot data to show.
  if (!latest) return null;

  const hasDelta = data!.previous !== null && data!.overall_delta !== null;
  const isLowConfidence = latest.confidence === "low";
  const overallDelta = data!.overall_delta;

  const DeltaIcon =
    !hasDelta || overallDelta === 0
      ? Minus
      : (overallDelta ?? 0) > 0
        ? TrendingUp
        : TrendingDown;

  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-border/60 bg-card/40">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

      <div className="p-5">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              Évolution du StreamScore
            </h3>
          </div>

          {/* Overall delta badge */}
          {hasDelta && overallDelta !== null && (
            <div
              className={cn(
                "flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold tabular-nums",
                (overallDelta ?? 0) > 0
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : (overallDelta ?? 0) < 0
                    ? "border-destructive/30 bg-destructive/10 text-destructive"
                    : "border-border bg-muted/40 text-muted-foreground",
              )}
            >
              <DeltaIcon className="h-3 w-3" />
              {fmtDelta(overallDelta)}
            </div>
          )}
        </div>

        {/* ── Narrative sentence ─────────────────────────────────────────── */}
        <p
          className={cn(
            "mb-1 text-sm leading-relaxed",
            isLowConfidence ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {!hasDelta
            ? "Premier score enregistré. L'évolution sera visible après la prochaine analyse."
            : isLowConfidence
              ? "Score encore peu fiable : Streamnco manque de signaux récents."
              : buildNarrativeSentence(data!)}
        </p>

        {/* Confidence + signal fine print */}
        <p className="mb-4 text-[11px] text-muted-foreground/60">
          {CONFIDENCE_COPY[latest.confidence]} · {SIGNAL_COPY[latest.signal_quality]}
        </p>

        {/* ── Dimension rows ─────────────────────────────────────────────── */}
        <div className="space-y-2.5">
          {DIM_KEYS.map((key) => {
            const score = latest[key];
            if (score == null) return null;
            const dimDelta = hasDelta ? (data!.dimension_deltas[key] ?? null) : null;
            const tier = getScoreTier(score);
            const theme = getTierTheme(tier);
            const isPriority = latest.priority_dimension === key;
            const deltaStr = fmtDelta(dimDelta);
            const deltaPositive = (dimDelta ?? 0) > 0;
            const deltaNegative = (dimDelta ?? 0) < 0;

            return (
              <div key={key} className="flex items-center gap-3">
                {/* Label */}
                <div className="flex w-28 shrink-0 items-center gap-1">
                  {isPriority && (
                    <Zap className="h-2.5 w-2.5 shrink-0 text-primary" />
                  )}
                  <span
                    className={cn(
                      "truncate text-[11px] font-medium",
                      isPriority ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {DIM_LABEL[key]}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="flex-1">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
                    <div
                      className={cn("h-full rounded-full", theme.progressClass)}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>

                {/* Score value */}
                <span
                  className={cn(
                    "w-6 text-right text-[11px] font-bold tabular-nums",
                    theme.textClass,
                  )}
                >
                  {score}
                </span>

                {/* Delta */}
                <span
                  className={cn(
                    "w-14 text-right text-[10px] tabular-nums",
                    !deltaStr
                      ? "invisible"
                      : deltaPositive
                        ? "text-primary"
                        : deltaNegative
                          ? "text-destructive"
                          : "text-muted-foreground/50",
                  )}
                >
                  {deltaStr ?? ""}
                </span>
              </div>
            );
          })}
        </div>

        {/* ── Priority / drag / support chips ────────────────────────────── */}
        {(latest.priority_dimension || latest.top_drag || latest.top_support) && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-border/30 pt-4">
            {latest.priority_dimension && (
              <div className="rounded-lg border border-primary/20 bg-primary/[0.04] px-2.5 py-1.5">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-primary/50">
                  Priorité
                </p>
                <p className="text-[11px] font-semibold text-foreground">
                  {DIM_LABEL[latest.priority_dimension as DimKey] ??
                    latest.priority_dimension}
                </p>
              </div>
            )}
            {latest.top_drag && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/[0.04] px-2.5 py-1.5">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-destructive/50">
                  Frein
                </p>
                <p className="text-[11px] font-semibold text-foreground">
                  {DIM_LABEL[latest.top_drag as DimKey] ?? latest.top_drag}
                </p>
              </div>
            )}
            {latest.top_support && (
              <div className="rounded-lg border border-success/20 bg-success/[0.04] px-2.5 py-1.5">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-success/50">
                  Force
                </p>
                <p className="text-[11px] font-semibold text-foreground">
                  {DIM_LABEL[latest.top_support as DimKey] ?? latest.top_support}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StreamScoreEvolutionCard;
