import { useEffect, useState } from "react";
import {
  Bell,
  BellOff,
  Radio,
  Video,
  Pencil,
  Tag,
  Heart,
  Star,
  CheckCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getEventSubInsights,
  markAllAlertsRead,
  markAlertRead,
  formatRelativeFR,
  type EventSubInsights,
  type CreatorAlert,
} from "@/services/eventSubInsights";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  broadcasterUserId: string | null;
}

const ALERT_ICON: Record<string, typeof Bell> = {
  stream_online: Radio,
  stream_offline: Video,
  channel_update: Pencil,
  channel_follow: Heart,
  channel_subscribe: Star,
};

const SEVERITY_TONE: Record<string, { wrap: string; iconWrap: string; icon: string }> = {
  critical: {
    wrap: "border-destructive/30 bg-destructive/[0.04]",
    iconWrap: "bg-destructive/10",
    icon: "text-destructive",
  },
  warning: {
    wrap: "border-warning/30 bg-warning/[0.04]",
    iconWrap: "bg-warning/10",
    icon: "text-warning",
  },
  success: {
    wrap: "border-primary/25 bg-primary/[0.03]",
    iconWrap: "bg-primary/10",
    icon: "text-primary-strong",
  },
  info: {
    wrap: "border-border/50 bg-card/40",
    iconWrap: "bg-muted",
    icon: "text-muted-foreground",
  },
};

const renderAlert = (alert: CreatorAlert, onRead: (id: string) => void) => {
  const Icon = ALERT_ICON[alert.kind] ?? Bell;
  const tone = SEVERITY_TONE[alert.severity] ?? SEVERITY_TONE.info;
  const isUnread = !alert.read_at;
  return (
    <button
      key={alert.id}
      onClick={() => isUnread && onRead(alert.id)}
      className={`group w-full rounded-lg border p-3 text-left transition-colors ${tone.wrap} ${
        isUnread ? "ring-1 ring-primary/20" : "opacity-80 hover:opacity-100"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${tone.iconWrap}`}
        >
          <Icon className={`h-3.5 w-3.5 ${tone.icon}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-sm font-medium text-foreground">
              {alert.title}
            </p>
            {isUnread && (
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            )}
          </div>
          {alert.body && (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
              {alert.body}
            </p>
          )}
          <p className="mt-1 text-[10.5px] uppercase tracking-wider text-muted-foreground/70">
            {formatRelativeFR(alert.created_at)}
          </p>
        </div>
      </div>
    </button>
  );
};

const EventSubCockpitSection = ({ broadcasterUserId }: Props) => {
  const [data, setData] = useState<EventSubInsights | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!broadcasterUserId) return;
    const next = await getEventSubInsights(broadcasterUserId);
    setData(next);
  };

  useEffect(() => {
    let cancelled = false;
    if (!broadcasterUserId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      const next = await getEventSubInsights(broadcasterUserId);
      if (!cancelled) {
        setData(next);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [broadcasterUserId]);

  // Realtime: refresh when new alerts/updates land for this broadcaster.
  useEffect(() => {
    if (!broadcasterUserId) return;
    const filter = `broadcaster_user_id=eq.${broadcasterUserId}`;
    const channel = supabase
      .channel(`eventsub-cockpit-${broadcasterUserId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "creator_alerts", filter },
        () => refresh(),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "channel_update_history", filter },
        () => refresh(),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "community_events", filter },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [broadcasterUserId]);

  if (!broadcasterUserId) return null;

  if (loading) {
    return (
      <Card>
        <CardContent className="space-y-3 p-5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.hasAnyData) {
    return (
      <Card className="border-border/60 bg-card/60">
        <CardContent className="flex items-start gap-3 p-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
            <BellOff className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Pas encore mesurable
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Aucun événement Twitch reçu pour le moment. Lance un live ou modifie
              ton titre Twitch pour déclencher les premiers signaux.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleRead = async (id: string) => {
    await markAlertRead(id);
    setData((prev) =>
      prev
        ? {
            ...prev,
            alerts: prev.alerts.map((a) =>
              a.id === id ? { ...a, read_at: new Date().toISOString() } : a,
            ),
            unreadAlerts: Math.max(0, prev.unreadAlerts - 1),
          }
        : prev,
    );
  };

  const handleReadAll = async () => {
    if (!broadcasterUserId) return;
    await markAllAlertsRead(broadcasterUserId);
    refresh();
  };

  const c = data.community;
  const communityHasData = c.hasAnyEvent;

  return (
    <div className="space-y-4">
      {/* Alerts feed */}
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary-strong" />
              <h3 className="text-sm font-semibold text-foreground">
                Activité Twitch
              </h3>
              {data.unreadAlerts > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                  {data.unreadAlerts} nouveau{data.unreadAlerts > 1 ? "x" : ""}
                </Badge>
              )}
            </div>
            {data.unreadAlerts > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleReadAll}
                className="h-7 px-2 text-xs"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Tout marquer comme lu
              </Button>
            )}
          </div>

          {data.alerts.length === 0 ? (
            <p className="py-2 text-xs text-muted-foreground">
              Aucun événement Twitch reçu pour le moment.
            </p>
          ) : (
            <div className="space-y-2">
              {data.alerts.slice(0, 6).map((a) => renderAlert(a, handleRead))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Channel update history */}
      {data.changes.length > 0 && (
        <Card>
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">
                Modifications de chaîne
              </h3>
            </div>
            <ul className="space-y-3">
              {data.changes.map((ch) => {
                const showTitle = ch.titleChanged || !ch.previous;
                const showCategory = ch.categoryChanged || !ch.previous;
                return (
                  <li
                    key={ch.current.id}
                    className="rounded-md border border-border/40 bg-card/40 p-3"
                  >
                    <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground/70">
                      {formatRelativeFR(ch.current.changed_at)}
                    </p>
                    {showTitle && (
                      <div className="mt-1.5 flex items-start gap-2">
                        <Pencil className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Titre</p>
                          {ch.previous?.title && ch.titleChanged && (
                            <p className="truncate text-xs text-muted-foreground/70 line-through">
                              {ch.previous.title}
                            </p>
                          )}
                          <p className="text-sm text-foreground">
                            {ch.current.title || "—"}
                          </p>
                        </div>
                      </div>
                    )}
                    {showCategory && (
                      <div className="mt-2 flex items-start gap-2">
                        <Tag className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">
                            Catégorie
                          </p>
                          {ch.previous?.category_name && ch.categoryChanged && (
                            <p className="truncate text-xs text-muted-foreground/70 line-through">
                              {ch.previous.category_name}
                            </p>
                          )}
                          <p className="text-sm text-foreground">
                            {ch.current.category_name || "—"}
                          </p>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Community aggregates */}
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-primary-strong" />
            <h3 className="text-sm font-semibold text-foreground">
              Communauté
            </h3>
          </div>
          {!communityHasData ? (
            <p className="text-xs text-muted-foreground">
              Pas encore mesurable. Aucun événement communauté reçu pour le moment.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Follows aujourd'hui", value: c.followsToday },
                { label: "Follows cette semaine", value: c.followsWeek },
                { label: "Subs aujourd'hui", value: c.subsToday },
                { label: "Subs cette semaine", value: c.subsWeek },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-md border border-border/40 bg-card/40 p-3"
                >
                  <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground/70">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-xl font-semibold text-foreground">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EventSubCockpitSection;
