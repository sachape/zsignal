import type { AnalysisReport, ChannelFact } from "@/types/analysis";

/**
 * "Mode reconstruction" — activates when a channel has no recent streams or
 * not enough activity to produce a meaningful diagnosis. The result page
 * swaps generic optimisation copy for honest "rebuild a base" framing.
 *
 * Activation rules (any one is enough):
 *  - 0 streams detected over 30 days
 *  - < 2 streams AND avg viewers < 1 (no interpretable signal)
 *  - 0 unique stream days AND total hours = 0
 */

const num = (facts: ChannelFact[], key: string): number => {
  const f = facts.find((x) => x.key === key);
  return typeof f?.value === "number" ? f.value : Number(f?.value ?? 0) || 0;
};

export interface LowSignalDiagnosis {
  isActive: boolean;
  streams30d: number;
  uniqueDays30d: number;
  avgViewers: number;
  /** True when avg viewers can't be meaningfully interpreted. */
  viewersUnmeasurable: boolean;
}

export function diagnoseLowSignal(report: AnalysisReport): LowSignalDiagnosis {
  const facts = report.facts;
  const streams30d = num(facts, "streams_30d");
  const uniqueDays30d = num(facts, "unique_stream_days_30d");
  const totalHours = num(facts, "total_hours_30d");
  const avgViewers = num(facts, "avg_viewers");

  // Partners and large channels are never in low-signal mode.
  // Public lookups don't return stream history, which would produce false
  // positives for well-established channels like Inoxtag.
  const summary = report.channel_summary;
  const isEstablished =
    summary.broadcaster_type === "partner" || summary.follower_count >= 50_000;
  if (isEstablished) {
    return { isActive: false, streams30d, uniqueDays30d, avgViewers, viewersUnmeasurable: false };
  }

  const noStreams = streams30d === 0;
  const almostNoStreams = streams30d < 2 && avgViewers < 1;
  const noActivity = uniqueDays30d === 0 && totalHours === 0;

  const isActive = noStreams || almostNoStreams || noActivity;
  const viewersUnmeasurable = isActive || avgViewers < 1;

  return { isActive, streams30d, uniqueDays30d, avgViewers, viewersUnmeasurable };
}
