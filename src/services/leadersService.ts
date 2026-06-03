import { supabase } from "@/integrations/supabase/client";

export interface LeaderChannel {
  rank: number;
  id: string;
  login: string;
  display_name: string;
  profile_image_url: string | null;
  broadcaster_type: string; // "" | "affiliate" | "partner"
  description: string;
  view_count: number;
  is_live: boolean;
  live_viewer_count: number | null;
  title: string | null;
  game_name: string | null;
  language: string | null;
  started_at: string | null;
  /**
   * Score Live (0-100) computed from public live data only.
   * Distinct from StreamScore (full analysis). Based on live audience,
   * broadcaster status, lifetime views and recent stream momentum.
   */
  stream_score: number;
  /** Up to 2 short benchmark tags (e.g. "Affilié", "Top live", "Solo"). */
  tags: string[];
}

export interface LeaderCategory {
  id: string;
  name: string;
  box_art_url: string | null;
}

interface RawCategoryChannel {
  rank: number;
  id: string;
  login: string;
  display_name: string;
  profile_image_url: string | null;
  broadcaster_type: string;
  description: string;
  view_count: number;
  is_live: boolean;
  live_viewer_count: number | null;
  title: string | null;
  game_name: string | null;
  game_id: string | null;
  language: string | null;
  started_at: string | null;
}

interface CategoryRankingResponse {
  success: boolean;
  mode?: "category";
  reason?: string;
  retry_after?: string | null;
  category?: LeaderCategory;
  channels?: RawCategoryChannel[];
  pagination?: { cursor: string | null; has_more: boolean };
  fetched_at?: string;
  filters_applied?: {
    category: string;
    game_id: string;
    language: string;
    sort: string;
    first: number;
    after: string | null;
  };
}

interface CategorySearchResponse {
  success: boolean;
  categories?: LeaderCategory[];
}

/** Honest teaser score from public live signals only. */
function computeTeaserScore(c: {
  live_viewer_count: number | null;
  broadcaster_type: string;
  view_count: number;
  started_at: string | null;
}): number {
  // Live audience (log-scaled, capped at ~10k for full marks).
  const v = c.live_viewer_count ?? 0;
  const liveScore = Math.min(60, Math.log10(v + 1) * 18);

  // Broadcaster status: signals monetization readiness.
  const statusScore =
    c.broadcaster_type === "partner" ? 20 : c.broadcaster_type === "affiliate" ? 12 : 0;

  // Lifetime channel views (rough discoverability).
  const reachScore = Math.min(15, Math.log10(c.view_count + 1) * 2.5);

  // Stream uptime momentum (longer running live = more sticky).
  let uptimeScore = 0;
  if (c.started_at) {
    const hours = (Date.now() - new Date(c.started_at).getTime()) / 3_600_000;
    uptimeScore = Math.min(5, hours);
  }

  return Math.max(0, Math.min(100, Math.round(liveScore + statusScore + reachScore + uptimeScore)));
}

function buildTags(c: {
  live_viewer_count: number | null;
  broadcaster_type: string;
  started_at: string | null;
  title: string | null;
}): string[] {
  const tags: string[] = [];
  if (c.broadcaster_type === "partner") tags.push("Partenaire");
  else if (c.broadcaster_type === "affiliate") tags.push("Affilié");

  const v = c.live_viewer_count ?? 0;
  if (v >= 5000) tags.push("Top live");
  else if (v >= 1000) tags.push("Forte audience");

  if (c.started_at) {
    const hours = (Date.now() - new Date(c.started_at).getTime()) / 3_600_000;
    if (hours >= 4 && tags.length < 2) tags.push("Stream long");
  }

  const title = (c.title ?? "").toLowerCase();
  if (tags.length < 2 && /(rediff|replay|rerun)/i.test(title)) tags.push("Rediffusion");
  if (tags.length < 2 && /(event|tournoi|tournament|finale)/i.test(title))
    tags.push("Événement");

  return tags.slice(0, 2);
}

/**
 * Real category-based ranking.
 * Pipeline (server-side):
 *   1. Resolve category name → canonical Twitch game_id (/helix/games?name=)
 *   2. /helix/streams?game_id=... ranked by viewer_count desc
 *   3. Batched /helix/users for avatars + broadcaster_type
 * Then we enrich each row with a teaser StreamScore + benchmark tags.
 */
export async function fetchCategoryLeaders(opts: {
  category: string;
  language?: string;
  limit?: number;
}): Promise<{ category: LeaderCategory | null; channels: LeaderChannel[] }> {
  const { data, error } = await supabase.functions.invoke<CategoryRankingResponse>(
    "twitch-public-lookup",
    {
      body: {
        input: opts.category,
        mode: "category",
        limit: opts.limit ?? 30,
        language: opts.language ?? "all",
      },
    },
  );
  if (error || !data?.success || !data.channels) {
    return { category: data?.category ?? null, channels: [] };
  }
  return {
    category: data.category ?? null,
    channels: data.channels.map((c) => ({
      ...c,
      stream_score: computeTeaserScore(c),
      tags: buildTags(c),
    })),
  };
}

export interface CategoryLeadersPage {
  category: LeaderCategory | null;
  channels: LeaderChannel[];
  nextCursor: string | null;
  hasMore: boolean;
  fetchedAt: string | null;
  rateLimited: boolean;
  reason: string | null;
}

/**
 * Paginated category ranking. Uses Twitch Get Streams pagination via the
 * twitch-public-lookup edge function. `first` is capped at 100 by Twitch.
 */
