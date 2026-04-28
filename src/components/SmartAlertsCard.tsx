import { useEffect, useState } from "react";
import { Bell, TrendingDown, TrendingUp, Eye, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import {
  getDebriefsBySessionIds,
  listLiveSessions,
  type LiveSession,
} from "@/services/liveSessions";
import {
  buildSmartAlerts,
  type AlertsState,
  type SmartAlert,
} from "@/services/smartAlerts";

interface Props {
  current: LiveSession | null;
}

const KIND_ICON: Record<SmartAlert["kind"], typeof Bell> = {
  degradation: TrendingDown,
  progression: TrendingUp,
  low_signal: Info,
  vigilance: Eye,
};

const TONE_STYLES: Record<
  SmartAlert["tone"],
  { wrap: string; iconWrap: string; icon: string }
> = {
  positive: {
    wrap: "border-primary/25 bg-primary/[0.03]",
    iconWrap: "bg-primary/10",
    icon: "text-primary",
  },
  warning: {
    wrap: "border-warning/30 bg-warning/[0.04]",
    iconWrap: "bg-warning/10",
    icon: "text-warning",
  },
  neutral: {
    wrap: "border-border/40 bg-card/40",
    iconWrap: "bg-muted",
    icon: "text-muted-foreground",
  },
};

/**
 * Secondary "À surveiller" block — sits at the bottom of the live stack.
 * Hidden when a live is in progress (LiveStatus owns that state) or when
 * there is simply no recent activity (the LiveStatus empty state covers it).
 */
const SmartAlertsCard = ({ current }: Props) => {
  const { user } = useAuth();
  const [state, setState] = useState<AlertsState | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user) return;
    (async () => {
      const sessions = await listLiveSessions(user.id, 10);
      const ended = sessions.filter((s) => s.status === "ended");
      const debriefs = await getDebriefsBySessionIds(ended.map((s) => s.id));
      if (cancelled) return;
      setState(
        buildSmartAlerts({
          current,
          recentSessions: ended,
          recentDebriefs: debriefs,
        }),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [user, current]);

  if (!state) return null;
  // Stay silent when the state is already covered higher up in the stack.
  if (state.state === "in_live" || state.state === "no_recent_live") return null;

  const renderShell = (
    icon: typeof Bell,
    title: string,
    description?: string,
    toneKey: SmartAlert["tone"] = "neutral",
    key?: string,
  ) => {
    const Icon = icon;
    const tone = TONE_STYLES[toneKey];
    return (
      <Card key={key} className={tone.wrap}>
        <CardContent className="flex items-start gap-3 p-4">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${tone.iconWrap}`}
          >
            <Icon className={`h-4 w-4 ${tone.icon}`} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{title}</p>
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-2.5">
      {state.alerts.map((alert) =>
        renderShell(
          KIND_ICON[alert.kind],
          alert.title,
          alert.description,
          alert.tone,
          alert.id,
        ),
      )}
    </div>
  );
};

export default SmartAlertsCard;
