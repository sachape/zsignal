// Last live vs recent baseline — sober comparison for the cockpit.
//
// Goal: answer "is my last live above / below / in line with my recent base?"
// in one short sentence + up to 3 micro-lines, nothing more.
//
// Rules:
//  - Need at least 3 ended sessions WITH debriefs to build a baseline
//    (last + 2 previous). Below that: low_signal.
//  - Compare on score_hold, score_start, duration_minutes — that order
//    of priority for the headline.
//  - Internal thresholds stay invisible to the UI: ±5 pts on sub-scores,
//    ±15% on duration. No numbers exposed in copy.
//  - No global score in headline (kept only as fallback).

import type { LiveDebrief, LiveSession } from "@/services/liveSessions";

export type ComparisonState =
  | "in_live"
  | "no_data"
  | "low_signal"
  | "ready";

export type Direction = "above" | "below" | "near";

export interface MicroLine {
  label: "Tenue" | "Démarrage" | "Durée";
  direction: Direction;
  text: string;
}

export interface ComparisonReadout {
  state: ComparisonState;
  /** Single short sentence. Always present in `ready` and `low_signal`. */
  headline: string;
  /** Up to 3 micro-lines, only when state === "ready". */
  micro: MicroLine[];
}

interface BuildInput {
  current: LiveSession | null;
  /** Ended sessions, most recent first. */
  recentSessions: LiveSession[];
  recentDebriefs: Map<string, LiveDebrief>;
}

const MIN_BASELINE = 2; // need ≥2 previous sessions to form a baseline
const SCORE_DELTA = 5; // sub-score points to qualify above/below
const DURATION_DELTA_RATIO = 0.15; // ±15% on duration

function avg(nums: number[]): number | null {
  const filtered = nums.filter((n) => Number.isFinite(n));
  if (filtered.length === 0) return null;
  return filtered.reduce((a, b) => a + b, 0) / filtered.length;
}

function classifyScore(latest: number, baseline: number): Direction {
  const delta = latest - baseline;
  if (delta >= SCORE_DELTA) return "above";
  if (delta <= -SCORE_DELTA) return "below";
  return "near";
}

function classifyDuration(latest: number, baseline: number): Direction {
  if (baseline <= 0) return "near";
  const ratio = (latest - baseline) / baseline;
  if (ratio >= DURATION_DELTA_RATIO) return "above";
  if (ratio <= -DURATION_DELTA_RATIO) return "below";
  return "near";
}

function microFor(label: MicroLine["label"], dir: Direction): MicroLine {
  const COPY: Record<MicroLine["label"], Record<Direction, string>> = {
    Tenue: {
      above: "meilleure que sur tes derniers lives",
      below: "plus faible que sur tes derniers lives",
      near: "stable par rapport à tes derniers lives",
    },
    Démarrage: {
      above: "plus accroché que d'habitude",
      below: "un peu plus faible que d'habitude",
      near: "dans la moyenne récente",
    },
    Durée: {
      above: "session plus longue que d'habitude",
      below: "session plus courte que d'habitude",
      near: "durée proche de tes derniers lives",
    },
  };
  return { label, direction: dir, text: COPY[label][dir] };
}

function buildHeadline(holdDir: Direction, startDir: Direction): string {
  // Priority: hold first, then start. Default to "in line with base".
  if (holdDir === "above") {
    return "Ton dernier live a mieux tenu que ta moyenne récente.";
  }
  if (holdDir === "below") {
    return "Ton dernier live a moins bien tenu que ta moyenne récente.";
  }
  if (startDir === "above") {
    return "Le démarrage de ton dernier live a mieux accroché que d'habitude.";
  }
  if (startDir === "below") {
    return "Le démarrage reste un peu plus faible que sur tes derniers lives.";
  }
  return "Ce live reste globalement dans ta base récente.";
}

export function buildLastVsAverage(input: BuildInput): ComparisonReadout {
  if (input.current) {
    return {
      state: "in_live",
      headline: "La comparaison sera disponible à la fin du live.",
      micro: [],
    };
  }

  const sessions = input.recentSessions.slice(0, 6);
  if (sessions.length === 0) {
    return { state: "no_data", headline: "", micro: [] };
  }

  const debriefs: LiveDebrief[] = sessions
    .map((s) => input.recentDebriefs.get(s.id))
    .filter((d): d is LiveDebrief => Boolean(d));

  const lastDebrief = debriefs[0] ?? null;
  const lastSession = sessions[0];
  const previousDebriefs = debriefs.slice(1);
  const previousSessions = sessions.slice(1);

  const enoughBaseline =
    previousDebriefs.length >= MIN_BASELINE &&
    lastDebrief !== null &&
    lastDebrief.has_enough_signal !== false;

  if (!enoughBaseline) {
    return {
      state: "low_signal",
      headline: "Pas encore assez de recul pour comparer ce live à une base fiable.",
      micro: [],
    };
  }

  // --- Score sub-metrics ---
  const baselineHold = avg(
    previousDebriefs
      .map((d) => d.score_hold)
      .filter((v): v is number => typeof v === "number"),
  );
  const baselineStart = avg(
    previousDebriefs
      .map((d) => d.score_start)
      .filter((v): v is number => typeof v === "number"),
  );

  const holdDir: Direction =
    baselineHold !== null && lastDebrief.score_hold !== null
      ? classifyScore(lastDebrief.score_hold!, baselineHold)
      : "near";
  const startDir: Direction =
    baselineStart !== null && lastDebrief.score_start !== null
      ? classifyScore(lastDebrief.score_start!, baselineStart)
      : "near";

  // --- Duration ---
  const baselineDuration = avg(
    previousSessions
      .map((s) => s.duration_minutes ?? 0)
      .filter((v) => v > 0),
  );
  const lastDuration = lastSession.duration_minutes ?? 0;
  const durationDir: Direction =
    baselineDuration !== null && lastDuration > 0
      ? classifyDuration(lastDuration, baselineDuration)
      : "near";

  // Build micro lines (priority: Tenue → Démarrage → Durée). Skip "near"
  // micro-lines if we already have 2 directional ones, to keep it scannable.
  const micros: MicroLine[] = [];
  micros.push(microFor("Tenue", holdDir));
  micros.push(microFor("Démarrage", startDir));
  micros.push(microFor("Durée", durationDir));

  return {
    state: "ready",
    headline: buildHeadline(holdDir, startDir),
    micro: micros.slice(0, 3),
  };
}
