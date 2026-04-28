import { useEffect, useState } from "react";
import { Target, CheckCircle2, Radio } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import {
  getDebriefsBySessionIds,
  listLiveSessions,
  type LiveSession,
} from "@/services/liveSessions";
import {
  buildWeeklyMilestone,
  type MilestoneStatus,
  type WeeklyMilestone,
} from "@/services/weeklyMilestone";

interface Props {
  current: LiveSession | null;
}

const STATUS_BADGE: Record<
  MilestoneStatus,
  { label: string; variant: "muted" | "secondary" | "default" } | null
> = {
  in_progress: { label: "Objectif non encore validé", variant: "muted" },
  on_track: { label: "En bonne voie", variant: "secondary" },
  reached: { label: "Cap atteint", variant: "default" },
  in_live: null,
  no_recent_live: null,
};

const WeeklyMilestoneCard = ({ current }: Props) => {
  const { user } = useAuth();
  const [milestone, setMilestone] = useState<WeeklyMilestone | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user) return;
    (async () => {
      const sessions = await listLiveSessions(user.id, 14);
      const ended = sessions.filter((s) => s.status === "ended");
      const debriefs = await getDebriefsBySessionIds(ended.map((s) => s.id));
      if (cancelled) return;
      setMilestone(
        buildWeeklyMilestone({
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

  if (!milestone) return null;

  const reached = milestone.status === "reached";
  const inLive = milestone.status === "in_live";
  const Icon = inLive ? Radio : reached ? CheckCircle2 : Target;
  const badge = STATUS_BADGE[milestone.status];

  return (
    <Card
      className={
        reached
          ? "border-primary/30 bg-primary/[0.04]"
          : "border-border/60"
      }
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${
              reached ? "bg-primary/15" : "bg-primary/10"
            }`}
          >
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Cap des 7 prochains jours
              </p>
              {badge && (
                <Badge variant={badge.variant} className="h-5 px-1.5 text-[10px]">
                  {badge.label}
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {milestone.title}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {milestone.rationale}
            </p>
            {!inLive && (
              <p className="mt-2 text-[11px] font-medium text-muted-foreground/80">
                {milestone.progressLabel}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeeklyMilestoneCard;
