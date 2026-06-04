import { Compass } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getLiveProgressionCopy } from "@/services/liveProgressionCopy";

interface Props {
  /**
   * Number of live sessions detected on the last 30 days.
   * Drives the user-facing microcopy (0 / 1 / multiple lives).
   */
  streams30d: number;
}

/**
 * Compact banner that reframes the product as a structuring coach when
 * foundation mode is active. Sits at the top of the dashboard.
 *
 * Intentionally avoids any technical wording (signal/confidence/snapshots/
 * fallback) — the message is always positive and oriented toward the next
 * action the streamer can take.
 */
const FoundationModeBanner = ({ streams30d }: Props) => {
  const copy = getLiveProgressionCopy(streams30d, true);
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
            {copy.headline}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {copy.helper}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default FoundationModeBanner;
