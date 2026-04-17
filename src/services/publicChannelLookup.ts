import { allMockStreamers } from "@/data/mockStreamers";
import type { MockStreamerData } from "@/types/analysis";
import { normalizeChannelInput } from "./channelInputNormalizer";

export interface PublicChannelLookupResult {
  login: string;
  data: MockStreamerData;
}

/**
 * PublicChannelLookupService
 *
 * Mock implementation of a public Twitch channel lookup.
 * Designed to be swapped later with the real Twitch public search/users API
 * without changing its consumers (AnalyzePage / teaserAnalysisRunner).
 */
export const PublicChannelLookupService = {
  /**
   * Looks up a public channel by raw user input.
   * Returns null if input is invalid or no match is found.
   */
  async findByInput(rawInput: string): Promise<PublicChannelLookupResult | null> {
    const login = normalizeChannelInput(rawInput);
    if (!login) return null;
    return this.findByLogin(login);
  },

  /**
   * Looks up a public channel by normalized login.
   */
  async findByLogin(login: string): Promise<PublicChannelLookupResult | null> {
    // Simulate small network latency for a real-feeling UX
    await new Promise((r) => setTimeout(r, 250));

    const dataset = allMockStreamers as Record<string, MockStreamerData>;

    // Exact match
    if (dataset[login]) return { login, data: dataset[login] };

    // Fallback: match by display_name slug
    const found = Object.values(dataset).find(
      (s) => s.profile.login.toLowerCase() === login,
    );
    if (found) return { login: found.profile.login, data: found };

    return null;
  },
};
