// Signal extraction. Reads RLS-scoped tables for the current user and
// returns one typed bundle for the action generator.

import { supabase } from "@/integrations/supabase/client";
import {
  getDebriefsBySessionIds,
  listLiveSessions,
  type LiveDebrief,
  type LiveSession,
} from "@/services/liveSessions";
import { buildInactivityRelance } from "@/services/inactivityRelance";
import { classifyMaturity } from "./maturity";
import type { PriorActionRef, SignalBundle } from "./types";

const LOOKBACK_DAYS_SESSIONS = 30;
const LOOKBACK_DAYS_EVENTS = 14;

function isoDaysAgo(days: number): string {
  const d = new Date(Date.now() - days * 86400_000);
  return d.toISOString();
}

async function fetchBroadcasterId(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("connected_accounts")
    .select("platform_user_id")
    .eq("user_id", userId)
    .eq("platform", "twitch")
    .maybeSingle();
  return (data?.platform_user_id as string | undefined) ?? null;
}

async function fetchChannelUpdatesCount(
  broadcasterId: string | null,
): Promise<number> {
  if (!broadcasterId) return 0;
  const { count } = await supabase
    .from("channel_update_history")
    .select("*", { count: "exact", head: true })
    .eq("broadcaster_user_id", broadcasterId)
    .gte("changed_at", isoDaysAgo(LOOKBACK_DAYS_EVENTS));
  return count ?? 0;
}

async function fetchCommunityEvents(
  broadcasterId: string | null,
): Promise<{ count: number; kinds: string[] }> {
  if (!broadcasterId) return { count: 0, kinds: [] };
  const { data } = await supabase
    .from("community_events")
    .select("kind")
    .eq("broadcaster_user_id", broadcasterId)
    .gte("occurred_at", isoDaysAgo(LOOKBACK_DAYS_EVENTS));
  const rows = (data ?? []) as { kind: string }[];
  const kinds = Array.from(new Set(rows.map((r) => r.kind))).slice(0, 8);
  return { count: rows.length, kinds };
}

async function fetchAlertsCount(broadcasterId: string | null): Promise<number> {
  if (!broadcasterId) return 0;
  const { count } = await supabase
    .from("creator_alerts")
    .select("*", { count: "exact", head: true })
    .eq("broadcaster_user_id", broadcasterId)
    .gte("created_at", isoDaysAgo(LOOKBACK_DAYS_EVENTS));
  return count ?? 0;
}

async function fetchStreamScoreContext(
  userId: string,
): Promise<{
  latest: import("./types").StreamScoreLatestSummary | null;
  movement: import("@/services/streamScoreMovement").StreamScoreMovement;
}> {
  const movement = await getStreamScoreMovement(userId);
  const s = movement.latest_snapshot;
  const latest = s
    ? {
        overall_score: s.overall,
        confidence: s.confidence,
        signal_quality: s.signal_quality,
        priority_dimension: s.priority_dimension,
        regularity: s.regularity,
        structure: s.structure,
        content: s.content,
        positioning: s.positioning,
        momentum: s.momentum,
        monetization: s.monetization,
      }
    : null;
  return { latest, movement };
}

async function fetchLatestFacts(
  userId: string,
): Promise<{ facts: Record<string, unknown> | null; available: boolean }> {
  const { data } = await supabase
    .from("analysis_reports")
    .select("report_data")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return { facts: null, available: false };
  const report = data.report_data as Record<string, unknown> | null;
  const facts = (report?.facts as Record<string, unknown> | undefined) ?? null;
  return { facts, available: facts !== null };
}

async function fetchPriorActions(userId: string): Promise<PriorActionRef[]> {
  const { data } = await supabase
    .from("weekly_action_items")
    .select("action_key, status, created_at")
    .eq("user_id", userId)
    .gte("created_at", isoDaysAgo(21))
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as {
    action_key: string | null;
    status: string;
    created_at: string;
  }[];
  return rows
    .filter((r) => r.action_key)
    .map((r) => ({
      action_key: r.action_key as string,
      status: (["todo", "done", "skipped"].includes(r.status)
        ? r.status
        : "todo") as PriorActionRef["status"],
      week_start: null,
    }));
}

export interface BundleInputs {
  current: LiveSession | null;
  recentSessions: LiveSession[];
  recentDebriefs: Map<string, LiveDebrief>;
}

/**
 * Build the full signal bundle for the current user.
 * Optionally accepts pre-loaded sessions/debriefs to avoid double fetching.
 */
