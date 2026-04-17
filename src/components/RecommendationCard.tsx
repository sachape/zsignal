import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface RecommendationCardProps {
  icon: LucideIcon;
  title: string;
  reason: string;
  action: string;
  locked?: boolean;
}

const RecommendationCard = ({
  icon: Icon,
  title,
  reason,
  action,
  locked,
}: RecommendationCardProps) => {
  return (
    <Card className={cn("relative", locked && "opacity-60")}>
      <CardContent className="p-5">
        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        {locked ? (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Connecte Twitch pour débloquer cette recommandation
          </p>
        ) : (
          <>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {reason}
            </p>
            <p className="mt-2 text-xs font-medium text-primary">{action}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default RecommendationCard;
