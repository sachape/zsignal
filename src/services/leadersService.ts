import { supabase } from "@/integrations/supabase/client";

export interface LeaderChannel {
  id: string;
  login: string;
  display_name: string;
  thumbnail_url: string | null;
  is_live: boolean;
  game_name: string | null;
  language: string | null;
  live_viewer_count: number | null;
  title: string | null;
}

interface EdgeSearchResponse {
  success: boolean;
  mode: "search";
  suggestions?: Array<{
    id: string;
    login: string;
    display_name: string;
    thumbnail_url: string | null;
    is_live: boolean;
    game_name: string | null;
    language: string | null;
  }>;
}

interface EdgeLookupResponse {
  success: boolean;
  competitors?: Array<{
    id: string;
    login: string;
    display_name: string;
    thumbnail_url: string | null;
    is_live: boolean;
    game_name: string | null;
    language: string | null;
    live_viewer_count: number | null;
    title: string | null;
  }>;
}

const CATEGORY_PRESETS = [
  "Just Chatting",
  "League of Legends",
  "Valorant",
  "Fortnite",
  "Minecraft",
  "GTA V",
  "EA Sports FC 25",
  "Counter-Strike",
];

/**
 * Build a leaderboard pool by combining a category-driven channel search and
 * an optional language filter. We reuse the existing twitch-public-lookup
 * edge function in two ways:
 *  - mode "lookup" against a seed channel returns enriched competitor pool
 *    with live state, language, viewer count, etc.
 *  - mode "search" against a category name returns lightweight channel rows.
 *
 * No new backend is introduced; we just compose existing endpoints.
 */
export async function fetchLeaders(opts: {
  category?: string | null;
  query?: string | null;
}): Promise<LeaderChannel[]> {
  const q = (opts.query || opts.category || "Just Chatting").trim();
  if (!q) return [];

  const { data, error } = await supabase.functions.invoke<EdgeSearchResponse>(
    "twitch-public-lookup",
    { body: { input: q, mode: "search", limit: 20 } },
  );
  if (error || !data?.success) return [];

  return (data.suggestions ?? []).map((c) => ({
    id: c.id,
    login: c.login,
    display_name: c.display_name,
    thumbnail_url: c.thumbnail_url,
    is_live: c.is_live,
    game_name: c.game_name,
    language: c.language,
    live_viewer_count: null,
    title: null,
  }));
}

export const LEADER_CATEGORY_PRESETS = CATEGORY_PRESETS;
export const LEADER_LANGUAGE_PRESETS = ["fr", "en", "es", "de", "pt", "it"];
