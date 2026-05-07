import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { CalendarCheck, TrendingUp, TrendingDown, Zap, ArrowRight, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import type { SavedReport } from "@/services/reportRepository";
import {
  getWatchlist,
} from "@/services/benchmarkWatchlist";
import { computeAlerts } from "@/services/competitorAlerts";

const DISMISS_KEY_PREFIX = "streampulse:weekly-digest:dismissed:";
const DISMISS_DAYS = 7;

function isDismissed(userId: string): boolean {
  try {
    const until = localStorage.getItem(`${DISMISS_KEY_PREFIX}${userId}`);
    if (!until) return false;
    return new Date().toISOString().slice(0, 10) <= until;
  } catch {
    return false;
  }
}

function dismiss(userId: string): void {
  const until = new Date(Date.now() + DISMISS_DAYS * 86_400_000).toISOString().slice(0, 10);
  try { localStorage.setItem(`${DISMISS_KEY_PREFIX}${userId}`, until); } catch {}
}

function getWeekRange(): string {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  return `${fmt(monday)} – ${fmt(sunday)}`;
}

interface Props {
  report: SavedReport;
  userId: string;
  previousScore: number | null;
}

const WeeklyDigestCard = ({ report, userId, previousScore }: Props) => {
  const [dismissed, setDismissed] = useState(() => isDismissed(userId));
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    const entries = getWatchlist(userId);
    const alerts = computeAlerts(userId, entries);
    setAlertCount(alerts.length);
  }, [userId]);

  if (dismissed) return null;

  const r = report.report;
  const score = r.score.overall;
  const scoreDelta = previousScore !== null ? score - previousScore : null;
  const streams30d = Number(r.facts?.find((f) => f.key === "streams_30d")?.value ?? 0);
  const avgViewers = r.affiliate_progress.avg_viewers.current;
  const nextAction = r.next_best_action;

  const items: { icon: React.ElementType; label: string; value: string; color?: string }[] = [
    {
      icon: scoreDelta !== null && scoreDelta >= 0 ? TrendingUp : scoreDelta !== null ? TrendingDown : Zap,
      label: "StreamScore",
      value: `${score}/100${scoreDelta !== null ? ` (${scoreDelta >= 0 ? "+" : ""}${scoreDelta})` : ""}`,
      color: scoreDelta !== null ? (scoreDelta > 0 ? "text-success" : scoreDelta < 0 ? "text-destructive" : "text-muted-foreground") : "text-foreground",
    },
    {
      icon: CalendarCheck,
      label: "Lives (30j)",
      value: `${streams30d} session${streams30d !== 1 ? "s" : ""}`,
    },
    {
      icon: TrendingUp,
      label: "Viewers moy.",
      value: formatNumber(avgViewers),
    },
  ];

  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-border/60 bg-card/40">
      {/* Top gradient accent */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="px-5 py-4">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
              Rapport hebdo
            </span>
            <span className="rounded-full border border-border/40 bg-muted/30 px-2 py-0.5 text-[10px] text-muted-foreground">
              {getWeekRange()}
            </span>
          </div>
          <button
            onClick={() => { dismiss(userId); setDismissed(true); }}
            className="text-muted-foreground/40 transition-colors hover:text-muted-foreground"
            title="Masquer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Stats cards */}
        <div className="mb-4 grid grid-cols-3 gap-2">
          {items.map(({ icon: Icon, label, value, color }) => (
            <div
              key={label}
              className="flex flex-col gap-1 rounded-xl border border-white/[0.07] bg-muted/20 px-3 py-2.5"
            >
              <div className="flex items-center gap-1.5">
                <Icon className="h-3 w-3 shrink-0 text-muted-foreground/50" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                  {label}
                </span>
              </div>
              <span className={cn("text-sm font-bold tabular-nums text-foreground", color)}>
                {value}
              </span>
            </div>
          ))}
        </div>
        {alertCount > 0 && (
          <Link
            to="/watchlist"
            className="mb-3 flex items-center gap-2 text-xs text-primary hover:underline"
          >
            <Zap className="h-3.5 w-3.5" />
            {alertCount} alerte{alertCount > 1 ? "s" : ""} concurrents
            <ChevronRight className="h-3 w-3 opacity-60" />
          </Link>
        )}

        {/* Next action */}
        {nextAction && (
          <div className="flex items-start justify-between gap-4 rounded-lg border border-primary/15 bg-primary/[0.04] px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/70">
                Action prioritaire cette semaine
              </p>
              <p className="mt-0.5 text-xs font-medium text-foreground leading-snug">
                {nextAction.title}
              </p>
            </div>
            <Button asChild size="sm" variant="ghost" className="h-7 shrink-0 px-2 text-xs text-primary hover:bg-primary/10">
              <Link to="/plan">
                Plan <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeeklyDigestCard;
