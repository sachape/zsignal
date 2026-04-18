import { ListChecks } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { WeeklySequenceAction } from "@/services/foundationMode";

interface Props {
  actions: WeeklySequenceAction[];
}

const WeeklySequenceCard = ({ actions }: Props) => {
  return (
    <Card className="mb-6">
      <CardContent className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-primary" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Ce que tu fais cette semaine
            </h3>
            <p className="text-xs text-muted-foreground">
              Une séquence courte et ordonnée. L'ordre compte.
            </p>
          </div>
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
