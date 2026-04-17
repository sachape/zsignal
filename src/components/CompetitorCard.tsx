import { Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CompetitorCardProps {
  name: string;
  followers: string;
  similarity: number;
  locked?: boolean;
  reasons?: string[];
}

const CompetitorCard = ({
  name,
  followers,
  similarity,
  locked,
  reasons,
}: CompetitorCardProps) => {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent/10">
          <Users className="h-5 w-5 text-accent" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {locked ? "••••••••" : name}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {locked ? "•••" : followers} abonnés
          </p>
          {!locked && reasons && reasons.length > 0 && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground/70">
              {reasons.join(" · ")}
            </p>
          )}
        </div>
        <Badge variant="accent" className="shrink-0">
          {locked ? "?" : `${similarity}%`} similaire
        </Badge>
      </CardContent>
    </Card>
  );
};

export default CompetitorCard;
