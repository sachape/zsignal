import { Card, CardContent } from "@/components/ui/card";
import { TrendingDown, TrendingUp, Target } from "lucide-react";
import type { StreamScore } from "@/types/analysis";
import { buildScoreNarrative, getScoreTier, getTierTheme } from "@/services/streamScoreTier";

interface Props {
  score: StreamScore;
  /** Compact = single column, used in Cockpit. Default = full version. */
  compact?: boolean;
}

/**
 * "Pourquoi ce score" — product-grade reading of the StreamScore.
 *
 * Three-level narrative:
 *  A. Tier headline (one sentence based on score range)
 *  B. What drags / supports the score (max 2 each)
 *  C. Single priority action
 *
 * Optional mini-decomposition shows the 3 most weighted dimensions
 * with their own tier color, for a quick visual read.
 */
const ScoreInsightCard = ({ score, compact = false }: Props) => {
  const narrative = buildScoreNarrative(score);
  const tier = getScoreTier(score.overall);
  const theme = getTierTheme(tier);

  return (
    <Card className={theme.surfaceClass}>
      <CardContent className="space-y-4 p-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Pourquoi ce score
          </p>
          <p className="mt-1.5 text-sm font-semibold leading-snug text-foreground">
            {narrative.headline}
          </p>
        </div>

        {(narrative.drags.length > 0 || narrative.supports.length > 0) && (
          <div className={compact ? "space-y-2.5" : "grid gap-3 sm:grid-cols-2"}>
            {narrative.drags.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  <TrendingDown className="h-3 w-3" />
                  Ce qui tire vers le bas
                </div>
                <ul className="mt-1.5 space-y-1">
                  {narrative.drags.map((d) => (
                    <li key={d} className="text-xs text-foreground">
                      • {d}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {narrative.supports.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  <TrendingUp className="h-3 w-3" />
                  Ce qui soutient
                </div>
                <ul className="mt-1.5 space-y-1">
                  {narrative.supports.map((s) => (
                    <li key={s} className="text-xs text-foreground">
                      • {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Mini decomposition — 3 most weighted dimensions, color = tier */}
        {!compact && narrative.miniBreakdown.length > 0 && (
          <div className="space-y-1.5 border-t border-border/40 pt-3">
            {narrative.miniBreakdown.map((d) => {
              const dTheme = getTierTheme(d.tier);
              return (
                <div key={d.label} className="flex items-center gap-2 sm:gap-3">
                  <span className="w-20 shrink-0 text-xs text-muted-foreground sm:w-28">{d.label}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full ${dTheme.progressClass} transition-all`}
                      style={{ width: `${d.score}%` }}
                    />
                  </div>
                  <span className={`w-10 text-right text-xs font-medium ${dTheme.textClass}`}>
                    {d.score}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-start gap-2 rounded-md border border-border/50 bg-background/40 p-3">
          <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground" />
          <p className="text-xs font-medium text-foreground">{narrative.priority}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ScoreInsightCard;
