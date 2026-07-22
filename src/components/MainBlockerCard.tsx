import { AlertOctagon, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { MainBlocker } from "@/services/foundationMode";

interface Props {
  blocker: MainBlocker;
  /** When provided, surfaces a link to the detailed diagnosis for context. */
  reportId?: string;
}

const MainBlockerCard = ({ blocker, reportId }: Props) => {
  return (
    <Card className="mb-4 border-warning/40 bg-warning/5">
      <CardContent className="p-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <AlertOctagon className="h-4 w-4 shrink-0 text-warning" />
            <p className="text-xs font-semibold uppercase tracking-wider text-warning">
              Ton blocage principal cette semaine
            </p>
          </div>
          {reportId && (
            <Button asChild variant="ghost" size="sm" className="shrink-0 text-muted-foreground hover:text-foreground">
              <Link to={`/result?report_id=${reportId}`}>
                Comprends pourquoi <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </div>
        <h2 className="text-xl font-semibold text-foreground">{blocker.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{blocker.explanation}</p>
        <p className="mt-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground/80">Si tu l'ignores cette semaine : </span>
          tes streams continuent de produire du bruit, pas un signal exploitable. Aucune
          autre optimisation n'aura d'effet durable tant que ce point reste ouvert.
        </p>
      </CardContent>
    </Card>
  );
};

export default MainBlockerCard;
