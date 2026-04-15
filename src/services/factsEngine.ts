import type { TwitchProfile } from "@/types/analysis";

export interface ChannelFact {
  fact_key: string;
  fact_value: string;
  confidence: number;
}

/**
 * Extract structured facts from raw Twitch data.
 * TODO: implement real extraction logic.
 */
export async function extractChannelFacts(
  _profile: TwitchProfile | null,
  _videos: unknown[],
  _clips: unknown[]
): Promise<ChannelFact[]> {
  return [];
}
