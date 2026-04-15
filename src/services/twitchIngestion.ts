import type { TwitchProfile } from "@/types/analysis";

// Twitch data ingestion — stubs for future implementation

export async function fetchTwitchProfile(_login: string): Promise<TwitchProfile | null> {
  // TODO: call Twitch API via edge function
  return null;
}

export async function fetchRecentVideos(_userId: string): Promise<unknown[]> {
  // TODO: fetch recent VODs from Twitch API
  return [];
}

export async function fetchTopClips(_userId: string): Promise<unknown[]> {
  // TODO: fetch top clips from Twitch API
  return [];
}
