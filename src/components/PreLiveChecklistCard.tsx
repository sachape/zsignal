import { CheckCircle2, ListChecks } from "lucide-react";
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
 *
 * Suppressed entirely when a live is in progress: the LiveStatusCard
 * already covers that surface at the top of the stack.
 */
const PreLiveChecklistCard = ({ current, last, lastDebrief }: Props) => {
  if (current) return null;

  const checklist: PreLiveChecklist = buildPreLiveChecklist(
    current,
    last,
    lastDebrief,
  );

  // CASE — no live ever / no debrief yet.
  if (checklist.state === "no_live") {
    return (
      <Card className="border-border/40 bg-card/40">
        <CardContent className="flex items-start gap-3 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
            <ListChecks className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Avant ton prochain live
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Une checklist personnalisée s'activera après ton premier live.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // CASE — ready or low_signal: render the actual checklist.
  // We keep one short qualifier only when the signal is light, otherwise
  // the title is enough — no filler subtext.
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
            {checklist.state === "low_signal" && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Bases simples, le temps que la lecture se précise.
              </p>
            )}
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
