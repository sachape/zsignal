// StreamScore engine — thin wrapper that delegates to the shared Deno-
// compatible implementation so backend automations and the dashboard
// always produce identical scores.

import {
  computeStreamScore as sharedComputeStreamScore,
  getMaturityCap,
  type SharedChannelFact,
  type SharedStreamScore,
} from "../../supabase/functions/_shared/streamScoreEngine";
import type { ChannelFact, StreamScore } from "@/types/analysis";

export { getMaturityCap };

export function computeStreamScore(facts: ChannelFact[]): StreamScore {
  const adapted: SharedChannelFact[] = facts.map((f) => ({
    key: f.key,
    value: f.value as SharedChannelFact["value"],
  }));
  const score: SharedStreamScore = sharedComputeStreamScore(adapted);
  return score as StreamScore;
}