export async function loadSignalBundle(
  userId: string,
  inputs?: BundleInputs,
): Promise<SignalBundle> {
  const recentSessions =
    inputs?.recentSessions ??
    (await listLiveSessions(userId, LOOKBACK_DAYS_SESSIONS)).filter(
      (s) => s.status === "ended",
    );
  const recentDebriefs =
    inputs?.recentDebriefs ??
    (await getDebriefsBySessionIds(recentSessions.map((s) => s.id)));
  const current = inputs?.current ?? null;

  const fourteenAgo = Date.now() - LOOKBACK_DAYS_EVENTS * 86400_000;
  const recent14 = recentSessions.filter((s) => {
    const t = new Date(s.ended_at ?? s.started_at).getTime();
    return t >= fourteenAgo;
  });

  const lastSession = recentSessions[0] ?? null;
  const latestDebrief = recentSessions
    .map((s) => recentDebriefs.get(s.id))
    .find((d): d is LiveDebrief => Boolean(d)) ?? null;

  const inactivity = buildInactivityRelance(current, recentSessions);

  const broadcasterId = await fetchBroadcasterId(userId);
  const [updates, community, alertsCount, streamScore, factsRes, priors] =
    await Promise.all([
      fetchChannelUpdatesCount(broadcasterId),
      fetchCommunityEvents(broadcasterId),
      fetchAlertsCount(broadcasterId),
      fetchLatestStreamScore(userId),
      fetchLatestFacts(userId),
      fetchPriorActions(userId),
    ]);

  const twoWeeksAgo = Date.now() - 14 * 86400_000;
  const priors2w = priors.filter(() => true); // already filtered to 21d above
  const skipped2w = priors2w
    .filter((p) => p.status === "skipped")
    .map((p) => p.action_key);
  const keys2w = Array.from(new Set(priors2w.map((p) => p.action_key)));
  const allKeys = Array.from(new Set(priors.map((p) => p.action_key)));

  const baseBundle: Omit<SignalBundle, "maturity_state"> = {
    sessions_count: recentSessions.length,
    recent_sessions_count: recent14.length,
    last_session: lastSession,
    debriefs_count: recentDebriefs.size,
    latest_debrief: latestDebrief,
    latest_weakness: latestDebrief?.weakness ?? null,
    latest_priority_action: latestDebrief?.priority_action ?? null,
    inactivity_tier: inactivity.tier,
    days_since_last: inactivity.daysSinceLast,
    channel_updates_count_14d: updates,
    community_events_count_14d: community.count,
    community_event_kinds: community.kinds,
    creator_alerts_count_14d: alertsCount,
    stream_score_latest: streamScore,
    facts: factsRes.facts,
    facts_available: factsRes.available,
    prior_action_keys_2w: keys2w,
    prior_skipped_keys_2w: skipped2w,
    all_prior_action_keys: allKeys,
  };

  // Touch unused var to satisfy TS but keep the variable available for future use.
  void twoWeeksAgo;

  const maturity_state = classifyMaturity(baseBundle);
  return { ...baseBundle, maturity_state };
}

/** Compact, JSON-safe summary persisted into weekly_milestones.generated_signals. */
export function summarizeBundle(s: SignalBundle): Record<string, unknown> {
  return {
    sessions_count: s.sessions_count,
    recent_sessions_count: s.recent_sessions_count,
    debriefs_count: s.debriefs_count,
    latest_debrief_id: s.latest_debrief?.id ?? null,
    latest_weakness: s.latest_weakness,
    latest_priority_action: s.latest_priority_action,
    inactivity_tier: s.inactivity_tier,
    days_since_last: s.days_since_last,
    channel_updates_count_14d: s.channel_updates_count_14d,
    community_events_count_14d: s.community_events_count_14d,
    community_event_kinds: s.community_event_kinds,
    creator_alerts_count_14d: s.creator_alerts_count_14d,
    stream_score_latest: s.stream_score_latest?.overall_score ?? null,
    facts_available: s.facts_available,
    maturity_state: s.maturity_state,
    availability: {
      live_sessions: s.sessions_count > 0,
      debriefs: s.debriefs_count > 0,
      community_events: s.community_events_count_14d > 0,
      channel_updates: s.channel_updates_count_14d > 0,
      stream_score: s.stream_score_latest !== null,
      facts: s.facts_available,
    },
  };
}
