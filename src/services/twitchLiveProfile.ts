import { supabase } from "@/integrations/supabase/client";

export interface LiveTwitchVideo {
  id: string;
  title: string;
  duration: string;
  view_count: number;
  created_at: string;
  language: string;
  type: string;
  stream_id: string | null;
}

export interface LiveTwitchClip {
  id: string;
  title: string;
  view_count: number;
  creator_name: string;
  created_at: string;
  duration: number;
  game_id: string;
}

export interface LiveTwitchStream {
  id: string;
  title: string;
  game_id: string;
  game_name: string | null;
  viewer_count: number;
  started_at: string;
  language: string;
}

export interface LiveCompetitorCandidate {
  id: string;
  login: string;
  display_name: string;
  thumbnail_url: string | null;
  is_live: boolean;
  game_name: string | null;
  title: string | null;
  started_at: string | null;
  language: string | null;
  live_viewer_count: number | null;
  description: string;
  broadcaster_type: string;
  view_count: number;
}

export interface LiveTwitchProfileResult {
  profile: {
    id: string;
    login: string;
    display_name: string;
    description: string;
    profile_image_url: string;
    broadcaster_type: string;
    view_count: number;
  } | null;
  follower_count: number | null;
  followers_available: boolean;
  missing_scope: boolean;
  scope: string;
  videos: LiveTwitchVideo[];
  clips: LiveTwitchClip[];
  live: LiveTwitchStream | null;
  dominant_category: string | null;
  competitors: LiveCompetitorCandidate[];
}

const empty = (): LiveTwitchProfileResult => ({
  profile: null,
  follower_count: null,
  followers_available: false,
  missing_scope: false,
  scope: "",
  videos: [],
  clips: [],
  live: null,
  dominant_category: null,
  competitors: [],
});

/**
 * Calls the twitch-live-fetch edge function which uses the stored OAuth
 * access token to query the connected Twitch account in full:
 *   /users, /channels/followers, /videos, /clips, /streams, /games,
 *   /search/channels (App token).
 *
 * Returns a soft-failure object when the call fails so the caller can still
 * produce a report (with followers/videos marked unavailable rather than
 * fake-zero or mock-contaminated).
 */
export async function fetchLiveTwitchProfile(): Promise<LiveTwitchProfileResult> {
  try {
    const { data, error } = await supabase.functions.invoke("twitch-live-fetch", {
      body: {},
    });

    if (error || !data?.success) {
      console.warn("[twitchLiveProfile] fetch failed", error, data);
      return empty();
    }

    return {
      profile: data.profile ?? null,
      follower_count:
        typeof data.follower_count === "number" ? data.follower_count : null,
      followers_available: Boolean(data.followers_available),
      missing_scope: Boolean(data.missing_scope),
      scope: typeof data.scope === "string" ? data.scope : "",
      videos: Array.isArray(data.videos) ? (data.videos as LiveTwitchVideo[]) : [],
      clips: Array.isArray(data.clips) ? (data.clips as LiveTwitchClip[]) : [],
      live: (data.live as LiveTwitchStream | null) ?? null,
      dominant_category:
        typeof data.dominant_category === "string" ? data.dominant_category : null,
      competitors: Array.isArray(data.competitors)
        ? (data.competitors as LiveCompetitorCandidate[])
        : [],
    };
  } catch (err) {
    console.warn("[twitchLiveProfile] unexpected", err);
    return empty();
  }
}
