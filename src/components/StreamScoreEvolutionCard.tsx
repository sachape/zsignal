import { useEffect, useState } from "react";
import { Minus, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { cn } from "@/lib/utils";
import {
  getRecentReports,
  getRecentReportsForPlatformUser,
  type SavedReport,
} from "@/services/reportRepository";
import type { StreamScore } from "@/types/analysis";
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
  monetization: "Affiliation",
};

const DIM_LABEL_FR: Record<DimKey, string> = {
  regularity: "la régularité",
  structure: "la structure des sessions",
  content: "le contenu réutilisable",
  positioning: "le positionnement",
  momentum: "le momentum",
  monetization: "le potentiel d'affiliation",
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

function buildExplanation(latest: StreamScore, previous: StreamScore | null): string {
  if (!previous) return "Premier score enregistré. L'évolution sera visible après la prochaine analyse.";
  const overall_delta = latest.overall - previous.overall;

  let topDim: DimKey | null = null;
  let topAbs = -1;
  for (const k of DIM_KEYS) {
    const a = latest[k];
    const b = previous[k];
    const d = Math.abs(a - b);
    if (d > topAbs) { topAbs = d; topDim = k; }
  }

  if (overall_delta === 0 && topAbs <= 0) return "Ton score est stable depuis la dernière analyse.";
  if (topDim && topAbs > 0) {
    const dimDelta = latest[topDim] - previous[topDim];
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
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setFetchError(false);
    const fetch = platformUserId
      ? getRecentReportsForPlatformUser(userId, platformUserId, 30)
      : getRecentReports(userId, 30);
    fetch
      .then((rows) => { setReports(rows); setLoading(false); })
      .catch(() => { setFetchError(true); setLoading(false); });
  }, [userId, platformUserId]);

  if (loading) return <Skeleton />;
  if (fetchError) return null;

  // reports is newest-first; we need ≥ 1 to render
  const latestReport = reports[0] ?? null;
  if (!latestReport) return null;

  const latest: StreamScore = latestReport.report.score;
  const previousReport = reports[1] ?? null;
  const previous: StreamScore | null = previousReport?.report.score ?? null;

  const hasDelta = previous !== null;
  const overallDelta = hasDelta ? latest.overall - previous!.overall : null;

  const dimension_deltas: Record<DimKey, number | null> = {
    regularity: null, structure: null, content: null,
    positioning: null, momentum: null, monetization: null,
  };
  if (hasDelta) {
    for (const k of DIM_KEYS) {
      dimension_deltas[k] = latest[k] - previous![k];
    }
  }

  // Chart points in chronological order
  const chartPoints = [...reports]
    .reverse()
    .map((r) => ({ label: fmtDate(r.created_at), overall: r.report.score.overall }));
  const showChart = chartPoints.length >= 2;

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
            <Zap className="h-4 w-4 text-primary-strong" />
            <h3 className="text-sm font-semibold text-foreground">
              Évolution du StreamScore
            </h3>
          </div>

          {hasDelta && overallDelta !== null && (
            <div
              className={cn(
                "flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold tabular-nums",
                (overallDelta ?? 0) > 0
                  ? "border-primary/30 bg-primary/10 text-primary-strong"
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
        <p className="mb-4 text-sm leading-relaxed text-foreground">
          {buildExplanation(latest, previous)}
        </p>

        {/* ── Dimension rows ─────────────────────────────────────────────── */}
        <div className="space-y-2.5">
          {DIM_KEYS.map((key) => {
            const score = latest[key];
            const dimDelta = hasDelta ? (dimension_deltas[key] ?? null) : null;
            const tier = getScoreTier(score);
            const theme = getTierTheme(tier);
            const deltaStr = fmtDelta(dimDelta);
            const deltaPositive = (dimDelta ?? 0) > 0;
            const deltaNegative = (dimDelta ?? 0) < 0;

            return (
              <div key={key} className="flex items-center gap-3">
                <span className="w-28 shrink-0 truncate text-[11px] font-medium text-muted-foreground">
                  {DIM_LABEL[key]}
                </span>

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
                        ? "text-primary-strong"
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
      </div>
    </div>
  );
};

export default StreamScoreEvolutionCard;
