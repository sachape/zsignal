import type { StreakData } from "@/services/streakEngine";
import { Flame, AlertTriangle } from "lucide-react";

interface Props {
  streak: StreakData;
  variant?: "compact" | "card";
}

const StreakBadge = ({ streak, variant = "compact" }: Props) => {
  const { currentStreak, longestStreak, atRisk, streakBroken, thisWeekCount } = streak;

  // Nothing meaningful to show
  if (currentStreak === 0 && !streakBroken && longestStreak === 0) return null;

  if (variant === "compact") {
    if (atRisk) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-[10px] font-semibold text-warning">
          <AlertTriangle className="h-2.5 w-2.5" />
          Série en danger
        </span>
      );
    }

    if (streakBroken) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
          <Flame className="h-2.5 w-2.5" />
          Reprends ta série
        </span>
      );
    }

    if (currentStreak >= 1) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
          <Flame className="h-2.5 w-2.5" />
          {currentStreak} sem.
        </span>
      );
    }

    return null;
  }

  // Card variant — placed in score column
  if (atRisk) {
    return (
      <div className="mt-4 w-full rounded-lg border border-warning/30 bg-warning/[0.07] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-warning">Série en danger</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {currentStreak} sem. — stream avant dimanche pour continuer.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (streakBroken) {
    return (
      <div className="mt-4 w-full rounded-lg border border-border/40 bg-muted/30 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Flame className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-muted-foreground">Série interrompue</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Meilleure : {longestStreak} sem. — reprends maintenant.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (currentStreak >= 1) {
    return (
      <div className="mt-4 w-full rounded-lg border border-primary/20 bg-primary/[0.06] px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Flame className="h-3.5 w-3.5 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-primary">
                {currentStreak} semaine{currentStreak > 1 ? "s" : ""} de suite
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {thisWeekCount > 0
                  ? `${thisWeekCount} live${thisWeekCount > 1 ? "s" : ""} cette semaine ✓`
                  : "Encore 0 live cette semaine"}
              </p>
            </div>
          </div>
          {longestStreak > currentStreak && (
            <span className="shrink-0 text-[10px] text-muted-foreground/60">
              Record&nbsp;{longestStreak}
            </span>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default StreakBadge;
