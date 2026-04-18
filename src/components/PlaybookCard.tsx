import { Link } from "react-router-dom";
import { BookOpen, ArrowRight, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Playbook } from "@/services/playbookLibrary";

interface Props {
  playbook: Playbook;
  /** When true, shows full steps. Otherwise, a compact dashboard card. */
  expanded?: boolean;
}

const PlaybookCard = ({ playbook, expanded }: Props) => {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-3 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent/10">
            <BookOpen className="h-4 w-4 text-accent" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground">{playbook.title}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{playbook.summary}</p>
          </div>
          <Badge variant="outline" className="shrink-0 text-[10px] text-muted-foreground">
            <Clock className="h-2.5 w-2.5" /> {playbook.timeMinutes} min
          </Badge>
        </div>

        <p className="mb-3 rounded-md bg-muted/30 p-2.5 text-xs text-muted-foreground">
          {playbook.why}
        </p>

        {expanded ? (
          <ol className="ml-4 list-decimal space-y-1.5 text-sm text-foreground">
            {playbook.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        ) : (
          <Link
            to={`/playbooks/${playbook.slug}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Lire le playbook <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </CardContent>
    </Card>
  );
};

export default PlaybookCard;
