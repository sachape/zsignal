import { supabase } from "@/integrations/supabase/client";

export interface StreamerSuggestion {
  id: string;
  login: string;
  display_name: string;
  thumbnail_url: string | null;
  is_live: boolean;
  game_name: string | null;
  language: string | null;
}

interface EdgeSearchResponse {
  success: boolean;
  mode: "search";
  suggestions?: StreamerSuggestion[];
}

/**
 * Lightweight autocomplete against /helix/search/channels via the existing
 * `twitch-public-lookup` edge function (mode: "search"). No enrichment, no
 * cost beyond a single Helix call.
 */
export async function suggestStreamers(
  query: string,
  signal?: AbortSignal,
): Promise<StreamerSuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const { data, error } = await supabase.functions.invoke<EdgeSearchResponse>(
    "twitch-public-lookup",
    { body: { input: q, mode: "search", limit: 8 } },
  );

  if (signal?.aborted) return [];
  if (error || !data?.success) return [];
  return data.suggestions ?? [];
}
