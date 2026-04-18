import { Lightbulb, FlaskConical, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CopyableOpportunity } from "@/services/opportunityEngine";

interface Props {
  opportunity: CopyableOpportunity;
}

const OpportunityCard = ({ opportunity }: Props) => {
  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline" className="gap-1 text-[10px] text-primary">
            <Lightbulb className="h-3 w-3" />
            Opportunité à copier
          </Badge>
          <span className="text-[10px] text-muted-foreground">
            {opportunity.sourceLabel}
          </span>
        </div>
        <p className="text-sm font-semibold text-foreground">{opportunity.what}</p>
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <p className="flex items-start gap-1.5">
            <Eye className="mt-0.5 h-3 w-3 shrink-0 text-foreground/70" />
            <span>
              <span className="font-medium text-foreground/80">Pourquoi : </span>
              {opportunity.why}
            </span>
          </p>
          <p className="flex items-start gap-1.5">
            <FlaskConical className="mt-0.5 h-3 w-3 shrink-0 text-accent" />
            <span>
              <span className="font-medium text-foreground/80">À tester cette semaine : </span>
              {opportunity.testThisWeek}
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default OpportunityCard;
