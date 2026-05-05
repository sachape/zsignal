// EventSub product-data read layer for the cockpit.
// Frontend reads only — RLS scopes rows to the authenticated user via
// connected_accounts ownership. No raw payloads, no follower/subscriber IDs.

import { supabase } from "@/integrations/supabase/client";

export interface CreatorAlert {
  id: string;
  kind: string;
  severity: "info" | "success" | "warning" | "critical" | string;
  title: string;
  body: string | null;
  created_at: string;
  read_at: string | null;
  source_event_type: string | null;
}

export interface ChannelUpdateRow {
  id: string;
  title: string | null;
  category_name: string | null;
  language: string | null;
  changed_at: string;
}

export interface ChannelUpdateChange {
  current: ChannelUpdateRow;
  previous: ChannelUpdateRow | null;
  titleChanged: boolean;
  categoryChanged: boolean;
}

export interface CommunityAggregates {
  followsToday: number;
  followsWeek: number;
  subsToday: number;
  subsWeek: number;
  hasAnyEvent: boolean;
}

export interface EventSubInsights {
  alerts: CreatorAlert[];
  unreadAlerts: number;
  changes: ChannelUpdateChange[];
  community: CommunityAggregates;
  hasAnyData: boolean;
}

const startOfTodayISO = (): string => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const startOfWeekISO = (): string => {
  const d = new Date();
  const day = d.getDay(); // 0 = Sun
  const diff = (day + 6) % 7; // ISO week starts Monday
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

export async function getEventSubInsights(
  broadcasterUserId: string,
): Promise<EventSubInsights> {
  const weekStart = startOfWeekISO();
  const todayStart = startOfTodayISO();

  const [alertsRes, updatesRes, communityRes] = await Promise.all([
    supabase
      .from("creator_alerts")
      .select(
        "id, kind, severity, title, body, created_at, read_at, source_event_type",
      )
      .eq("broadcaster_user_id", broadcasterUserId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("channel_update_history")
      .select("id, title, category_name, language, changed_at")
      .eq("broadcaster_user_id", broadcasterUserId)
      .order("changed_at", { ascending: false })
      .limit(6),
    supabase
      .from("community_events")
      .select("kind, occurred_at")
      .eq("broadcaster_user_id", broadcasterUserId)
      .gte("occurred_at", weekStart),
  ]);

  const alerts = (alertsRes.data ?? []) as CreatorAlert[];
  const updates = (updatesRes.data ?? []) as ChannelUpdateRow[];

  // Build change diffs (current vs immediate previous).
  const changes: ChannelUpdateChange[] = [];
  for (let i = 0; i < updates.length; i++) {
    const current = updates[i];
    const previous = updates[i + 1] ?? null;
    const titleChanged = !!previous && (previous.title ?? "") !== (current.title ?? "");
    const categoryChanged =
      !!previous && (previous.category_name ?? "") !== (current.category_name ?? "");
    // Only surface entries with actual change context, or the latest one as a baseline.
    if (i === 0 || titleChanged || categoryChanged) {
      changes.push({ current, previous, titleChanged, categoryChanged });
    }
    if (changes.length >= 4) break;
  }

  const events = (communityRes.data ?? []) as { kind: string; occurred_at: string }[];
  const community: CommunityAggregates = {
    followsToday: 0,
    followsWeek: 0,
    subsToday: 0,
    subsWeek: 0,
    hasAnyEvent: events.length > 0,
  };
  for (const ev of events) {
    const isFollow = ev.kind === "follow" || ev.kind === "channel.follow";
    const isSub =
      ev.kind === "subscribe" ||
      ev.kind === "channel.subscribe" ||
      ev.kind === "channel.subscription.gift" ||
      ev.kind === "channel.subscription.message";
    const isToday = ev.occurred_at >= todayStart;
    if (isFollow) {
      community.followsWeek += 1;
      if (isToday) community.followsToday += 1;
    } else if (isSub) {
      community.subsWeek += 1;
      if (isToday) community.subsToday += 1;
    }
  }

  const unreadAlerts = alerts.filter((a) => !a.read_at).length;
  const hasAnyData =
    alerts.length > 0 || updates.length > 0 || community.hasAnyEvent;

  return { alerts, unreadAlerts, changes, community, hasAnyData };
}

export async function markAlertRead(alertId: string): Promise<void> {
  await supabase
    .from("creator_alerts")
    .update({ read_at: new Date().toISOString() })
    .eq("id", alertId);
}

export async function markAllAlertsRead(
  broadcasterUserId: string,
): Promise<void> {
  await supabase
    .from("creator_alerts")
    .update({ read_at: new Date().toISOString() })
    .eq("broadcaster_user_id", broadcasterUserId)
    .is("read_at", null);
}

export function formatRelativeFR(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  if (d === 1) return "hier";
  return `il y a ${d} j`;
}
