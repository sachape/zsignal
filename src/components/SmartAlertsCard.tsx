import { useEffect, useState } from "react";
import { Bell, TrendingDown, TrendingUp, Eye, Radio, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import {
  getDebriefsBySessionIds,
  listLiveSessions,
  type LiveDebrief,
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
    wrap: "border-primary/25 bg-primary/[0.04]",
    iconWrap: "bg-primary/10",
    icon: "text-primary",
  },
  warning: {
    wrap: "border-warning/30 bg-warning/[0.04]",
    iconWrap: "bg-warning/10",
    icon: "text-warning",
  },
  neutral: {
    wrap: "border-border/60",
    iconWrap: "bg-muted",
    icon: "text-muted-foreground",
  },
};

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

  const renderShell = (
    icon: typeof Bell,
    title: string,
    description?: string,
    toneKey: SmartAlert["tone"] = "neutral",
  ) => {
    const Icon = icon;
    const tone = TONE_STYLES[toneKey];
    return (
      <Card className={tone.wrap}>
        <CardContent className="flex items-start gap-3 p-4">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${tone.iconWrap}`}
          >
            <Icon className={`h-4 w-4 ${tone.icon}`} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{title}</p>
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

  if (state.state === "in_live") {
    return (
      <div>
        <SectionHeader />
        {renderShell(
          Radio,
          "Ton live est en cours.",
          "StreamPulse analysera la session une fois terminée.",
          "neutral",
        )}
      </div>
    );
  }

  if (state.state === "no_recent_live") {
    return (
      <div>
        <SectionHeader />
        {renderShell(
          Bell,
          "Aucun live récent à surveiller pour le moment.",
          undefined,
          "neutral",
        )}
      </div>
    );
  }

  return (
    <div>
      <SectionHeader />
      <div className="space-y-2">
        {state.alerts.map((alert) =>
          renderShell(KIND_ICON[alert.kind], alert.title, alert.description, alert.tone),
        )}
      </div>
    </div>
  );
};

const SectionHeader = () => (
  <div className="mb-2 flex items-center gap-2 px-1">
    <Bell className="h-3.5 w-3.5 text-muted-foreground" />
    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      À surveiller
    </p>
  </div>
);

export default SmartAlertsCard;
