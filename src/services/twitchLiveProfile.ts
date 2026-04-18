import { supabase } from "@/integrations/supabase/client";

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
  /** Real follower total from Twitch API. null when not retrievable. */
  follower_count: number | null;
  /** True only when follower_count is a verified real number from Twitch. */
  followers_available: boolean;
  /** True when the connected account is missing moderator:read:followers. */
  missing_scope: boolean;
  scope: string;
}

/**
 * Calls the twitch-live-fetch edge function which uses the stored OAuth
 * access token to query Helix /users + /channels/followers for the
 * currently connected account. Returns a soft-failure object when the
 * call fails so the caller can still produce a report (with followers
 * marked unavailable rather than fake-zero).
 */
export async function fetchLiveTwitchProfile(): Promise<LiveTwitchProfileResult> {
  try {
    const { data, error } = await supabase.functions.invoke("twitch-live-fetch", {
      body: {},
    });

    if (error || !data?.success) {
      console.warn("[twitchLiveProfile] fetch failed", error, data);
      return {
        profile: null,
        follower_count: null,
        followers_available: false,
        missing_scope: false,
        scope: "",
      };
    }

    return {
      profile: data.profile ?? null,
      follower_count:
        typeof data.follower_count === "number" ? data.follower_count : null,
      followers_available: Boolean(data.followers_available),
      missing_scope: Boolean(data.missing_scope),
      scope: typeof data.scope === "string" ? data.scope : "",
    };
  } catch (err) {
    console.warn("[twitchLiveProfile] unexpected", err);
    return {
      profile: null,
      follower_count: null,
      followers_available: false,
      missing_scope: false,
      scope: "",
    };
  }
}
