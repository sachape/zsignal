import type { StreamScore } from "@/types/analysis";
import type { ChannelFact } from "./factsEngine";

/**
 * Compute StreamScore from extracted channel facts.
 * TODO: implement scoring algorithm.
 */
export async function computeStreamScore(_facts: ChannelFact[]): Promise<StreamScore> {
  return {
    overall_score: 0,
    regularity: 0,
    engagement: 0,
    growth: 0,
    discoverability: 0,
    content_quality: 0,
    community: 0,
    monetization_readiness: 0,
    affiliate_progress: 0,
  };
}
