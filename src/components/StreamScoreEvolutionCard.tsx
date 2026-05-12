import { useEffect, useState } from "react";
import { Minus, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { cn } from "@/lib/utils";
import {
  getSnapshotsSince,
  type StreamScoreSnapshot,
  type ScoreLevel,
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

const DIM_LABEL_FR: Record<DimKey, string> = {
  regularity: "la régularité",
  structure: "la structure des sessions",
  content: "le contenu réutilisable",
  positioning: "le positionnement",
  momentum: "le momentum",
  monetization: "la monétisation",
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

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function fmtDelta(d: number | null): string | null {
  if (d === null) return null;
  const abs = Math.abs(d);
  if (d > 0) return `+${d} pt${abs > 1 ? "s" : ""}`;
  if (d < 0) return `${d} pt${abs > 1 ? "s" : ""}`;
  return "0 pt";
}

function buildExplanation(latest: StreamScoreSnapshot, previous: StreamScoreSnapshot | null): string {
  if (!previous) return "Premier score enregistré. L'évolution sera visible après la prochaine analyse.";
  const overall_delta = latest.overall - previous.overall;

  let topDim: DimKey | null = null;
  let topAbs = -1;
  for (const k of DIM_KEYS) {
    const a = latest[k];
    const b = previous[k];
    if (a == null || b == null) continue;
    const d = Math.abs(a - b);
    if (d > topAbs) { topAbs = d; topDim = k; }
  }

  if (overall_delta === 0 && topAbs <= 0) return "Ton score est stable depuis la dernière analyse.";
  if (topDim && topAbs > 0) {
    const dimDelta = (latest[topDim] ?? 0) - (previous[topDim] ?? 0);
    const dir = dimDelta > 0 ? "progresse" : "baisse";
    const cause = dir === "progresse" ? "grâce à" : "à cause de";
    const abs = Math.abs(overall_delta);
    const sign = overall_delta > 0 ? `+${overall_delta}` : `${overall_delta}`;
    const ptLabel = `pt${abs > 1 ? "s" : ""}`;
    if (overall_delta !== 0)
      return `Ton StreamScore ${overall_delta > 0 ? "progresse" : "baisse"} de ${sign} ${ptLabel} ${cause} ${DIM_LABEL_FR[topDim]}.`;
    return `Ton score est stable. La variation notable est sur ${DIM_LABEL_FR[topDim]}.`;
  }
  if (overall_delta > 0) return "Ton score progresse légèrement depuis la dernière analyse.";
  if (overall_delta < 0) return "Ton score baisse légèrement depuis la dernière analyse.";
  return "Ton score est stable depuis la dernière analyse.";
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

const ChartTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { label: string; overall: number } }>;
}) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-md border border-border/60 bg-popover/95 px-2.5 py-1.5 text-xs shadow-md backdrop-blur">
      <p className="font-bold tabular-nums text-foreground">{p.overall} / 100</p>
      <p className="mt-0.5 text-muted-foreground">{p.label}</p>
    </div>
  );
};

// ── Skeleton ──────────────────────────────────────────────────────────────────

const Skeleton = () => (
  <div className="mb-6 animate-pulse rounded-xl border border-border/60 bg-card/40 p-5">
    <div className="mb-4 h-4 w-48 rounded bg-muted/60" />
    <div className="mb-4 h-24 rounded bg-muted/30" />
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
  platformUserId?: string | null;
}

const StreamScoreEvolutionCard = ({ userId, platformUserId }: Props) => {
  const [snapshots, setSnapshots] = useState<StreamScoreSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setFetchError(false);
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    getSnapshotsSince(userId, since, platformUserId ?? null)
      .then((rows) => { setSnapshots(rows); setLoading(false); })
      .catch(() => { setFetchError(true); setLoading(false); });
  }, [userId, platformUserId]);

  if (loading) return <Skeleton />;
  if (fetchError) return null;

  const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

  // No snapshot yet — card stays hidden (score ring above already shows current score)
  if (!latest) return null;

  const previous = snapshots.length >= 2 ? snapshots[snapshots.length - 2] : null;
  const hasDelta = previous !== null;
  const overallDelta = hasDelta ? latest.overall - previous!.overall : null;

  const dimension_deltas: Record<DimKey, number | null> = {
    regularity: null, structure: null, content: null,
    positioning: null, momentum: null, monetization: null,
  };
  if (hasDelta) {
    for (const k of DIM_KEYS) {
      const a = latest[k];
      const b = previous![k];
      if (a != null && b != null) dimension_deltas[k] = a - b;
    }
  }

  const isLowConfidence = latest.confidence === "low";
  const chartPoints = snapshots.map((s) => ({ label: fmtDate(s.created_at), overall: s.overall }));
  const showChart = snapshots.length >= 2;

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

        {/* ── Time-series chart ───────────────────────────────────────────── */}
        {showChart && (
          <div className="mb-4 h-28">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartPoints} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="ssEvolutionGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground) / 0.6)" }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="overall"
                  stroke="hsl(var(--primary))"
                  strokeWidth={1.5}
                  fill="url(#ssEvolutionGrad)"
                  dot={false}
                  activeDot={{ r: 3, fill: "hsl(var(--primary))", strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── Narrative sentence ─────────────────────────────────────────── */}
        <p
          className={cn(
            "mb-1 text-sm leading-relaxed",
            isLowConfidence ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {buildExplanation(latest, previous)}
        </p>

        <p className="mb-4 text-[11px] text-muted-foreground/60">
          {CONFIDENCE_COPY[latest.confidence]} · {SIGNAL_COPY[latest.signal_quality]}
        </p>

        {/* ── Dimension rows ─────────────────────────────────────────────── */}
        <div className="space-y-2.5">
          {DIM_KEYS.map((key) => {
            const score = latest[key];
            if (score == null) return null;
            const dimDelta = hasDelta ? (dimension_deltas[key] ?? null) : null;
            const tier = getScoreTier(score);
            const theme = getTierTheme(tier);
            const isPriority = latest.priority_dimension === key;
            const deltaStr = fmtDelta(dimDelta);
            const deltaPositive = (dimDelta ?? 0) > 0;
            const deltaNegative = (dimDelta ?? 0) < 0;

            return (
              <div key={key} className="flex items-center gap-3">
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

                <div className="flex-1">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
                    <div
                      className={cn("h-full rounded-full", theme.progressClass)}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>

                <span
                  className={cn(
                    "w-6 text-right text-[11px] font-bold tabular-nums",
                    theme.textClass,
                  )}
                >
                  {score}
                </span>

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
                  {DIM_LABEL[latest.priority_dimension as DimKey] ?? latest.priority_dimension}
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
