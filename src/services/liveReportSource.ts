import type { MockStreamerData, TwitchClip, TwitchProfile, TwitchVideo } from "@/types/analysis";
import { allMockStreamers } from "@/data/mockStreamers";

export interface LiveProfileOverride {
  id?: string | null;
  login?: string | null;
  display_name?: string | null;
  description?: string | null;
  profile_image_url?: string | null;
  broadcaster_type?: string | null;
  view_count?: number | null;
  /** Real follower total from Twitch API. null when not retrievable. */
  follower_count?: number | null;
  /** True only when follower_count is a verified real number. */
  followers_available?: boolean;
  /** True if scope is missing for follower retrieval. */
  followers_missing_scope?: boolean;
}

export interface CanonicalChannelIdentity {
  login: string;
  displayName: string;
  platformUserId?: string | null;
  liveProfile?: LiveProfileOverride | null;
}

function createSyntheticProfile(identity: CanonicalChannelIdentity): TwitchProfile {
  const live = identity.liveProfile ?? null;
  return {
    id: `live-${identity.platformUserId ?? identity.login}`,
    user_id: "live-user",
    twitch_user_id: identity.platformUserId ?? `live-${identity.login}`,
    login: identity.login,
    display_name: identity.displayName,
    description: live?.description ?? `Chaîne Twitch connectée @${identity.login}`,
    profile_image_url: live?.profile_image_url ?? "",
    view_count: live?.view_count ?? 0,
    follower_count: live?.follower_count ?? 0,
    followers_available: live?.followers_available ?? false,
    followers_missing_scope: live?.followers_missing_scope ?? false,
    broadcaster_type: live?.broadcaster_type ?? "",
    created_at_twitch: new Date().toISOString(),
    fetched_at: new Date().toISOString(),
  };
}

function createSyntheticDataset(identity: CanonicalChannelIdentity): MockStreamerData {
  const videos: TwitchVideo[] = [];
  const clips: TwitchClip[] = [];

  return {
    profile: createSyntheticProfile(identity),
    videos,
    clips,
  };
}

export function resolveAnalysisDataset(identity: CanonicalChannelIdentity): MockStreamerData {
  const dataset = allMockStreamers as Record<string, MockStreamerData>;
  const exact = dataset[identity.login.toLowerCase()];
  const live = identity.liveProfile ?? null;

  if (exact) {
    // When we have live identity data, ALWAYS prefer live values over mock
    // so the report payload reflects the connected account, not the demo.
    return {
      ...exact,
      profile: {
        ...exact.profile,
        login: identity.login,
        display_name: identity.displayName,
        twitch_user_id: identity.platformUserId ?? exact.profile.twitch_user_id,
        description: live?.description ?? exact.profile.description,
        profile_image_url: live?.profile_image_url ?? exact.profile.profile_image_url,
        broadcaster_type: live?.broadcaster_type ?? exact.profile.broadcaster_type,
        view_count: live?.view_count ?? exact.profile.view_count,
        // Followers: only use live value if available; otherwise mark as
        // unavailable rather than letting the mock value impersonate reality.
        follower_count: live?.followers_available
          ? (live.follower_count ?? 0)
          : 0,
        followers_available: live?.followers_available ?? false,
        followers_missing_scope: live?.followers_missing_scope ?? false,
      },
    };
  }

  return createSyntheticDataset(identity);
}
