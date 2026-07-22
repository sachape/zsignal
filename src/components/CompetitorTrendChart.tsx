import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingUp, TrendingDown, Minus, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/format";
import type { CompetitorSnapshot } from "@/services/competitorSnapshots";
import { hasEnoughData, viewersTrend, MIN_FOR_CHART } from "@/services/competitorSnapshots";
import { cn } from "@/lib/utils";

interface Props {
  snapshots: CompetitorSnapshot[];
  login: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

const TooltipContent = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { date: string; avg_viewers: number | null; stream_score: number | null } }>;
}) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-md border border-border/60 bg-popover/95 px-2.5 py-1.5 text-xs shadow-md backdrop-blur">
      <p className="font-semibold text-foreground tabular-nums">
        {p.avg_viewers !== null ? `${formatNumber(p.avg_viewers)} viewers moy.` : "—"}
      </p>
      {p.stream_score !== null && (
        <p className="text-muted-foreground">Score {p.stream_score}/100</p>
      )}
      <p className="mt-0.5 text-muted-foreground">{formatDate(p.date)}</p>
    </div>
  );
};

const CompetitorTrendChart = ({ snapshots, login }: Props) => {
  const points = snapshots.filter((s) => s.avg_viewers !== null);
  const { delta, pct, direction } = viewersTrend(snapshots);
  const enough = hasEnoughData(snapshots);

  // Not enough data
  if (!enough) {
    const count = points.length;
    return (
      <div className="rounded-xl border border-border/50 bg-muted/20 px-5 py-6 text-center">
        <Clock className="mx-auto mb-2 h-5 w-5 text-muted-foreground/50" />
        <p className="text-sm font-medium text-foreground">
          {count === 0
            ? "Aucun snapshot enregistré"
            : count === 1
              ? "1 snapshot · reviens demain"
              : `${count} snapshots · encore ${MIN_FOR_CHART - count} pour voir la courbe`}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Chaque visite sur ce profil enregistre un snapshot (1 par jour max).
        </p>
      </div>
    );
  }

  const TrendIcon = direction === "up" ? TrendingUp : direction === "down" ? TrendingDown : Minus;
  const trendColor =
    direction === "up"
      ? "text-success"
      : direction === "down"
        ? "text-destructive"
        : "text-muted-foreground";

  return (
    <div className="space-y-3">
      {/* Summary row */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <TrendIcon className={cn("h-4 w-4", trendColor)} />
          {delta !== null ? (
            <span className={cn("text-sm font-semibold tabular-nums", trendColor)}>
              {delta > 0 ? "+" : ""}{formatNumber(delta)} viewers
            </span>
          ) : null}
          {pct !== null && (
            <Badge
              variant="outline"
              className={cn(
                "text-[12px]",
                direction === "up" && "border-success/30 bg-success/5 text-success",
                direction === "down" && "border-destructive/30 bg-destructive/5 text-destructive",
                direction === "flat" && "border-border text-muted-foreground",
              )}
            >
              {pct > 0 ? "+" : ""}{pct}%
            </Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          vs snapshot précédent · {snapshots.length} points sur {snapshots.length} jour{snapshots.length > 1 ? "s" : ""}
        </span>
      </div>

      {/* Chart */}
      <div className="h-[140px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${login}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatNumber(v)}
              width={36}
            />
            <Tooltip content={<TooltipContent />} cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }} />
            <Area
              type="monotone"
              dataKey="avg_viewers"
              stroke="hsl(var(--primary))"
              strokeWidth={1.5}
              fill={`url(#grad-${login})`}
              dot={points.length <= 10 ? { r: 2, fill: "hsl(var(--primary))", strokeWidth: 0 } : false}
              activeDot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CompetitorTrendChart;


/** Inline sparkline for use in lists (WatchlistPage) */
export const SparkLine = ({ snapshots }: { snapshots: CompetitorSnapshot[] }) => {
  const points = snapshots.filter((s) => s.avg_viewers !== null);
  if (points.length < 2) return null;

  const values = points.map((p) => p.avg_viewers!);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const W = 64;
  const H = 24;
  const pad = 2;

  const coords = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (W - pad * 2);
    const y = H - pad - ((v - min) / range) * (H - pad * 2);
    return `${x},${y}`;
  });

  const { direction } = viewersTrend(snapshots);
  const color =
    direction === "up"
      ? "hsl(var(--success))"
      : direction === "down"
        ? "hsl(var(--destructive))"
        : "hsl(var(--muted-foreground))";

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0 overflow-visible">
      <polyline
        points={coords.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.8}
      />
      {/* Last point dot */}
      <circle
        cx={coords[coords.length - 1].split(",")[0]}
        cy={coords[coords.length - 1].split(",")[1]}
        r={2.5}
        fill={color}
      />
    </svg>
  );
};
