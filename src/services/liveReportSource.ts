import type { MockStreamerData, TwitchClip, TwitchProfile, TwitchVideo } from "@/types/analysis";
import { allMockStreamers } from "@/data/mockStreamers";

export interface CanonicalChannelIdentity {
  login: string;
  displayName: string;
  platformUserId?: string | null;
}

function createSyntheticProfile(identity: CanonicalChannelIdentity): TwitchProfile {
  return {
    id: `live-${identity.platformUserId ?? identity.login}`,
    user_id: "live-user",
    twitch_user_id: identity.platformUserId ?? `live-${identity.login}`,
    login: identity.login,
    display_name: identity.displayName,
    description: `Chaîne Twitch connectée @${identity.login}`,
    profile_image_url: "",
    view_count: 0,
    follower_count: 0,
    broadcaster_type: "",
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

  if (exact) {
    return {
      ...exact,
      profile: {
        ...exact.profile,
        login: identity.login,
        display_name: identity.displayName,
        twitch_user_id: identity.platformUserId ?? exact.profile.twitch_user_id,
      },
    };
  }

  return createSyntheticDataset(identity);
}
