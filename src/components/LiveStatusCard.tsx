import { Link } from "react-router-dom";
import { Radio, ArrowRight, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatLiveDateTime,
  formatLiveDuration,
  formatRelativeFrom,
  type LiveDebrief,
  type LiveSession,
} from "@/services/liveSessions";

interface Props {
  current: LiveSession | null;
  last: LiveSession | null;
  lastDebrief: LiveDebrief | null;
}

/**
 * Cockpit live-state strip.
 * - Live in progress → red live indicator + session being tracked.
 * - No live + a previous one → relative timestamp + CTA to debrief.
 * - No live ever → empty state, honest copy.
 */
const LiveStatusCard = ({ current, last, lastDebrief }: Props) => {
  // CASE A — currently live
  if (current) {
    return (
      <Card className="border-destructive/40 bg-destructive/[0.04]">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-destructive/15">
              <Radio className="h-4 w-4 text-destructive" />
              <span className="absolute right-1 top-1 h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">En live</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Démarré {formatRelativeFrom(current.started_at)}
                {current.category_name ? ` · ${current.category_name}` : ""}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground sm:text-right">
            Le débrief sera prêt à la fin du stream.
          </p>
        </CardContent>
      </Card>
    );
  }

  // CASE B — last live with debrief
  if (last) {
    const score = lastDebrief?.overall_score ?? null;
    return (
      <Card className="border-border/60">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  Dernier live
                </span>
                <Badge variant="muted" className="h-5 px-1.5 text-[10px]">
                  {formatRelativeFrom(last.ended_at ?? last.started_at)}
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatLiveDateTime(last.started_at)} ·{" "}
                {formatLiveDuration(last.duration_minutes)}
                {score !== null ? ` · Score ${score}` : ""}
              </p>
            </div>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to="/lives/last" className="flex items-center gap-1.5">
              Voir le débrief
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // CASE C — no live ever
  return (
    <Card className="border-border/60 bg-card/60">
      <CardContent className="flex items-start gap-3 p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
          <Radio className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            Aucun live détecté pour le moment
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Ton prochain stream créera automatiquement une session et son débrief.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default LiveStatusCard;
