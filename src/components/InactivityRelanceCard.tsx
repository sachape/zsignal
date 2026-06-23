import { useEffect, useState } from "react";
import { Coffee, Pause, RotateCcw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { listLiveSessions, type LiveSession } from "@/services/liveSessions";
import {
  buildInactivityRelance,
  type InactivityState,
} from "@/services/inactivityRelance";

interface Props {
  current: LiveSession | null;
}

const TIER_VISUAL = {
  soft: { Icon: Coffee, iconWrap: "bg-muted", icon: "text-muted-foreground" },
  paused: { Icon: Pause, iconWrap: "bg-muted", icon: "text-muted-foreground" },
  rebuild: {
    Icon: RotateCcw,
    iconWrap: "bg-primary/10",
    icon: "text-primary-strong",
  },
} as const;

/**
 * Gentle inactivity reminder — only renders when the streamer has not been
 * live for ≥7 days. Stays mute (returns null) for active users, so it never
 * competes with the weekly milestone block above it in the cockpit.
 */
const InactivityRelanceCard = ({ current }: Props) => {
  const { user } = useAuth();
  const [state, setState] = useState<InactivityState | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user) return;
    (async () => {
      const sessions = await listLiveSessions(user.id, 5);
      const ended = sessions.filter((s) => s.status === "ended");
      if (cancelled) return;
      setState(buildInactivityRelance(current, ended));
    })();
    return () => {
      cancelled = true;
    };
  }, [user, current]);

  if (!state || state.tier === "active") return null;

  const visual = TIER_VISUAL[state.tier];
  const showDays =
    state.daysSinceLast !== null && state.daysSinceLast >= 7;

  return (
    <Card className="border-border/60 bg-card/60">
      <CardContent className="flex items-start gap-3 p-4">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${visual.iconWrap}`}
        >
          <visual.Icon className={`h-4 w-4 ${visual.icon}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Reprise
            </p>
            {showDays && (
              <Badge variant="muted" className="h-5 px-1.5 text-[10px]">
                {state.daysSinceLast} j
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {state.title}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {state.description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default InactivityRelanceCard;
