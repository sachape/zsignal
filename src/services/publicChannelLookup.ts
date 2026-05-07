import { supabase } from "@/integrations/supabase/client";
import type {
  MockStreamerData,
  TwitchVideo,
  TwitchClip,
  CompetitorGroup,
} from "@/types/analysis";
import { normalizeChannelInput } from "./channelInputNormalizer";
import {
  buildCompetitorGroups,
  type CandidateChannel,
  type TargetSignal,
} from "./competitorEngine";

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
  /** Real public live stream snapshot (if currently live). */
  live: {
    title: string;
    game_name: string | null;
    viewer_count: number;
    started_at: string;
  } | null;
  /** Dominant category resolved from clips/live, or null if none found. */
  dominantCategory: string | null;
  /** Pre-built teaser competitor groups from real /search/channels. */
  competitorGroups: CompetitorGroup[];
  /** Did the public stack return real activity (videos or clips)? */
  hasPublicActivity: boolean;
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

interface EdgeVideo {
  id: string;
  title: string;
  duration: string;
  view_count: number;
  created_at: string;
  language: string;
  type: string;
  stream_id: string | null;
  thumbnail_url?: string | null;
  url?: string | null;
}

interface EdgeClip {
  id: string;
  title: string;
  view_count: number;
  creator_name: string;
  created_at: string;
  duration: number;
  game_id: string;
}

interface EdgeLive {
  id: string;
  title: string;
  game_id: string;
  game_name: string;
  viewer_count: number;
  started_at: string;
  language: string;
}

interface EdgeCompetitor {
  id: string;
  login: string;
  display_name: string;
  thumbnail_url: string | null;
  is_live: boolean;
  game_name: string | null;
  title: string | null;
  started_at: string | null;
  language?: string | null;
  live_viewer_count?: number | null;
  description?: string;
  broadcaster_type?: string;
  view_count?: number;
}

interface EdgeResponse {
  success: boolean;
  source?: PublicLookupSource;
  reason?: string;
  login?: string;
  channel?: EdgeChannel;
  videos?: EdgeVideo[];
  clips?: EdgeClip[];
  live?: EdgeLive | null;
  dominant_category?: string | null;
  competitors?: EdgeCompetitor[];
}

function toAppVideos(edgeVideos: EdgeVideo[]): TwitchVideo[] {
  return edgeVideos.map((v) => ({
    id: `pub-v-${v.id}`,
    twitch_video_id: v.id,
    title: v.title,
    view_count: v.view_count ?? 0,
    duration: v.duration ?? "0h0m",
    created_at: v.created_at,
    stream_id: v.stream_id ?? "",
    language: v.language ?? "",
    type: v.type ?? "archive",
  }));
}

function toAppClips(edgeClips: EdgeClip[]): TwitchClip[] {
  return edgeClips.map((c) => ({
    id: `pub-c-${c.id}`,
    twitch_clip_id: c.id,
    title: c.title,
    view_count: c.view_count ?? 0,
    creator_name: c.creator_name,
    created_at: c.created_at,
    duration: c.duration ?? 0,
    game_id: c.game_id ?? "",
  }));
}

function buildShellFromPublic(
  c: EdgeChannel,
  videos: TwitchVideo[],
  clips: TwitchClip[],
): MockStreamerData {
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
      // Followers are NOT retrievable via App Access Token — keep at 0 with
      // followers_available=false so the UI never renders a fake number.
      follower_count: 0,
      followers_available: false,
      followers_missing_scope: true,
      broadcaster_type: c.broadcaster_type ?? "",
      created_at_twitch: c.created_at ?? fetchedAt,
      fetched_at: fetchedAt,
    },
    videos,
    clips,
  };
}

/**
 * Build teaser competitor groups using the v2 weighted competitor engine.
 *
 * The /search/channels endpoint doesn't return follower or avg viewers, so
 * we use richer signals (language, broadcaster_type, recent live snapshot,
 * description, view_count) and let the engine score on language, channel
 * type, content format, relative size, activity and category. Teaser mode is
 * intentionally conservative: 1 strong direct beats 3 weak neighbors.
 */
function buildTeaserCompetitors(
  ch: EdgeChannel,
  competitors: EdgeCompetitor[],
  dominantCategory: string | null,
  recentTitles: string[],
): CompetitorGroup[] {
  if (!competitors.length) return [];

  const target: TargetSignal = {
    login: ch.login,
    language: "fr",
    dominant_category: dominantCategory,
    recent_titles: recentTitles,
    channel_type: "solo",
    content_format: "unknown",
    size_proxy: ch.view_count ?? 0,
  };

  const candidates: CandidateChannel[] = competitors.map((c) => ({
    id: c.id,
    login: c.login,
    display_name: c.display_name,
    broadcaster_type: c.broadcaster_type ?? "",
    description: c.description ?? "",
    is_live: c.is_live,
    live_title: c.title,
    live_viewer_count: c.live_viewer_count ?? null,
    game_name: c.game_name,
    language: c.language ?? null,
    recent_titles: c.title ? [c.title] : [],
    view_count: c.view_count ?? 0,
  }));

  return buildCompetitorGroups({ target, candidates, teaser: true });
}

/**
 * PublicChannelLookupService
 *
 * Real public Twitch lookup + enrichment via the `twitch-public-lookup`
 * edge function. Uses an App Access Token server-side — no user OAuth.
 *
 * Endpoints called (server-side):
 *   - GET /helix/users               (identity)
 *   - GET /helix/search/channels     (identity fallback + competitors)
 *   - GET /helix/videos              (recent VODs)
 *   - GET /helix/clips               (recent clips, last 30d)
 *   - GET /helix/streams             (live state)
 *   - GET /helix/games               (resolve dominant category name)
 */
export const PublicChannelLookupService = {
  async findByInput(
    rawInput: string,
  ): Promise<PublicChannelLookupResult | null> {
    if (!rawInput) return null;

    const normalized = normalizeChannelInput(rawInput);
    const inputForServer = normalized ?? rawInput;

    const { data, error } = await supabase.functions.invoke<EdgeResponse>(
      "twitch-public-lookup",
      { body: { input: inputForServer } },
    );

    if (error) {
      console.warn("[publicChannelLookup] edge fn error", error);
      return null;
    }
    if (!data || data.success !== true || !data.channel) {
      return null;
    }

    const ch = data.channel;
    const videos = toAppVideos(data.videos ?? []);
    const clips = toAppClips(data.clips ?? []);

    return {
      login: ch.login,
      data: buildShellFromPublic(ch, videos, clips),
      source: data.source ?? "exact_get_users",
      isReal: true,
      live: data.live
        ? {
            title: data.live.title,
            game_name: data.live.game_name ?? null,
            viewer_count: data.live.viewer_count,
            started_at: data.live.started_at,
          }
        : null,
      dominantCategory:
        data.dominant_category && data.dominant_category !== "unknown"
          ? data.dominant_category
          : null,
      competitorGroups: buildTeaserCompetitors(
        ch,
        data.competitors ?? [],
        data.dominant_category ?? null,
        videos.slice(0, 10).map((v) => v.title),
      ),
      hasPublicActivity: videos.length > 0 || clips.length > 0,
    };
  },
};
