// Weekly plan aggregator — single source of truth for the /plan page.
//
// Role: turn the existing live-side signals into ONE coherent execution
// view with 3 blocks max:
//   1. Priority of the week  (what to fix or confirm)
//   2. Sequence of actions   (≤3 short imperatives)
//   3. Point to watch        (one secondary read)
//
// Strict rules:
//  - Reuse existing services. No new heuristics, no new metrics.
//  - One dominant direction. Never contradict the cockpit slot.
//  - Honest fallbacks when signal is thin or activity is missing.
//  - No analytics, no scores in the copy.

import type { LiveDebrief, LiveSession } from "@/services/liveSessions";
import {
  buildInactivityRelance,
  type InactivityState,
} from "@/services/inactivityRelance";
import {
  buildLastVsAverage,
  type ComparisonReadout,
} from "@/services/lastVsAverage";
import {
  buildPreLiveChecklist,
  type PreLiveChecklist,
} from "@/services/prelive";
import {
  buildSmartAlerts,
  type AlertsState,
  type SmartAlert,
} from "@/services/smartAlerts";
import type { MilestoneView } from "@/services/weeklyMilestone";

export type WeeklyPlanState =
  | "in_live"
  | "no_history"
  | "inactivity"
  | "low_signal"
  | "ready";

export interface WeeklyPlanPriority {
  title: string;
  detail: string | null;
}

export interface WeeklyPlanWatch {
  text: string;
}

export interface WeeklyPlanView {
  state: WeeklyPlanState;
  /** Heading shown above the priority block. Always present. */
  contextLabel: string;
  /** Block 1 — priority. Null only in `in_live`. */
  priority: WeeklyPlanPriority | null;
  /** Block 2 — up to 3 short imperatives. */
  actions: string[];
  /** Block 3 — one short watch line, or null if nothing useful to surface. */
  watch: WeeklyPlanWatch | null;
}

interface BuildInput {
  current: LiveSession | null;
  recentSessions: LiveSession[]; // ended, most recent first
  recentDebriefs: Map<string, LiveDebrief>;
  /** Already-resolved milestone for the current week (or null). */
  milestone: MilestoneView | null;
}

// --- Helpers ---------------------------------------------------------------

function dedupe(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const k = raw.trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(raw.trim());
  }
  return out;
}

function pickWatch(
  alerts: AlertsState,
  comparison: ComparisonReadout,
): WeeklyPlanWatch | null {
  // Prefer a real alert when there is one (degradation > progression).
  if (alerts.state === "ready") {
    const ranked: SmartAlert[] = [...alerts.alerts].sort((a, b) => {
      const order: Record<string, number> = {
        degradation: 0,
        vigilance: 1,
        progression: 2,
        low_signal: 3,
      };
      return (order[a.kind] ?? 9) - (order[b.kind] ?? 9);
    });
    const top = ranked[0];
    if (top && top.kind !== "low_signal") {
      return { text: top.title };
    }
  }
  // Fall back to the comparison readout when ready.
  if (comparison.state === "ready" && comparison.headline) {
    return { text: comparison.headline };
  }
  // Honest "not enough signal yet" message.
  if (
    comparison.state === "low_signal" ||
    (alerts.state === "ready" && alerts.alerts[0]?.kind === "low_signal")
  ) {
    return {
      text: "Pas encore assez de recul pour une lecture plus fine.",
    };
  }
  return null;
}

// --- Block builders --------------------------------------------------------

function buildPriorityFromMilestone(
  milestone: MilestoneView,
  lastDebrief: LiveDebrief | null,
): WeeklyPlanPriority {
  const { row, effectiveStatus } = milestone;
  if (effectiveStatus === "reached") {
    return {
      title: "Cap de la semaine atteint.",
      detail: "Garde la même direction sur ton prochain live.",
    };
  }
  // Use the milestone title as the priority — it already encodes the
  // dominant direction (reconstruction / stabilization / confirmation).
  const detail =
    row.kind === "stabilization" && lastDebrief?.priority_action
      ? lastDebrief.priority_action
      : row.rationale;
  return { title: row.title, detail };
}

function buildActionsFromChecklist(
  checklist: PreLiveChecklist,
  lastDebrief: LiveDebrief | null,
): string[] {
  if (checklist.state === "ready" || checklist.state === "low_signal") {
    const base = [...checklist.items];
    // Promote priority_action to the top when it exists and is not redundant.
    if (
      checklist.state === "ready" &&
      lastDebrief?.priority_action &&
      lastDebrief.priority_action.length > 0
    ) {
      base.unshift(lastDebrief.priority_action);
    }
    return dedupe(base).slice(0, 3);
  }
  return [];
}

