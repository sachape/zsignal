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
  getOrCreateCurrentWeekMilestone,
  type MilestoneStatus,
  type MilestoneView,
} from "@/services/weeklyMilestone";

interface Props {
  current: LiveSession | null;
}

const STATUS_BADGE: Record<
  MilestoneStatus,
  { label: string; variant: "muted" | "secondary" | "default" } | null
> = {
  not_started: null,
  in_progress: { label: "En cours", variant: "secondary" },
  reached: { label: "Atteint", variant: "default" },
  paused: null,
};

const WeeklyMilestoneCard = ({ current }: Props) => {
  const { user } = useAuth();
  const [view, setView] = useState<MilestoneView | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!user) return;
    (async () => {
      const sessions = await listLiveSessions(user.id, 14);
      const ended = sessions.filter((s) => s.status === "ended");
      const debriefs = await getDebriefsBySessionIds(ended.map((s) => s.id));
      const v = await getOrCreateCurrentWeekMilestone(
        user.id,
        current,
        ended,
        debriefs,
      );
      if (cancelled) return;
      setView(v);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, current]);

  if (!loaded || !view) return null;
  // Live in progress is owned by LiveStatusCard at the top of the stack —
  // staying silent here removes the duplicated "Ton live est en cours."
  if (view.effectiveStatus === "paused") return null;

  const { row, effectiveStatus, doneCount } = view;
  const reached = effectiveStatus === "reached";
  const Icon = reached ? CheckCircle2 : Target;
  const badge = STATUS_BADGE[effectiveStatus];

  return (
    <Card
      className={
        reached ? "border-primary/30 bg-primary/[0.04]" : "border-border/60"
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
                Cap de la semaine
              </p>
              {badge && (
                <Badge variant={badge.variant} className="h-5 px-1.5 text-[10px]">
                  {badge.label}
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {reached ? "Cap atteint." : row.title}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {reached
                ? "Le prochain cap sera prêt la semaine prochaine."
                : row.rationale}
            </p>
            {row.target_count > 1 && !reached && (
              <p className="mt-2 text-[11px] font-medium text-muted-foreground/80">
                {doneCount}/{row.target_count} lives cette semaine
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeeklyMilestoneCard;
