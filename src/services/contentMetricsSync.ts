// Post-publication metrics sync stub (V3.5).
// Future: call a Supabase Edge Function to pull views/likes/comments
// from YouTube Data API (no new scopes required for public stats).
// For now, returns a deterministic "unavailable" response so the UI can
// honestly say analytics are coming soon, without inventing any number.

export interface ContentMetrics {
  views?: number;
  likes?: number;
  comments?: number;
  fetched_at: string;
  source: "youtube" | "manual" | "unavailable";
}

export interface SyncResult {
  ok: boolean;
  reason?: "not_published" | "platform_unsupported" | "unavailable";
  metrics?: ContentMetrics;
}

export async function syncContentItemMetrics(args: {
  publishedPlatform: string | null | undefined;
  externalPlatformId: string | null | undefined;
}): Promise<SyncResult> {
  if (!args.publishedPlatform || !args.externalPlatformId) {
    return { ok: false, reason: "not_published" };
  }
  if (args.publishedPlatform !== "youtube") {
    return { ok: false, reason: "platform_unsupported" };
  }
  // Real implementation will hit an edge function. Kept honest for V3.5.
  return { ok: false, reason: "unavailable" };
}
