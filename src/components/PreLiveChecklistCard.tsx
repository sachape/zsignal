import { CheckCircle2, ListChecks, Radio } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  buildPreLiveChecklist,
  type PreLiveChecklist,
} from "@/services/prelive";
import type { LiveDebrief, LiveSession } from "@/services/liveSessions";

interface Props {
  current: LiveSession | null;
  last: LiveSession | null;
  lastDebrief: LiveDebrief | null;
}

/**
 * Cockpit "Avant ton prochain live" block — short, scannable checklist
 * derived from the last debrief. Stays secondary to score / blocker /
 * priority action: max 3 items + an optional one-line objective.
 */
const PreLiveChecklistCard = ({ current, last, lastDebrief }: Props) => {
  const checklist: PreLiveChecklist = buildPreLiveChecklist(
    current,
    last,
    lastDebrief,
  );

  // CASE — live in progress: hide checklist, show coherent state.
  if (checklist.state === "in_live") {
    return (
      <Card className="border-border/60 bg-card/60">
        <CardContent className="flex items-start gap-3 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
            <Radio className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Ton live est en cours.
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              La checklist reviendra une fois cette session terminée.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // CASE — no live ever / no debrief yet.
  if (checklist.state === "no_live") {
    return (
      <Card className="border-border/60 bg-card/60">
        <CardContent className="flex items-start gap-3 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
            <ListChecks className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Avant ton prochain live
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Lance un premier live pour débloquer une checklist personnalisée.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // CASE — ready or low_signal: render the actual checklist.
  const subtext =
    checklist.state === "low_signal"
      ? "Signal encore léger : on reste sur des bases simples."
      : "Une checklist simple basée sur ton dernier débrief.";

  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
            <ListChecks className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">
              Avant ton prochain live
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{subtext}</p>
          </div>
        </div>

        <ul className="mt-3 space-y-1.5 pl-12">
          {checklist.items.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 text-sm text-foreground"
            >
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" />
              <span className="leading-snug">{item}</span>
            </li>
          ))}
        </ul>

        {checklist.objective && (
          <p className="mt-3 pl-12 text-xs font-medium text-muted-foreground">
            {checklist.objective}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default PreLiveChecklistCard;
