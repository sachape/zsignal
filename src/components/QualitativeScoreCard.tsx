import { Compass } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Qualitative replacement for ScoreCard when a channel has no exploitable
 * signal. We refuse to show "0/100" or "50/100" as if they were honest
 * grades — instead we explain why no score is shown yet.
 */
const QualitativeScoreCard = () => {
  return (
    <Card>
      <CardContent className="flex h-full flex-col items-center justify-center p-5 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Compass className="h-5 w-5 text-primary" />
        </div>
        <p className="mt-3 text-sm font-semibold text-foreground">
          Signal insuffisant pour un score fiable
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          On n'affiche pas de note tant qu'il n'y a pas assez de streams à lire.
        </p>
      </CardContent>
    </Card>
  );
};

export default QualitativeScoreCard;
