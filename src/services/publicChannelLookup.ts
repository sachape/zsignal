import { supabase } from "@/integrations/supabase/client";
import type { MockStreamerData } from "@/types/analysis";
import { normalizeChannelInput } from "./channelInputNormalizer";

export type PublicLookupSource =
  | "exact_get_users"
  | "search_channels"
  | "not_found"
  | "invalid_input"
  | "error";

export interface PublicChannelLookupResult {
  login: string;
  data: MockStreamerData;
  source: PublicLookupSource;
  isReal: true;
}

interface EdgeChannel {
  id: string;
  login: string;
  display_name: string;
  description: string;
  profile_image_url: string;
  broadcaster_type: string;
  view_count: number;
  created_at: string | null;
}

/**
 * Builds a MockStreamerData "shell" from a real public Twitch profile.
 *
 * For the public teaser, we only have public profile data — NO real videos,
 * clips, or follower counts (those require user OAuth scopes). We therefore
 * return an honest empty history. The downstream pipeline (factsEngine etc.)
 * gracefully degrades to zeros, which the UI surfaces as "indisponible" via
 * `followers_available: false`.
 */
function buildShellFromPublic(c: EdgeChannel): MockStreamerData {
  const fetchedAt = new Date().toISOString();
  return {
    profile: {
      id: `public-${c.id}`,
      user_id: `public-${c.id}`,
      twitch_user_id: c.id,
      login: c.login,
      display_name: c.display_name,
      description: c.description ?? "",
      profile_image_url: c.profile_image_url ?? "",
      view_count: c.view_count ?? 0,
      follower_count: 0,
      followers_available: false,
      followers_missing_scope: true,
      broadcaster_type: c.broadcaster_type ?? "",
      created_at_twitch: c.created_at ?? fetchedAt,
      fetched_at: fetchedAt,
    },
    videos: [],
    clips: [],
  };
}

/**
 * PublicChannelLookupService
 *
 * Real public Twitch lookup via the `twitch-public-lookup` edge function.
 * Uses an App Access Token server-side — no user OAuth required.
 */
export const PublicChannelLookupService = {
  async findByInput(
    rawInput: string,
  ): Promise<PublicChannelLookupResult | null> {
    if (!rawInput) return null;

    // Client-side normalization is best-effort; the edge function re-normalizes.
    const normalized = normalizeChannelInput(rawInput);
    const inputForServer = normalized ?? rawInput;

    const { data, error } = await supabase.functions.invoke(
      "twitch-public-lookup",
      { body: { input: inputForServer } },
    );

    if (error) {
      // Surface as "not found" to caller; runner converts to user-facing state.
      console.warn("[publicChannelLookup] edge fn error", error);
      return null;
    }

    if (!data || data.success !== true || !data.channel) {
      return null;
    }

    const ch = data.channel as EdgeChannel;
    return {
      login: ch.login,
      data: buildShellFromPublic(ch),
      source: (data.source as PublicLookupSource) ?? "exact_get_users",
      isReal: true,
    };
  },
};