// --- Public API ------------------------------------------------------------

/**
 * Build the weekly plan view from already-loaded live signals.
 * Pure function — does no I/O.
 */
export function buildWeeklyPlan(input: BuildInput): WeeklyPlanView {
  const { current, recentSessions, recentDebriefs, milestone } = input;

  // ---------- State 1: live in progress ----------
  if (current) {
    return {
      state: "in_live",
      contextLabel: "Live en cours",
      priority: null,
      actions: [],
      watch: {
        text: "Le plan de la semaine sera mis à jour à la fin de cette session.",
      },
    };
  }

  const ended = recentSessions.filter((s) => s.status === "ended");
  const lastSession = ended[0] ?? null;
  const lastDebrief = lastSession
    ? recentDebriefs.get(lastSession.id) ?? null
    : null;

  // ---------- State 2: no history at all ----------
  if (ended.length === 0) {
    return {
      state: "no_history",
      contextLabel: "Reprise",
      priority: {
        title: "Lance un premier live pour activer ton plan.",
        detail:
          "Streamnco commencera à lire ta chaîne dès la première session complète.",
      },
      actions: [
        "Bloque un créneau réaliste cette semaine.",
        "Garde un format simple pour ton premier live.",
        "Vise une session complète plutôt que parfaite.",
      ],
      watch: null,
    };
  }

  // Build the supporting reads we need for state routing.
  const inactivity: InactivityState = buildInactivityRelance(
    current,
    recentSessions,
  );
  const checklist = buildPreLiveChecklist(current, lastSession, lastDebrief);
  const comparison = buildLastVsAverage({
    current,
    recentSessions: ended,
    recentDebriefs,
  });
  const alerts = buildSmartAlerts({
    current,
    recentSessions: ended,
    recentDebriefs,
  });

  // ---------- State 3: inactivity (≥7 days) ----------
  if (inactivity.tier !== "active") {
    const isRebuild = inactivity.tier === "rebuild";
    return {
      state: "inactivity",
      contextLabel: isRebuild ? "Reconstruction" : "Reprise",
      priority: {
        title: isRebuild
          ? "Recréer une base exploitable cette semaine."
          : "Relancer une cadence simple cette semaine.",
        detail: isRebuild
          ? "Pas besoin de viser haut tout de suite. Rejoue une session complète et lisible."
          : "Une session complète suffit pour relancer la lecture de ta chaîne.",
      },
      actions: dedupe([
        "Bloque un créneau clair cette semaine.",
        "Garde un format simple et reconnaissable.",
        isRebuild
          ? "Vise une session complète, sans test de format."
          : "Garde une durée réaliste pour cette reprise.",
      ]).slice(0, 3),
      watch: {
        text:
          inactivity.tier === "rebuild"
            ? "Le suivi reprendra dès la prochaine session complète."
            : "Une session suffira à relancer la lecture de ta progression.",
      },
    };
  }

  // ---------- State 4: low signal ----------
  // No milestone (handed off) OR very thin debrief data → reconstruction tone.
  const hasUsableSignal =
    lastDebrief !== null && lastDebrief.has_enough_signal !== false;
  if (!milestone && !hasUsableSignal) {
    return {
      state: "low_signal",
      contextLabel: "Base à consolider",
      priority: {
        title: "Refaire une session complète pour produire du signal exploitable.",
        detail: "On évite d'optimiser tant que la lecture n'est pas fiable.",
      },
      actions:
        checklist.state !== "no_live" && checklist.items.length > 0
          ? checklist.items.slice(0, 3)
          : [
              "Planifie un prochain live clair.",
              "Vise une session simple mais complète.",
              "Ne change pas de format avant d'avoir une base lisible.",
            ],
      watch: {
        text: "Pas encore assez de recul pour une lecture plus fine.",
      },
    };
  }

  // ---------- State 5: ready (normal plan) ----------
  const priority: WeeklyPlanPriority = milestone
    ? buildPriorityFromMilestone(milestone, lastDebrief)
    : {
        title: "Confirmer la direction prise sur ton dernier live.",
        detail:
          lastDebrief?.priority_action ??
          "Garde le format qui a le mieux fonctionné récemment.",
      };

  const actions = buildActionsFromChecklist(checklist, lastDebrief);
  const watch = pickWatch(alerts, comparison);

  return {
    state: "ready",
    contextLabel: "Plan de la semaine",
    priority,
    actions,
    watch,
  };
}
