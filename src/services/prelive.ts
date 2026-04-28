// Pre-live checklist — deterministic mapping based on the last debrief.
//
// V1 rules:
//  - Source of truth = `live_debriefs` of the last ended session.
//  - Output is short (3 items max) + an optional one-line objective.
//  - No invented advice: if the signal is too thin, fall back to a
//    rebuild-style checklist that does not pretend to optimize anything.
//  - No coaching tone, no jargon. Each item is one short imperative.

import type { LiveDebrief, LiveSession } from "@/services/liveSessions";

export type PreLiveState =
  | "no_live"
  | "in_live"
  | "low_signal"
  | "ready";

export interface PreLiveChecklist {
  state: PreLiveState;
  /** Short imperative items, max 3. */
  items: string[];
  /** Optional one-line goal for the next stream. */
  objective: string | null;
}

type WeaknessKind = "regularity" | "start" | "hold" | "structure" | "unknown";

/**
 * Heuristic mapping from the debrief into one of four blocker families.
 * We use both the structured sub-scores (start / hold / structure) and
 * keyword hints from the debrief text to stay robust.
 */
function classifyWeakness(debrief: LiveDebrief): WeaknessKind {
  const text = `${debrief.weakness ?? ""} ${debrief.priority_action ?? ""}`
    .toLowerCase();

  // Regularity hints take priority — they trump per-session signals.
  if (
    /régul|rythme|cadence|créneau|fréquence|pause|inactif|irrég/.test(text)
  ) {
    return "regularity";
  }

  // Otherwise rely on the lowest sub-score when available.
  const start = debrief.score_start ?? null;
  const hold = debrief.score_hold ?? null;
  const structure = debrief.score_structure ?? null;
  const subs = [
    { kind: "start" as const, score: start },
    { kind: "hold" as const, score: hold },
    { kind: "structure" as const, score: structure },
  ].filter((s): s is { kind: WeaknessKind; score: number } => s.score !== null);

  if (subs.length > 0) {
    subs.sort((a, b) => a.score - b.score);
    return subs[0].kind;
  }

  // Last-resort keyword routing.
  if (/début|démarr|première|opening|intro/.test(text)) return "start";
  if (/tien|tenu|chute|décroch|seconde moitié|fin/.test(text)) return "hold";
  if (/structure|format|séquence|plan/.test(text)) return "structure";

  return "unknown";
}

function buildItemsForKind(kind: WeaknessKind): {
  items: string[];
  objective: string | null;
} {
  switch (kind) {
    case "regularity":
      return {
        items: [
          "Bloque ton prochain créneau avant de lancer le live.",
          "Garde une durée simple et réaliste.",
          "Ne change pas de format avant d'avoir relancé un rythme stable.",
        ],
        objective: "Objectif du prochain live : reposer une cadence stable.",
      };
    case "start":
      return {
        items: [
          "Prépare les 15 premières minutes.",
          "Lance le live avec un sujet clair.",
          "Évite un début trop lent ou improvisé.",
        ],
        objective: "Objectif du prochain live : mieux tenir le démarrage.",
      };
    case "hold":
      return {
        items: [
          "Prépare 2 séquences fortes pour la seconde moitié.",
          "Garde un rythme plus resserré.",
          "Réduis la durée si la traction retombe trop vite.",
        ],
        objective: "Objectif du prochain live : mieux tenir la première moitié.",
      };
    case "structure":
      return {
        items: [
          "Pose 2 ou 3 temps forts avant de lancer.",
          "Garde un format simple et reconnaissable.",
          "Rejoue ce qui a le mieux tenu la fois précédente.",
        ],
        objective: "Objectif du prochain live : un format plus lisible.",
      };
    default:
      // Unknown → minimal, never invented.
      return {
        items: [
          "Vérifie ton titre et ta catégorie avant de lancer.",
          "Garde un format simple.",
          "Vise une session complète avant de tester autre chose.",
        ],
        objective: null,
      };
  }
}

function buildLowSignalChecklist(): PreLiveChecklist {
  // Reconstruction tone — no optimization promise.
  return {
    state: "low_signal",
    items: [
      "Planifie un prochain live clair.",
      "Vise une session simple mais complète.",
      "Recrée d'abord une base de diffusion régulière.",
    ],
    objective: null,
  };
}

/**
 * Build the pre-live checklist for the cockpit, given the live snapshot.
 *
 * @param current  The currently open live session, if any.
 * @param last     The last ended session, if any.
 * @param debrief  The debrief attached to `last`, if available.
 */
export function buildPreLiveChecklist(
  current: LiveSession | null,
  last: LiveSession | null,
  debrief: LiveDebrief | null,
): PreLiveChecklist {
  if (current) {
    return { state: "in_live", items: [], objective: null };
  }
  if (!last || !debrief) {
    return { state: "no_live", items: [], objective: null };
  }
  if (debrief.has_enough_signal === false) {
    return buildLowSignalChecklist();
  }
  const kind = classifyWeakness(debrief);
  const { items, objective } = buildItemsForKind(kind);
  return { state: "ready", items, objective };
}
