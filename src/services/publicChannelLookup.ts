import { supabase } from "@/integrations/supabase/client";
import type {
  MockStreamerData,
  TwitchVideo,
  TwitchClip,
  CompetitorMatch,
  CompetitorGroup,
} from "@/types/analysis";
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

function toAppVideos(
  edgeVideos: EdgeVideo[],
  fallbackGameId: string,
): TwitchVideo[] {
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
    // VODs don't expose game_id directly — backfilled from dominant clip
    // category so the facts engine has a usable category signal.
    ...({ game_id: fallbackGameId } as Record<string, never>),
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
 * Build teaser competitor groups from real /search/channels results.
 *
 * In teaser mode we don't have follower / avg-viewer for those channels (the
 * public search endpoint doesn't return them), so we deliberately set
 * follower_count = 0 and avg_viewers = 0 — the UI must label these as
 * "données publiques limitées" rather than render the zeros as a trustworthy
 * number. We expose at most 2 candidates to keep the teaser intentionally light.
 */
function buildTeaserCompetitors(
  competitors: EdgeCompetitor[],
  dominantCategory: string | null,
): CompetitorGroup[] {
  const picks = competitors.slice(0, 2);
  if (picks.length === 0) return [];

  const matches: CompetitorMatch[] = picks.map((c) => ({
    id: `pub-comp-${c.id}`,
    competitor_login: c.login,
    display_name: c.display_name,
    similarity_score: dominantCategory && c.game_name === dominantCategory ? 75 : 50,
    follower_count: 0,
    avg_viewers: c.is_live ? 0 : 0,
    group: "direct",
    match_reasons: [
      c.game_name
        ? `Catégorie publique: ${c.game_name}`
        : "Chaîne publique pertinente",
      c.is_live ? "Actuellement en live" : "Hors live",
    ],
    strengths: [],
  }));

  return [
    {
      type: "direct",
      label: "Concurrents publics suggérés",
      matches,
    },
  ];
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
    const fallbackGameId = data.live?.game_id ?? "";
    const videos = toAppVideos(data.videos ?? [], fallbackGameId);
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
      dominantCategory: data.dominant_category ?? null,
      competitorGroups: buildTeaserCompetitors(
        data.competitors ?? [],
        data.dominant_category ?? null,
      ),
      hasPublicActivity: videos.length > 0 || clips.length > 0,
    };
  },
};
