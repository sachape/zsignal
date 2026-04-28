// Weekly milestone — deterministic 7-day cap derived from recent activity.
//
// V1 design rules:
//  - One milestone at a time. No multi-goal, no gamification.
//  - Built only from existing live_sessions / live_debriefs.
//  - Hierarchy: low_signal → degradation → progression → continuity.
//  - "Reached" only when we can prove it from data within the 7-day window.
//  - Never invent. If we can't justify it, fall back to a rebuild milestone.

import type { LiveDebrief, LiveSession } from "@/services/liveSessions";

export type MilestoneKind =
  | "rebuild" // not enough signal / few sessions
  | "stabilize" // degradation pattern
  | "confirm" // progression detected
  | "continuity"; // nothing remarkable, keep going

export type MilestoneStatus =
  | "in_progress"
  | "on_track"
  | "reached"
  | "in_live"
  | "no_recent_live";

export interface WeeklyMilestone {
  kind: MilestoneKind;
  status: MilestoneStatus;
  /** Main one-liner cap. */
  title: string;
  /** Short justification (1 line max). */
  rationale: string;
  /** Light progress label, e.g. "1/2 lives détectés". */
  progressLabel: string;
}

interface BuildInput {
  current: LiveSession | null;
  /** Ended sessions in the last ~14 days, most recent first. */
  recentSessions: LiveSession[];
  recentDebriefs: Map<string, LiveDebrief>;
}

const WINDOW_DAYS = 7;
const MIN_SESSIONS_FOR_TREND = 3;
const TREND_DELTA_POINTS = 8;
const COMPLETE_SESSION_MIN = 25; // minutes — below = "trop court"
const REBUILD_TARGET = 2; // 2 complete sessions to validate rebuild

function avg(nums: number[]): number | null {
  const filtered = nums.filter((n) => Number.isFinite(n));
  if (filtered.length === 0) return null;
  return filtered.reduce((a, b) => a + b, 0) / filtered.length;
}

function withinDays(iso: string, days: number): boolean {
  const t = new Date(iso).getTime();
  return Date.now() - t <= days * 24 * 60 * 60 * 1000;
}

function trendOn(
  metric: "score_hold" | "score_start" | "overall_score",
  debriefs: LiveDebrief[],
): number | null {
  const values = debriefs
    .map((d) => d[metric])
    .filter((v): v is number => typeof v === "number");
  if (values.length < MIN_SESSIONS_FOR_TREND) return null;
  const latest = values[0];
  const baseline = avg(values.slice(1));
  if (baseline === null) return null;
  return latest - baseline;
}

export function buildWeeklyMilestone(input: BuildInput): WeeklyMilestone {
  // CASE — live in progress (informational).
  if (input.current) {
    return {
      kind: "continuity",
      status: "in_live",
      title: "Ton live est en cours.",
      rationale:
        "La milestone de la semaine sera réévaluée à la fin de cette session.",
      progressLabel: "Évaluation en pause",
    };
  }

  const sessions = input.recentSessions;
  const sessionsThisWeek = sessions.filter((s) =>
    withinDays(s.started_at, WINDOW_DAYS),
  );
  const completeThisWeek = sessionsThisWeek.filter(
    (s) => (s.duration_minutes ?? 0) >= COMPLETE_SESSION_MIN,
  );

  // CASE — no recent live at all.
  if (sessions.length === 0) {
    return {
      kind: "rebuild",
      status: "no_recent_live",
      title: "Lance un premier live cette semaine.",
      rationale: "StreamPulse a besoin d'au moins une session pour t'orienter.",
      progressLabel: "0/1 live détecté",
    };
  }

  // Aligned debriefs (most recent first).
  const debriefs: LiveDebrief[] = sessions
    .map((s) => input.recentDebriefs.get(s.id))
    .filter((d): d is LiveDebrief => Boolean(d));
  const lastDebrief = debriefs[0] ?? null;

  // CASE — low signal: rebuild milestone (2 complete sessions / 7 days).
  const lowSignal =
    sessions.length < MIN_SESSIONS_FOR_TREND ||
    debriefs.length < MIN_SESSIONS_FOR_TREND ||
    (lastDebrief && lastDebrief.has_enough_signal === false);

  if (lowSignal) {
    const done = completeThisWeek.length;
    const status: MilestoneStatus =
      done >= REBUILD_TARGET
        ? "reached"
        : done >= 1
          ? "on_track"
          : "in_progress";
    return {
      kind: "rebuild",
      status,
      title:
        status === "reached"
          ? "Cap atteint cette semaine."
          : "Lance 2 sessions complètes pour produire une base exploitable.",
      rationale:
        status === "reached"
          ? "StreamPulse préparera le prochain cap à partir de tes prochains lives."
          : "Tes derniers lives manquent encore de signal stable.",
      progressLabel: `${done}/${REBUILD_TARGET} lives complets cette semaine`,
    };
  }

  // From here we have enough signal to read trends.
  const holdTrend = trendOn("score_hold", debriefs);
  const startTrend = trendOn("score_start", debriefs);
  const overallTrend = trendOn("overall_score", debriefs);

  // CASE — degradation → stabilize.
  if (
    (holdTrend !== null && holdTrend <= -TREND_DELTA_POINTS) ||
    (startTrend !== null && startTrend <= -TREND_DELTA_POINTS)
  ) {
    const focusStart =
      startTrend !== null &&
      startTrend <= -TREND_DELTA_POINTS &&
      (holdTrend === null || startTrend <= holdTrend);

    const done = sessionsThisWeek.length;
    const status: MilestoneStatus = done >= 1 ? "on_track" : "in_progress";
    return {
      kind: "stabilize",
      status,
      title: focusStart
        ? "Stabilise le démarrage sur ton prochain live."
        : "Confirme une meilleure tenue sur ta prochaine session.",
      rationale: focusStart
        ? "Les premières minutes pèsent lourd dans la lecture du live."
        : "La tenue a baissé récemment, c'est le point à reverrouiller.",
      progressLabel: `${done}/1 live cette semaine`,
    };
  }

  // CASE — progression → confirm.
  if (
    (holdTrend !== null && holdTrend >= TREND_DELTA_POINTS) ||
    (startTrend !== null && startTrend >= TREND_DELTA_POINTS) ||
    (overallTrend !== null && overallTrend >= TREND_DELTA_POINTS)
  ) {
    const done = sessionsThisWeek.length;
    const status: MilestoneStatus = done >= 1 ? "on_track" : "in_progress";
    return {
      kind: "confirm",
      status,
      title: "Confirme cette amélioration sur ton prochain live.",
      rationale: "Une bonne session récente, à valider sur la suivante.",
      progressLabel: `${done}/1 live cette semaine`,
    };
  }

  // CASE — continuity: keep cadence.
  const done = completeThisWeek.length;
  const status: MilestoneStatus =
    done >= REBUILD_TARGET
      ? "reached"
      : done >= 1
        ? "on_track"
        : "in_progress";
  return {
    kind: "continuity",
    status,
    title:
      status === "reached"
        ? "Cadence tenue cette semaine."
        : "Retrouve une cadence simple et lisible cette semaine.",
    rationale:
      status === "reached"
        ? "Continue sur cette base, le prochain cap arrivera naturellement."
        : "La régularité reste ton premier point d'appui.",
    progressLabel: `${done}/${REBUILD_TARGET} lives complets cette semaine`,
  };
}
