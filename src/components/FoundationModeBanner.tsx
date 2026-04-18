import { Compass } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  reasons: string[];
}

/**
 * Compact banner that reframes the product as a structuring coach when
 * foundation mode is active. Sits at the top of the dashboard.
 */
const FoundationModeBanner = ({ reasons }: Props) => {
  return (
    <Card className="mb-4 border-primary/30 bg-primary/5">
      <CardContent className="flex flex-wrap items-start gap-3 p-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
          <Compass className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Mode structuration
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            Tu n'es pas encore en phase d'optimisation.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            L'objectif des prochaines semaines : créer un signal de croissance lisible. On
            avance étape par étape, pas métrique par métrique.
          </p>
          {reasons.length > 0 && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Signaux détectés : {reasons.slice(0, 3).join(" · ")}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FoundationModeBanner;
