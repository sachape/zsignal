import type { TwitchProfile, CompetitorMatch } from "@/types/analysis";
import type { ChannelFact } from "./factsEngine";

/**
 * Find competitor streamers based on profile and facts.
 * TODO: implement matching algorithm.
 */
export async function findCompetitors(
  _profile: TwitchProfile | null,
  _facts: ChannelFact[]
): Promise<CompetitorMatch[]> {
  return [];
}
