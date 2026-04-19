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
  /**
   * Where the candidate-discovery seed came from. One of:
   *   - "live_stream"     : current live category
   *   - "recent_clips"    : most frequent recent-clip category
   *   - "category_hint"   : client-provided fallback (recently opened, watchlist, manual)
   *   - "none"            : no seed could be derived
   */
  seed_source: string;
  /** The category hint actually used (if any) to seed candidate discovery. */
  category_hint_used: string | null;
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
  seed_source: "none",
  category_hint_used: null,
  competitors: [],
});

export interface FetchLiveOptions {
  /** Fallback category hint when the connected account itself lacks a seed. */
  category_hint?: string | null;
  /** Optional language constraint when expanding the candidate pool. */
  language_hint?: string | null;
}

/**
 * Calls the twitch-live-fetch edge function which uses the stored OAuth
 * access token to query the connected Twitch account in full.
 *
 * Optional hints (category/language) are passed through and used by the
 * edge function as a fallback seed when the connected account has too
 * little personal activity to derive a dominant category itself.
 */
export async function fetchLiveTwitchProfile(
  options: FetchLiveOptions = {},
): Promise<LiveTwitchProfileResult> {
  try {
    const body: Record<string, string> = {};
    if (options.category_hint) body.category_hint = options.category_hint;
    if (options.language_hint) body.language_hint = options.language_hint;

    const { data, error } = await supabase.functions.invoke("twitch-live-fetch", {
      body,
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
      seed_source:
        typeof data.seed_source === "string" ? data.seed_source : "none",
      category_hint_used:
        typeof data.category_hint_used === "string" ? data.category_hint_used : null,
      competitors: Array.isArray(data.competitors)
        ? (data.competitors as LiveCompetitorCandidate[])
        : [],
    };
  } catch (err) {
    console.warn("[twitchLiveProfile] unexpected", err);
    return empty();
  }
}
