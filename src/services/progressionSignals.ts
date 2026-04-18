import type { SavedReport } from "./reportRepository";

export type SignalDirection = "improved" | "declined" | "blocked" | "stable";

export interface ProgressionSignal {
  label: string;
  direction: SignalDirection;
  detail: string;
}

function getMetric(report: SavedReport["report"], key: string): number {
  const f = report.facts.find((f) => f.key === key);
  return typeof f?.value === "number" ? f.value : 0;
}

/**
 * Build progression signals from a current vs previous saved report.
 * Returns max 3 signals, in priority order.
 */
export function buildProgressionSignals(
  current: SavedReport,
  previous: SavedReport | null,
): ProgressionSignal[] {
  const signals: ProgressionSignal[] = [];

  if (!previous) {
    return [
      {
        label: "Première analyse",
        direction: "stable",
        detail: "Les prochaines synchros révéleront ta progression.",
      },
    ];
  }

  const scoreDelta = current.report.score.overall - previous.report.score.overall;
  if (Math.abs(scoreDelta) >= 1) {
    signals.push({
      label: "StreamScore",
      direction: scoreDelta > 0 ? "improved" : "declined",
      detail:
        scoreDelta > 0
          ? `+${scoreDelta} points depuis la dernière analyse`
          : `${scoreDelta} points depuis la dernière analyse`,
    });
  }

  const streamsNow = getMetric(current.report, "streams_30d");
  const streamsBefore = getMetric(previous.report, "streams_30d");
  const streamsDelta = streamsNow - streamsBefore;
  if (streamsDelta !== 0) {
    signals.push({
      label: "Sessions sur 30j",
      direction: streamsDelta > 0 ? "improved" : "declined",
      detail:
        streamsDelta > 0
          ? `+${streamsDelta} sessions vs analyse précédente`
          : `${streamsDelta} sessions vs analyse précédente`,
    });
  }

  const clipsNow = getMetric(current.report, "clips_30d");
  const clipsBefore = getMetric(previous.report, "clips_30d");
  if (clipsNow - clipsBefore !== 0) {
    const delta = clipsNow - clipsBefore;
    signals.push({
      label: "Clips créés",
      direction: delta > 0 ? "improved" : "declined",
      detail: delta > 0 ? `+${delta} clips` : `${delta} clips`,
    });
  } else if (clipsNow < 2 && clipsBefore < 2) {
    signals.push({
      label: "Clips créés",
      direction: "blocked",
      detail: "Toujours sous 2 clips — levier de découvrabilité non activé",
    });
  }

  return signals.slice(0, 3);
}
