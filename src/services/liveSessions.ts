// Live sessions service — read-side helpers for the cockpit and debrief views.
//
// The detect/snapshot/close/debrief writes happen exclusively in the
// `live-detect` edge function (cron + on-demand). The client only reads here.

import { supabase } from "@/integrations/supabase/client";

export type LiveSessionStatus = "live" | "ended";

export interface LiveSession {
  id: string;
  user_id: string;
  connected_account_id: string;
  platform: string;
  platform_user_id: string;
  platform_login: string | null;
  platform_display_name: string | null;
  twitch_stream_id: string | null;
  category_name: string | null;
  start_title: string | null;
  language: string | null;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  status: LiveSessionStatus;
  peak_viewers: number | null;
  avg_viewers: number | null;
  snapshots_count: number;
  created_at: string;
  updated_at: string;
}

export interface LiveDebrief {
  id: string;
  live_session_id: string;
  user_id: string;
  overall_score: number | null;
  score_start: number | null;
  score_hold: number | null;
  score_structure: number | null;
  verdict: string | null;
  strength: string | null;
  weakness: string | null;
  priority_action: string | null;
  comparison_data: {
    has_previous?: boolean;
    previous_session_id?: string;
    duration_delta_min?: number;
    peak_delta?: number;
    avg_delta?: number;
  } | null;
  has_enough_signal: boolean;
  created_at: string;
  updated_at: string;
}

export interface LiveCockpitSnapshot {
  /** Currently open (live) session if any. */
  current: LiveSession | null;
  /** Last ended session, if any. */
  last: LiveSession | null;
  /** Debrief attached to `last`, if available. */
  lastDebrief: LiveDebrief | null;
}

export async function getLiveCockpitSnapshot(
  userId: string,
): Promise<LiveCockpitSnapshot> {
  // 1. Open session
  const { data: openRows } = await supabase
    .from("live_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "live")
    .order("started_at", { ascending: false })
    .limit(1);
  const current = (openRows?.[0] as LiveSession | undefined) ?? null;

  // 2. Last ended session
  const { data: endedRows } = await supabase
    .from("live_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "ended")
    .order("started_at", { ascending: false })
    .limit(1);
  const last = (endedRows?.[0] as LiveSession | undefined) ?? null;

  // 3. Debrief for the last session
  let lastDebrief: LiveDebrief | null = null;
  if (last) {
    const { data: debriefRow } = await supabase
      .from("live_debriefs")
      .select("*")
      .eq("live_session_id", last.id)
      .maybeSingle();
    lastDebrief = (debriefRow as LiveDebrief | null) ?? null;
  }

  return { current, last, lastDebrief };
}

/** List the user's live sessions, most recent first. */
export async function listLiveSessions(
  userId: string,
  limit = 50,
): Promise<LiveSession[]> {
  const { data } = await supabase
    .from("live_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(limit);
  return (data as LiveSession[] | null) ?? [];
}

/** Fetch a single live session by id (RLS scoped to the current user). */
export async function getLiveSessionById(
  sessionId: string,
): Promise<{ session: LiveSession | null; debrief: LiveDebrief | null }> {
  const { data: sessionRow } = await supabase
    .from("live_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();
  const session = (sessionRow as LiveSession | null) ?? null;
  if (!session) return { session: null, debrief: null };
  const { data: debriefRow } = await supabase
    .from("live_debriefs")
    .select("*")
    .eq("live_session_id", sessionId)
    .maybeSingle();
  return { session, debrief: (debriefRow as LiveDebrief | null) ?? null };
}

/** Fetch debriefs for many sessions in one query, keyed by live_session_id. */
export async function getDebriefsBySessionIds(
  sessionIds: string[],
): Promise<Map<string, LiveDebrief>> {
  const map = new Map<string, LiveDebrief>();
  if (sessionIds.length === 0) return map;
  const { data } = await supabase
    .from("live_debriefs")
    .select("*")
    .in("live_session_id", sessionIds);
  for (const row of (data as LiveDebrief[] | null) ?? []) {
    map.set(row.live_session_id, row);
  }
  return map;
}

/** Trigger a one-shot detect for the connected user (manual refresh). */
export async function triggerLiveDetectForSelf(): Promise<void> {
  try {
    await supabase.functions.invoke("live-detect", { body: { mode: "self" } });
  } catch (err) {
    // Swallow — UI keeps working with whatever DB state exists.
    console.warn("[liveSessions] manual detect failed", err);
  }
}

/** Format a duration in minutes as a short human label (e.g. "2 h 14"). */
export function formatLiveDuration(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return "—";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}

/** Format an ISO date as a short FR string (e.g. "14 mars · 21:30"). */
export function formatLiveDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Relative label: "il y a 12 min", "il y a 3 h", "hier", "il y a 4 j". */
export function formatRelativeFrom(iso: string | null | undefined): string {
  if (!iso) return "—";
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  if (days === 1) return "hier";
  return `il y a ${days} j`;
}
