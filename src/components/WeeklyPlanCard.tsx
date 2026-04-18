import { useEffect, useState } from "react";
import { Check, Sparkles, AlertTriangle, FlaskConical, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  const plan = buildWeeklyPlan(report);
  const [done, setDone] = useState<string[]>([]);

  useEffect(() => {
    setDone(getCompletedActionIds(plan.weekKey));
  }, [plan.weekKey]);

  const toggle = (id: string) => {
    setDone(toggleActionCompletion(plan.weekKey, id));
  };

  const completedCount = plan.actions.filter((a) => done.includes(a.id)).length;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Plan de la semaine
              </h3>
              <p className="text-xs text-muted-foreground">
                {plan.actions.length > 0
                  ? `${completedCount} / ${plan.actions.length} action(s) cochée(s)`
                  : "Aucune action prioritaire détectée"}
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

        {plan.actions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Lance une analyse pour générer un plan personnalisé.
          </p>
        ) : (
          <ul className="space-y-3">
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
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        isDone ? "line-through text-muted-foreground" : "text-foreground",
                      )}
                    >
                      {a.action}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{a.problem}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className={cn("text-[10px]", impactStyle[a.impact])}>
                        Impact {a.impact}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        {effortLabel[a.effort]}
                      </Badge>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {!compact && plan.experiment && (
          <div className="mt-4 rounded-md border border-accent/30 bg-accent/5 p-3">
            <div className="mb-1 flex items-center gap-2">
              <FlaskConical className="h-3.5 w-3.5 text-accent" />
              <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                Test de la semaine
              </p>
            </div>
            <p className="text-sm font-semibold text-foreground">{plan.experiment.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{plan.experiment.hypothesis}</p>
            <p className="mt-1.5 text-xs text-foreground">{plan.experiment.how}</p>
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
