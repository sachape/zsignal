import { Link } from "react-router-dom";
import { Lightbulb, FlaskConical, Eye, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CopyableOpportunity } from "@/services/opportunityEngine";

interface Props {
  opportunity: CopyableOpportunity;
  index?: number;
  locked?: boolean;
}

const OpportunityCard = ({ opportunity, index, locked = false }: Props) => {
  const isFoundation = opportunity.sourceLabel === "Mécanique fondation";

  return (
    <div className="relative h-full">
      <Card
        className={cn(
          "h-full overflow-hidden border-border/60 bg-card/60 transition-all",
          !locked && "hover:border-primary/20 hover:bg-card/80",
          locked && "select-none",
        )}
      >
        {/* Top accent line */}
        <div
          className={cn(
            "h-0.5 w-full",
            isFoundation
              ? "bg-gradient-to-r from-primary/80 via-primary/40 to-transparent"
              : "bg-gradient-to-r from-accent/80 via-accent/40 to-transparent",
          )}
        />

        <CardContent
          className={cn(
            "flex h-full flex-col gap-4 p-5",
            locked && "pointer-events-none blur-[3px]",
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <Badge
              variant="outline"
              className={cn(
                "gap-1 text-[10px] font-semibold",
                isFoundation
                  ? "border-primary/30 bg-primary/5 text-primary-strong"
                  : "border-accent/30 bg-accent/5 text-accent",
              )}
            >
              <Lightbulb className="h-3 w-3" />
              {opportunity.sourceLabel}
            </Badge>
            {typeof index === "number" && (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                {index + 1}
              </span>
            )}
          </div>

          {/* Title */}
          <p className="text-sm font-bold leading-snug text-foreground">
            {opportunity.what}
          </p>

          {/* Why */}
          <div className="rounded-lg bg-muted/40 p-3">
            <div className="mb-1.5 flex items-center gap-1.5">
              <Eye className="h-3 w-3 text-muted-foreground" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                Pourquoi ça compte
              </span>
            </div>
            <p className="text-xs leading-relaxed text-foreground/80">
              {opportunity.why}
            </p>
          </div>

          {/* This week */}
          <div
            className={cn(
              "rounded-lg border p-3",
              isFoundation
                ? "border-primary/20 bg-primary/[0.04]"
                : "border-accent/20 bg-accent/[0.04]",
            )}
          >
            <div className="mb-1.5 flex items-center gap-1.5">
              <FlaskConical
                className={cn(
                  "h-3 w-3",
                  isFoundation ? "text-primary-strong" : "text-accent",
                )}
              />
              <span
                className={cn(
                  "text-[9px] font-bold uppercase tracking-widest",
                  isFoundation ? "text-primary-strong" : "text-accent",
                )}
              >
                Cette semaine
              </span>
            </div>
            <p className="text-xs leading-relaxed text-foreground">
              {opportunity.testThisWeek}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Premium gate overlay */}
      {locked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-[calc(var(--radius)+1px)] bg-background/70 backdrop-blur-[2px]">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-card/80">
            <Lock className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold text-foreground">
              Opportunité Premium
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Réservée aux membres Pro
            </p>
          </div>
          <Button asChild size="sm" className="h-8 text-xs">
            <Link to="/billing">Passer au Pro</Link>
          </Button>
        </div>
      )}
    </div>
  );
};

export default OpportunityCard;
