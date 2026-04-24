import type { AnalysisReport } from "@/types/analysis";
import { diagnoseLowSignal } from "./lowSignalMode";
import { diagnoseFoundationMode } from "./foundationMode";

/**
 * Unified display mode for a report. Combines low-signal detection
 * (no/too-few streams → "reconstruction") with foundation-mode detection
 * (low data but not empty → "exploration"). Used by ResultPage / Dashboard
 * to gate punitive numeric displays on weak accounts.
 *
 * - reconstruction: no exploitable signal. Hide numeric score, hide
 *   milestones/competitors, switch to qualitative framing.
 * - exploration: partial signal. Show score with a "Estimation" badge,
 *   keep milestones but reframe the narrative.
 * - normal: enough signal, display as-is.
 */
export type AccountDisplayMode = "reconstruction" | "exploration" | "normal";

export interface DisplayModeResult {
  mode: AccountDisplayMode;
  reasons: string[];
  streams30d: number;
  uniqueDays30d: number;
  avgViewers: number;
}

export function getAccountDisplayMode(report: AnalysisReport): DisplayModeResult {
  const low = diagnoseLowSignal(report);
  const foundation = diagnoseFoundationMode(report);

  if (low.isActive) {
    return {
      mode: "reconstruction",
      reasons: foundation.reasons,
      streams30d: low.streams30d,
      uniqueDays30d: low.uniqueDays30d,
      avgViewers: low.avgViewers,
    };
  }

  if (foundation.isActive) {
    return {
      mode: "exploration",
      reasons: foundation.reasons,
      streams30d: low.streams30d,
      uniqueDays30d: low.uniqueDays30d,
      avgViewers: low.avgViewers,
    };
  }

  return {
    mode: "normal",
    reasons: [],
    streams30d: low.streams30d,
    uniqueDays30d: low.uniqueDays30d,
    avgViewers: low.avgViewers,
  };
}
