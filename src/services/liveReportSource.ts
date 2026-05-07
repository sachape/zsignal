import type {
  MockStreamerData,
  TwitchClip,
  TwitchProfile,
  TwitchVideo,
} from "@/types/analysis";
import { allMockStreamers } from "@/data/mockStreamers";
import type {
  LiveTwitchClip,
  LiveTwitchVideo,
} from "./twitchLiveProfile";

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
  /** Real videos from /helix/videos. Empty array means no recent VODs. */
  videos?: LiveTwitchVideo[];
  /** Real clips from /helix/clips. */
  clips?: LiveTwitchClip[];
}

export interface CanonicalChannelIdentity {
  login: string;
  displayName: string;
  platformUserId?: string | null;
  liveProfile?: LiveProfileOverride | null;
  /**
   * When true, ALWAYS produce a synthetic dataset from `liveProfile` and
   * NEVER fall back to mocks — even if the login happens to match a demo
   * fixture. This is the source-of-truth flag for connected/live runs and
   * guarantees the live report is never contaminated by demo videos/clips.
   */
  liveOnly?: boolean;
}

function mapVideos(videos: LiveTwitchVideo[] | undefined): TwitchVideo[] {
  if (!videos) return [];
  return videos.map((v) => ({
    id: `live-v-${v.id}`,
    twitch_video_id: v.id,
    title: v.title,
    view_count: v.view_count ?? 0,
    duration: v.duration ?? "0h0m",
    created_at: v.created_at,
    stream_id: v.stream_id ?? "",
    language: v.language ?? "",
    type: v.type ?? "archive",
    thumbnail_url: v.thumbnail_url ?? null,
    url: v.url ?? null,
  }));
}

function mapClips(clips: LiveTwitchClip[] | undefined): TwitchClip[] {
  if (!clips) return [];
  return clips.map((c) => ({
    id: `live-c-${c.id}`,
    twitch_clip_id: c.id,
    title: c.title,
    view_count: c.view_count ?? 0,
    creator_name: c.creator_name,
    created_at: c.created_at,
    duration: c.duration ?? 0,
    game_id: c.game_id ?? "",
  }));
}

function buildLiveProfile(identity: CanonicalChannelIdentity): TwitchProfile {
  const live = identity.liveProfile ?? null;
  const fetchedAt = new Date().toISOString();
  return {
    id: `live-${identity.platformUserId ?? identity.login}`,
    user_id: "live-user",
    twitch_user_id: identity.platformUserId ?? `live-${identity.login}`,
    login: identity.login,
    display_name: identity.displayName,
    description: live?.description ?? "",
    profile_image_url: live?.profile_image_url ?? "",
    view_count: live?.view_count ?? 0,
    follower_count: live?.followers_available ? (live.follower_count ?? 0) : 0,
    followers_available: live?.followers_available ?? false,
    followers_missing_scope: live?.followers_missing_scope ?? false,
    broadcaster_type: live?.broadcaster_type ?? "",
    created_at_twitch: fetchedAt,
    fetched_at: fetchedAt,
  };
}

function buildLiveDataset(identity: CanonicalChannelIdentity): MockStreamerData {
  return {
    profile: buildLiveProfile(identity),
    videos: mapVideos(identity.liveProfile?.videos),
    clips: mapClips(identity.liveProfile?.clips),
  };
}

/**
 * Resolves the dataset used to assemble a report.
 *
 * Live/connected mode (`liveOnly: true`): builds the dataset purely from the
 * live Twitch payload. Never reuses demo videos/clips, even when the login
 * matches a fixture in `allMockStreamers`. This guarantees report payload
 * integrity for the connected account.
 *
 * Demo mode (`liveOnly: false`): for explicit demo runs (e.g. legacy
 * "analyse de démo"), allows the mock fixture as a base while still letting
 * any provided live identity override the profile fields. This path is NOT
 * used by the connected/auto-refresh pipeline.
 */
export function resolveAnalysisDataset(
  identity: CanonicalChannelIdentity,
): MockStreamerData {
  if (identity.liveOnly) {
    return buildLiveDataset(identity);
  }

  const dataset = allMockStreamers as Record<string, MockStreamerData>;
  const exact = dataset[identity.login.toLowerCase()];
  const live = identity.liveProfile ?? null;

  if (exact) {
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
        follower_count: live?.followers_available
          ? (live.follower_count ?? 0)
          : 0,
        followers_available: live?.followers_available ?? false,
        followers_missing_scope: live?.followers_missing_scope ?? false,
      },
    };
  }

  return buildLiveDataset(identity);
}
