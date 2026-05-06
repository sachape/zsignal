// Weekly milestone — V2 simplified.
//
// Design:
//  - 3 families only: reconstruction / stabilization / confirmation.
//  - Generated ONCE per ISO week and persisted in `weekly_milestones`.
//  - Re-reads the row on every cockpit visit instead of recomputing the cap.
//  - Status is the only mutable field after generation (in_progress → reached).
//  - "No recent live" is NOT handled here (delegated to the inactivity
//    relance block) — the milestone stays a forward-looking cap.
//  - No score-delta heuristics. Family is picked from the dominant state:
//    signal level → blocker presence → recent positive debrief.

import { supabase } from "@/integrations/supabase/client";
import type { LiveDebrief, LiveSession } from "@/services/liveSessions";

export type MilestoneKind =
  | "reconstruction"
  | "stabilization"
  | "confirmation";

export type MilestoneStatus =
  | "not_started"
  | "in_progress"
  | "reached"
  | "paused"; // live currently in progress

export interface WeeklyMilestoneRow {
  id: string;
  user_id: string;
  week_start: string; // YYYY-MM-DD
  week_end: string;
  kind: MilestoneKind;
  title: string;
  rationale: string;
  target_count: number;
  status: MilestoneStatus;
  reached_at: string | null;
  source_session_id: string | null;
  source_debrief_id: string | null;
  diagnosis: string | null;
  generated_signals: Record<string, unknown> | null;
  generated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MilestoneView {
  row: WeeklyMilestoneRow;
  /** Effective status displayed to the UI (paused if live in progress). */
  effectiveStatus: MilestoneStatus;
  /** Sessions ended within the milestone window. */
  doneCount: number;
}

// --- Week boundaries (Monday → Sunday, FR convention) ---

function startOfIsoWeek(d: Date): Date {
  const day = d.getUTCDay(); // 0=Sun..6=Sat
  const diff = (day + 6) % 7; // days since Monday
  const monday = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diff),
  );
  return monday;
}

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function currentWeekBounds(): { start: string; end: string } {
  const now = new Date();
  const start = startOfIsoWeek(now);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return { start: toDateString(start), end: toDateString(end) };
}

// --- Family selection (no score deltas, dominant-state only) ---

interface PickInput {
  recentSessions: LiveSession[]; // ended, most recent first
  recentDebriefs: Map<string, LiveDebrief>;
}

interface PickedTemplate {
  kind: MilestoneKind;
  title: string;
  rationale: string;
  target_count: number;
  source_session_id: string | null;
  source_debrief_id: string | null;
}