export async function fetchCategoryLeadersPage(opts: {
  category: string;
  language?: string;
  first?: number;
  after?: string | null;
}): Promise<CategoryLeadersPage> {
  const { data, error } = await supabase.functions.invoke<CategoryRankingResponse>(
    "twitch-public-lookup",
    {
      body: {
        input: opts.category,
        mode: "category",
        first: Math.min(Math.max(opts.first ?? 100, 1), 100),
        after: opts.after ?? undefined,
        language: opts.language ?? "all",
      },
    },
  );
  if (error || !data) {
    return {
      category: null,
      channels: [],
      nextCursor: null,
      hasMore: false,
      fetchedAt: null,
      rateLimited: false,
      reason: error?.message ?? "request_failed",
    };
  }
  if (!data.success) {
    return {
      category: data.category ?? null,
      channels: [],
      nextCursor: null,
      hasMore: false,
      fetchedAt: data.fetched_at ?? null,
      rateLimited: data.reason === "rate_limited",
      reason: data.reason ?? "unknown",
    };
  }
  const channels = (data.channels ?? []).map((c) => ({
    ...c,
    stream_score: computeTeaserScore(c),
    tags: buildTags(c),
  }));
  return {
    category: data.category ?? null,
    channels,
    nextCursor: data.pagination?.cursor ?? null,
    hasMore: data.pagination?.has_more ?? false,
    fetchedAt: data.fetched_at ?? null,
    rateLimited: false,
    reason: null,
  };
}

/** Real category autocomplete using /helix/search/categories. */
export async function searchCategories(query: string): Promise<LeaderCategory[]> {
  if (query.trim().length < 2) return [];
  const { data, error } = await supabase.functions.invoke<CategorySearchResponse>(
    "twitch-public-lookup",
    { body: { input: query, mode: "category_search", limit: 10 } },
  );
  if (error || !data?.success) return [];
  return data.categories ?? [];
}

export const LEADER_CATEGORY_PRESETS = [
  "Just Chatting",
  "League of Legends",
  "Valorant",
  "Fortnite",
  "Minecraft",
  "Grand Theft Auto V",
  "EA Sports FC 25",
  "Counter-Strike",
];

export const LEADER_LANGUAGE_PRESETS = ["fr", "en", "es", "de", "pt", "it"];

// ─────────────────────────────────────────────────────────────────────────────
// StreamScore tab — indexed Streamnco leaderboard (cross-user, public read).
// Backed by channel_stream_scores via twitch-public-lookup mode "category_all".
// ─────────────────────────────────────────────────────────────────────────────

export interface StreamScoreLeaderChannel {
  rank: number;
  login: string;
  display_name: string;
  profile_image_url: string | null;
  broadcaster_type: string | null;
  stream_score: number;
  is_live: boolean;
  live_viewer_count: number | null;
  language: string | null;
  game_name: string;
  updated_at: string;
}

interface CategoryAllResponse {
  success: boolean;
  reason?: string;
  category?: LeaderCategory;
  channels?: Array<Omit<StreamScoreLeaderChannel, "rank">>;
  meta?: {
    scope?: string;
    source?: string;
    is_exhaustive?: boolean;
    includes_offline?: boolean;
    live_enriched?: boolean;
    indexed_count?: number;
    returned_count?: number;
    visible_count?: number;
    locked_count?: number;
    limit?: number;
    offset?: number;
    has_more?: boolean;
    next_offset?: number | null;
    is_pro?: boolean;
    plan_limit?: number | null;
  };
}

export interface StreamScoreLeadersResult {
  category: LeaderCategory | null;
  channels: StreamScoreLeaderChannel[];
  indexedCount: number;
  returnedCount: number;
  visibleCount: number;
  lockedCount: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  nextOffset: number | null;
  isPro: boolean;
  planLimit: number | null;
}

export async function fetchCategoryStreamScoreLeaders(opts: {
  category: string;
  language?: string;
  limit?: number;
  offset?: number;
}): Promise<StreamScoreLeadersResult> {
  const { data, error } = await supabase.functions.invoke<CategoryAllResponse>(
    "twitch-public-lookup",
    {
      body: {
        input: opts.category,
        mode: "category_all",
        limit: opts.limit ?? 50,
        offset: opts.offset ?? 0,
        language: opts.language ?? "all",
      },
    },
  );
  if (error || !data?.success || !data.channels) {
    return {
      category: data?.category ?? null,
      channels: [],
      indexedCount: 0,
      returnedCount: 0,
      visibleCount: 0,
      lockedCount: 0,
      limit: opts.limit ?? 50,
      offset: opts.offset ?? 0,
      hasMore: false,
      nextOffset: null,
      isPro: false,
      planLimit: null,
    };
  }
  const baseOffset = data.meta?.offset ?? opts.offset ?? 0;
  const channels = data.channels.map((c, i) => ({ ...c, rank: baseOffset + i + 1 }));
  return {
    category: data.category ?? null,
    channels,
    indexedCount: data.meta?.indexed_count ?? channels.length,
    returnedCount: data.meta?.returned_count ?? channels.length,
    visibleCount: data.meta?.visible_count ?? channels.length,
    lockedCount: data.meta?.locked_count ?? 0,
    limit: data.meta?.limit ?? (opts.limit ?? 50),
    offset: baseOffset,
    hasMore: data.meta?.has_more ?? false,
    nextOffset: data.meta?.next_offset ?? null,
    isPro: data.meta?.is_pro ?? false,
    planLimit: data.meta?.plan_limit ?? null,
  };
}

// Back-compat shim — old callers used fetchLeaders({ category }).
export async function fetchLeaders(opts: {
  category?: string | null;
  query?: string | null;
}): Promise<LeaderChannel[]> {
  const cat = (opts.category || opts.query || "Just Chatting").trim();
  const { channels } = await fetchCategoryLeaders({ category: cat });
  return channels;
}
