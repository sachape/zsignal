// Smart alerts — deterministic, prudent V1.
//
// Goal: surface 1, max 2 alerts in the cockpit, based only on the last
// few sessions and their debriefs. No prediction, no benchmark, no AI.
//
// Hierarchy when picking what to show:
//   1. degradation (hold / start trending down)
//   2. progression (hold / start trending up)
//   3. low signal (not enough sessions or flagged debrief)
//   4. simple vigilance (short sessions, regularity hint)
//
// Anything we cannot back with at least 3 ended sessions degrades to a
// "not enough recent activity" alert. We never invent.

import type { LiveDebrief, LiveSession } from "@/services/liveSessions";

export type AlertKind =
  | "degradation"
  | "progression"
  | "low_signal"
  | "vigilance";

export type AlertTone = "positive" | "warning" | "neutral";

export interface SmartAlert {
  id: string;
  kind: AlertKind;
  tone: AlertTone;
  title: string;
  description?: string;
}

export type AlertsState =
  | { state: "in_live" }
  | { state: "no_recent_live" }
  | { state: "ready"; alerts: SmartAlert[] };

interface BuildInput {
  current: LiveSession | null;
  recentSessions: LiveSession[]; // ended, most recent first
  recentDebriefs: Map<string, LiveDebrief>; // keyed by live_session_id
}

const MIN_SESSIONS_FOR_TREND = 3;
const TREND_DELTA_POINTS = 8; // minimum points of swing to call a trend
const SHORT_SESSION_MIN = 25; // minutes — below = "trop court"

function avg(nums: number[]): number | null {
  const filtered = nums.filter((n) => Number.isFinite(n));
  if (filtered.length === 0) return null;
  return filtered.reduce((a, b) => a + b, 0) / filtered.length;
}

/** Compare the most recent debrief vs the average of the previous ones. */
function trendOn(
  metric: "score_hold" | "score_start" | "overall_score",
  debriefs: LiveDebrief[],
): { delta: number; latest: number; baseline: number } | null {
  const values = debriefs
    .map((d) => d[metric])
    .filter((v): v is number => typeof v === "number");
  if (values.length < MIN_SESSIONS_FOR_TREND) return null;
  const latest = values[0];
  const baseline = avg(values.slice(1));
  if (baseline === null) return null;
  return { delta: latest - baseline, latest, baseline };
}

export function buildSmartAlerts(input: BuildInput): AlertsState {
  if (input.current) return { state: "in_live" };

  const sessions = input.recentSessions.slice(0, 5);
  if (sessions.length === 0) return { state: "no_recent_live" };

  // Ordered debriefs aligned with sessions (most recent first).
  const debriefs: LiveDebrief[] = sessions
    .map((s) => input.recentDebriefs.get(s.id))
    .filter((d): d is LiveDebrief => Boolean(d));

  // ---------- LOW SIGNAL guard ----------
  // Not enough ended sessions, or last debrief flagged thin signal, or no
  // debriefs at all → single honest alert.
  const lastDebrief = debriefs[0] ?? null;
  if (
    sessions.length < MIN_SESSIONS_FOR_TREND ||
    debriefs.length < MIN_SESSIONS_FOR_TREND ||
    (lastDebrief && lastDebrief.has_enough_signal === false)
  ) {
    return {
      state: "ready",
      alerts: [
        {
          id: "low-signal",
          kind: "low_signal",
          tone: "neutral",
          title: "Pas encore assez de recul pour une vraie tendance.",
          description:
            "Encore quelques lives et StreamPulse pourra faire ressortir une alerte fiable.",
        },
      ],
    };
  }

  const alerts: SmartAlert[] = [];

  // ---------- DEGRADATION ----------
  const holdTrend = trendOn("score_hold", debriefs);
  const startTrend = trendOn("score_start", debriefs);
  const overallTrend = trendOn("overall_score", debriefs);

  if (holdTrend && holdTrend.delta <= -TREND_DELTA_POINTS) {
    alerts.push({
      id: "deg-hold",
      kind: "degradation",
      tone: "warning",
      title: "La tenue baisse sur tes derniers lives.",
      description:
        "Tes sessions décrochent plus vite qu'avant. Ton prochain live sera utile pour confirmer.",
    });
  } else if (startTrend && startTrend.delta <= -TREND_DELTA_POINTS) {
    alerts.push({
      id: "deg-start",
      kind: "degradation",
      tone: "warning",
      title: "Le démarrage reste fragile sur plusieurs lives.",
      description:
        "Les premières minutes pèsent lourd. Une intro plus claire peut suffire à inverser la tendance.",
    });
  }

  // ---------- PROGRESSION ----------
  if (alerts.length === 0) {
    if (holdTrend && holdTrend.delta >= TREND_DELTA_POINTS) {
      alerts.push({
        id: "prog-hold",
        kind: "progression",
        tone: "positive",
        title: "Ton dernier live a mieux tenu que les précédents.",
        description:
          "La seconde moitié décroche moins vite. Garde ce format encore quelques sessions.",
      });
    } else if (startTrend && startTrend.delta >= TREND_DELTA_POINTS) {
      alerts.push({
        id: "prog-start",
        kind: "progression",
        tone: "positive",
        title: "Le démarrage s'améliore légèrement sur tes dernières sessions.",
        description:
          "Les premières minutes accrochent un peu mieux. Continue avec la même structure.",
      });
    } else if (overallTrend && overallTrend.delta >= TREND_DELTA_POINTS) {
      alerts.push({
        id: "prog-overall",
        kind: "progression",
        tone: "positive",
        title: "Tu retrouves un peu plus de stabilité.",
        description:
          "Tes derniers lives sont au-dessus de ta moyenne récente.",
      });
    }
  }

  // ---------- VIGILANCE (secondary, max 1) ----------
  if (alerts.length < 2) {
    const durations = sessions
      .map((s) => s.duration_minutes ?? 0)
      .filter((d) => d > 0);
    const avgDuration = avg(durations);
    const tooShort =
      avgDuration !== null &&
      avgDuration < SHORT_SESSION_MIN &&
      durations.length >= MIN_SESSIONS_FOR_TREND;

    if (tooShort) {
      alerts.push({
        id: "vig-short",
        kind: "vigilance",
        tone: "warning",
        title: "Tes dernières sessions sont trop courtes pour produire assez de signal.",
        description: "Vise une session plus complète avant de tester autre chose.",
      });
    }
  }

  // ---------- Fallback vigilance if nothing fired ----------
  if (alerts.length === 0) {
    alerts.push({
      id: "vig-confirm",
      kind: "vigilance",
      tone: "neutral",
      title: "Ton prochain live sera utile pour confirmer la tendance.",
      description:
        "Rien d'inquiétant ni de spectaculaire dans tes derniers lives. On surveille.",
    });
  }

  return { state: "ready", alerts: alerts.slice(0, 2) };
}
