import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Target, CheckCircle2, ArrowRight, Circle, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  ensureWeeklyActionItems,
  setActionStatus,
  type WeeklyActionItem,
} from "@/services/weeklyActionItems";

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
  const [diagnosis, setDiagnosis] = useState<string | null>(null);
  const [items, setItems] = useState<WeeklyActionItem[]>([]);
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
      if (cancelled || !v) {
        if (!cancelled) setLoaded(true);
        return;
      }
      const ensured = await ensureWeeklyActionItems(
        user.id,
        v,
        current,
        ended,
        debriefs,
      );
      if (cancelled) return;
      setView(v);
      setDiagnosis(ensured.milestone.diagnosis);
      setItems(ensured.items);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, current]);

  if (!loaded || !view) return null;
  if (view.effectiveStatus === "paused") return null;

  const handleStatus = async (
    id: string,
    status: "todo" | "done" | "skipped",
  ) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, status } : it)),
    );
    await setActionStatus(id, status);
  };

  const { row, effectiveStatus, doneCount } = view;
  const reached = effectiveStatus === "reached";
  const badge = STATUS_BADGE[effectiveStatus];
  const itemsDone = items.filter((i) => i.status === "done").length;

  return (
    <Card
      className={
        reached ? "border-primary/30 bg-primary/[0.04]" : "border-border/60"
      }
    >
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${
              reached ? "bg-primary/15" : "bg-primary/10"
            }`}
          >
            <Target className="h-4 w-4 text-primary" />
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
            {diagnosis && !reached && (
              <p className="mt-1 text-xs text-muted-foreground">{diagnosis}</p>
            )}
            {row.target_count > 1 && !reached && (
              <p className="mt-2 text-[11px] font-medium text-muted-foreground/80">
                {doneCount}/{row.target_count} lives cette semaine
              </p>
            )}
          </div>
        </div>

        {items.length > 0 && !reached && (
          <ul className="space-y-1.5">
            {items.slice(0, 3).map((item) => {
              const done = item.status === "done";
              const skipped = item.status === "skipped";
              return (
                <li
                  key={item.id}
                  className="flex items-start gap-2 rounded-md border border-border/40 bg-muted/20 p-2"
                >
                  <div className="mt-0.5 shrink-0">
                    {done ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    ) : skipped ? (
                      <XCircle className="h-3.5 w-3.5 text-muted-foreground/60" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-muted-foreground/50" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs leading-snug ${
                        done
                          ? "text-muted-foreground line-through"
                          : skipped
                          ? "text-muted-foreground/70"
                          : "text-foreground"
                      }`}
                    >
                      {item.title}
                      {done &&
                        (item.evidence as { verified_by?: string } | null)
                          ?.verified_by === "auto" && (
                          <Badge
                            variant="outline"
                            className="ml-2 h-4 px-1.5 text-[9px] align-middle"
                          >
                            Vérifié automatiquement
                          </Badge>
                        )}
                    </p>
                  </div>
                  {item.status === "todo" ? (
                    <button
                      onClick={() => handleStatus(item.id, "done")}
                      className="shrink-0 text-[10px] font-medium text-primary hover:underline"
                    >
                      Fait
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStatus(item.id, "todo")}
                      className="shrink-0 text-[10px] font-medium text-muted-foreground hover:underline"
                    >
                      Annuler
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {items.length > 0 && (
          <div className="flex items-center justify-between border-t border-border/40 pt-2">
            <p className="text-[11px] text-muted-foreground">
              {itemsDone}/{items.length} actions
            </p>
            <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
              <Link to="/plan">
                Plan détaillé <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WeeklyMilestoneCard;
