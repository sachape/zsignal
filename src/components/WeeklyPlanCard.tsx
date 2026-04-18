import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Sparkles,
  AlertTriangle,
  FlaskConical,
  ArrowRight,
  Target,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  buildWeeklyPlan,
  getCompletedActionIds,
  toggleActionCompletion,
  type Impact,
  type Effort,
} from "@/services/weeklyPlanBuilder";
import type { AnalysisReport } from "@/types/analysis";

interface Props {
  report: AnalysisReport;
  /** Compact mode for dashboard preview (no experiment/avoid sections). */
  compact?: boolean;
}

const impactStyle: Record<Impact, string> = {
  fort: "text-primary",
  moyen: "text-foreground",
  léger: "text-muted-foreground",
};
const effortLabel: Record<Effort, string> = {
  faible: "effort faible",
  moyen: "effort moyen",
  élevé: "effort élevé",
};

const WeeklyPlanCard = ({ report, compact }: Props) => {
  const plan = useMemo(() => buildWeeklyPlan(report), [report]);
  const [done, setDone] = useState<string[]>([]);

  useEffect(() => {
    setDone(getCompletedActionIds(plan.weekKey));
  }, [plan.weekKey]);

  const toggle = (id: string) => {
    setDone(toggleActionCompletion(plan.weekKey, id));
  };

  const total = plan.actions.length;
  const completedCount = plan.actions.filter((a) => done.includes(a.id)).length;
  const remaining = total - completedCount;
  const progressPct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  return (
    <Card>
      <CardContent className="p-5">
        {/* Weekly focus header — ties the plan to the main blocker */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Plan de la semaine
                </h3>
                <Badge variant="outline" className="gap-1 text-[10px] text-primary">
                  <Target className="h-3 w-3" />
                  Focus : {plan.focus.label}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {plan.focus.rationale}
              </p>
            </div>
          </div>
          {compact && (
            <Button asChild variant="ghost" size="sm">
              <Link to="/plan">
                Détail <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </div>

        {/* Weekly progression strip */}
        {total > 0 && (
          <div className="mb-4">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">
                Progression de la semaine
              </span>
              <span className="text-muted-foreground">
                {completedCount}/{total} faites · {remaining} restante
                {remaining > 1 ? "s" : ""}
              </span>
            </div>
            <Progress value={progressPct} className="h-1.5" />
          </div>
        )}

        {plan.actions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Lance une analyse pour générer un plan personnalisé.
          </p>
        ) : (
          <ol className="space-y-3">
            {plan.actions.map((a) => {
              const isDone = done.includes(a.id);
              return (
                <li
                  key={a.id}
                  className={cn(
                    "flex items-start gap-3 rounded-md border border-border/60 bg-muted/20 p-3 transition-opacity",
                    isDone && "opacity-60",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggle(a.id)}
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
                      isDone
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:border-primary",
                    )}
                    aria-label={isDone ? "Marquer comme non faite" : "Marquer comme faite"}
                  >
                    {isDone && <Check className="h-3 w-3" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className="text-[10px] font-semibold text-primary"
                      >
                        Étape {a.step}
                      </Badge>
                      <p
                        className={cn(
                          "text-sm font-semibold",
                          isDone
                            ? "line-through text-muted-foreground"
                            : "text-foreground",
                        )}
                      >
                        {a.action}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{a.problem}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className={cn("text-[10px]", impactStyle[a.impact])}
                      >
                        Impact {a.impact}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-[10px] text-muted-foreground"
                      >
                        {effortLabel[a.effort]}
                      </Badge>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {!compact && plan.experiment && (
          <div className="mt-4 rounded-md border border-accent/30 bg-accent/5 p-3">
            <div className="mb-1 flex items-center gap-2">
              <FlaskConical className="h-3.5 w-3.5 text-accent" />
              <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                Test de la semaine · {plan.experiment.duration}
              </p>
            </div>
            <p className="text-sm font-semibold text-foreground">
              {plan.experiment.title}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="font-medium text-foreground/80">Hypothèse : </span>
              {plan.experiment.hypothesis}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="font-medium text-foreground/80">Mise en place : </span>
              {plan.experiment.how}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="font-medium text-foreground/80">Signal à observer : </span>
              {plan.experiment.signalToObserve}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="font-medium text-foreground/80">Pourquoi maintenant : </span>
              {plan.experiment.whyNow}
            </p>
          </div>
        )}

        {!compact && plan.avoid && (
          <div className="mt-3 rounded-md border border-warning/30 bg-warning/5 p-3">
            <div className="mb-1 flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-warning" />
              <p className="text-xs font-semibold uppercase tracking-wider text-warning">
                À éviter cette semaine
              </p>
            </div>
            <p className="text-sm font-semibold text-foreground">{plan.avoid.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{plan.avoid.reason}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WeeklyPlanCard;