function pickTemplate(input: PickInput): PickedTemplate {
  const sessions = input.recentSessions.slice(0, 5);
  const debriefs = sessions
    .map((s) => ({ s, d: input.recentDebriefs.get(s.id) ?? null }))
    .filter((x): x is { s: LiveSession; d: LiveDebrief } => x.d !== null);
  const lastDebrief = debriefs[0]?.d ?? null;
  const lastSession = debriefs[0]?.s ?? null;

  // 1. Reconstruction — not enough signal to coach anything.
  const lowSignal =
    sessions.length < 2 ||
    debriefs.length < 2 ||
    (lastDebrief && lastDebrief.has_enough_signal === false);
  if (lowSignal) {
    return {
      kind: "reconstruction",
      title: "Faire 2 sessions complètes cette semaine.",
      rationale: "Recrée une base exploitable avant d'optimiser le reste.",
      target_count: 2,
      source_session_id: lastSession?.id ?? null,
      source_debrief_id: lastDebrief?.id ?? null,
    };
  }

  // 2. Confirmation — last debrief explicitly highlights a strength.
  if (lastDebrief && lastDebrief.strength && lastDebrief.strength.length > 0) {
    return {
      kind: "confirmation",
      title: "Confirmer cette amélioration sur un nouveau live cette semaine.",
      rationale: "Une bonne dynamique récente, à valider sur la prochaine session.",
      target_count: 1,
      source_session_id: lastSession?.id ?? null,
      source_debrief_id: lastDebrief?.id ?? null,
    };
  }

  // 3. Stabilization (default) — apply the priority action of the last debrief.
  return {
    kind: "stabilization",
    title: "Valider 1 live propre en appliquant la priorité du dernier débrief.",
    rationale: lastDebrief?.priority_action
      ? `Cap à viser : ${truncate(lastDebrief.priority_action, 80)}`
      : "Verrouille d'abord le point faible identifié au dernier débrief.",
    target_count: 1,
    source_session_id: lastSession?.id ?? null,
    source_debrief_id: lastDebrief?.id ?? null,
  };
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`;
}

// --- Persistence ---

async function fetchExisting(
  userId: string,
  weekStart: string,
): Promise<WeeklyMilestoneRow | null> {
  const { data } = await supabase
    .from("weekly_milestones")
    .select("*")
    .eq("user_id", userId)
    .eq("week_start", weekStart)
    .maybeSingle();
  return (data as WeeklyMilestoneRow | null) ?? null;
}

async function insertNew(
  userId: string,
  weekStart: string,
  weekEnd: string,
  tpl: PickedTemplate,
): Promise<WeeklyMilestoneRow | null> {
  const { data } = await supabase
    .from("weekly_milestones")
    .insert({
      user_id: userId,
      week_start: weekStart,
      week_end: weekEnd,
      kind: tpl.kind,
      title: tpl.title,
      rationale: tpl.rationale,
      target_count: tpl.target_count,
      status: "not_started",
      source_session_id: tpl.source_session_id,
      source_debrief_id: tpl.source_debrief_id,
    })
    .select("*")
    .maybeSingle();
  return (data as WeeklyMilestoneRow | null) ?? null;
}

async function updateStatus(
  rowId: string,
  status: MilestoneStatus,
  reachedAt: string | null,
): Promise<void> {
  await supabase
    .from("weekly_milestones")
    .update({ status, reached_at: reachedAt })
    .eq("id", rowId);
}

// --- Public API ---

/**
 * Read the milestone for the current week, generating it on first visit.
 * Stable for the whole week: only `status` updates afterwards.
 *
 * Special cases:
 *  - Live in progress → effective status forced to "paused" (row untouched).
 *  - No ended session at all in the recent window → returns null (the
 *    inactivity relance block owns that surface, not the milestone).
 */
export async function getOrCreateCurrentWeekMilestone(
  userId: string,
  current: LiveSession | null,
  recentSessions: LiveSession[],
  recentDebriefs: Map<string, LiveDebrief>,
): Promise<MilestoneView | null> {
  const { start, end } = currentWeekBounds();

  let row = await fetchExisting(userId, start);

  if (!row) {
    // Hand off to the inactivity relance block when there is literally no
    // recent activity. The milestone is for users with at least some signal.
    if (recentSessions.length === 0) return null;

    const tpl = pickTemplate({ recentSessions, recentDebriefs });
    row = await insertNew(userId, start, end, tpl);
    if (!row) return null;
  }

  // Count ended sessions inside the milestone window.
  const startMs = new Date(`${start}T00:00:00Z`).getTime();
  const endMs = new Date(`${end}T23:59:59Z`).getTime();
  const doneCount = recentSessions.filter((s) => {
    if (s.status !== "ended") return false;
    const t = new Date(s.ended_at ?? s.started_at).getTime();
    return t >= startMs && t <= endMs;
  }).length;

  // Reconcile status from data, not from UI clicks.
  let effectiveStatus: MilestoneStatus = row.status;
  if (current) {
    effectiveStatus = "paused";
  } else if (doneCount >= row.target_count) {
    effectiveStatus = "reached";
  } else if (doneCount > 0) {
    effectiveStatus = "in_progress";
  } else {
    effectiveStatus = "not_started";
  }

  // Persist the transition only when the row in DB is out of date and we are
  // not in the transient "paused" state (paused must not overwrite real data).
  if (
    effectiveStatus !== "paused" &&
    effectiveStatus !== row.status
  ) {
    const reachedAt =
      effectiveStatus === "reached"
        ? row.reached_at ?? new Date().toISOString()
        : null;
    await updateStatus(row.id, effectiveStatus, reachedAt);
    row = { ...row, status: effectiveStatus, reached_at: reachedAt };
  }

  return { row, effectiveStatus, doneCount };
}
