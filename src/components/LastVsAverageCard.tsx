import { useEffect, useState } from "react";
import { Scale, Minus, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import {
  getDebriefsBySessionIds,
  listLiveSessions,
  type LiveSession,
} from "@/services/liveSessions";
import {
  buildLastVsAverage,
  type ComparisonReadout,
  type Direction,
} from "@/services/lastVsAverage";

interface Props {
  current: LiveSession | null;
}

const DIR_ICON: Record<Direction, typeof Minus> = {
  above: ArrowUpRight,
  below: ArrowDownRight,
  near: Minus,
};

const DIR_COLOR: Record<Direction, string> = {
  above: "text-primary",
  below: "text-warning",
  near: "text-muted-foreground",
};

/**
 * Compact "dernier live vs base récente" block. Stays silent when there
 * is no ended session at all — the cockpit already covers that surface
 * via the inactivity / live status cards above.
 */
const LastVsAverageCard = ({ current }: Props) => {
  const { user } = useAuth();
  const [readout, setReadout] = useState<ComparisonReadout | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user) return;
    (async () => {
      const sessions = await listLiveSessions(user.id, 8);
      const ended = sessions.filter((s) => s.status === "ended");
      const debriefs = await getDebriefsBySessionIds(ended.map((s) => s.id));
      if (cancelled) return;
      setReadout(
        buildLastVsAverage({
          current,
          recentSessions: ended,
          recentDebriefs: debriefs,
        }),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [user, current]);

  if (!readout) return null;
  // Stay silent in states that are already covered by other cards in the
  // stack: in_live (LiveStatus owns it), no_data (LiveStatus empty state),
  // low_signal (SmartAlerts owns the "pas assez de recul" message).
  if (readout.state !== "ready") return null;

  return (
    <Card className="border-border/40 bg-card/40">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
            <Scale className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Dernier live vs base récente
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {readout.headline}
            </p>

            {readout.micro.length > 0 && (
              <ul className="mt-2 space-y-1">
                {readout.micro.map((m) => {
                  const Icon = DIR_ICON[m.direction];
                  return (
                    <li
                      key={m.label}
                      className="flex items-start gap-2 text-xs text-muted-foreground"
                    >
                      <Icon
                        className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${DIR_COLOR[m.direction]}`}
                      />
                      <span className="leading-snug">
                        <span className="font-medium text-foreground">
                          {m.label}
                        </span>{" "}
                        — {m.text}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LastVsAverageCard;
