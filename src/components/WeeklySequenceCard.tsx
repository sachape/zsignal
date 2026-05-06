import { ListChecks, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { WeeklySequenceAction } from "@/services/foundationMode";

interface Props {
  actions: WeeklySequenceAction[];
  /** When true, shows a link to the full /plan page (used on dashboard). */
  showPlanLink?: boolean;
}

const WeeklySequenceCard = ({ actions, showPlanLink }: Props) => {
  return (
    <Card className="mb-6">
      <CardContent className="p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground">
                Ce que tu fais cette semaine
              </h3>
              <p className="text-xs text-muted-foreground">
                Une séquence courte et ordonnée. L'ordre compte.
              </p>
            </div>
          </div>
          {showPlanLink && (
            <Button asChild variant="ghost" size="sm" className="shrink-0">
              <Link to="/plan">
                Plan détaillé <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </div>
        <ol className="space-y-3">
          {actions.map((a) => (
            <li
              key={a.order}
              className="rounded-md border border-border/60 bg-muted/20 p-3"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {a.order}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{a.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/80">Pourquoi : </span>
                    {a.why}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/80">Impact attendu : </span>
                    {a.expectedImpact}
                  </p>
                  <div className="mt-2">
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      Effort {a.effort}
                    </Badge>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
};

export default WeeklySequenceCard;
