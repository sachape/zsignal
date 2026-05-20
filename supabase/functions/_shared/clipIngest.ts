// Shared Twitch clip ingestion logic. Used by both twitch-clips-ingest
// (HTTP entrypoint) and weekly-actions-verify (sweep that refreshes
// clips before validating).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface IngestParams {
  user_id: string;
  broadcaster_id: string;
  started_at: string;
  ended_at?: string;
}

interface RawClip {
  id: string;
  url?: string;
  broadcaster_id?: string;
  creator_id?: string;
  video_id?: string;
  game_id?: string;
  title?: string;
  view_count?: number;
  created_at?: string;
  thumbnail_url?: string;
  duration?: number;
  vod_offset?: number | null;
  is_featured?: boolean;
}

async function getAppAccessToken(
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`App token failed: ${JSON.stringify(data)}`);
  return data.access_token as string;
}

async function fetchClips(
  clientId: string,
  appToken: string,
  broadcasterId: string,
  startedAt: string,
  endedAt: string,
): Promise<RawClip[]> {
  const out: RawClip[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 5; page++) {
    const url = new URL("https://api.twitch.tv/helix/clips");
    url.searchParams.set("broadcaster_id", broadcasterId);
    url.searchParams.set("started_at", startedAt);
    url.searchParams.set("ended_at", endedAt);
    url.searchParams.set("first", "100");
    if (cursor) url.searchParams.set("after", cursor);
    const res = await fetch(url, {
      headers: {
        "Client-Id": clientId,
        Authorization: `Bearer ${appToken}`,
      },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`Get Clips failed: ${JSON.stringify(data)}`);
    out.push(...((data.data ?? []) as RawClip[]));
    cursor = data.pagination?.cursor;
    if (!cursor) break;
  }
  return out;
}

interface RawGame {
  id: string;
  name: string;
  box_art_url?: string;
}

async function fetchGames(
  clientId: string,
  appToken: string,
  gameIds: string[],
): Promise<RawGame[]> {
  if (gameIds.length === 0) return [];
  const out: RawGame[] = [];
  // Twitch Get Games accepts up to 100 ids per call.
  for (let i = 0; i < gameIds.length; i += 100) {
    const batch = gameIds.slice(i, i + 100);
    const url = new URL("https://api.twitch.tv/helix/games");
    for (const id of batch) url.searchParams.append("id", id);
    const res = await fetch(url, {
      headers: {
        "Client-Id": clientId,
        Authorization: `Bearer ${appToken}`,
      },
    });
    const data = await res.json();
    if (!res.ok) {
      console.log(
        JSON.stringify({
          event: "twitch_get_games_failed",
          status: res.status,
          batch_size: batch.length,
        }),
      );
      // Don't break ingestion — categories are best-effort enrichment.
      continue;
    }
    out.push(...((data.data ?? []) as RawGame[]));
  }
  return out;
}

/** Refresh the twitch_categories cache for the given game_ids. */
async function enrichCategories(
  admin: ReturnType<typeof createClient>,
  clientId: string,
  appToken: string,
  gameIds: string[],
  options: { staleAfterDays?: number } = {},
): Promise<{ upserted: number }> {
  const cleaned = Array.from(
    new Set(gameIds.filter((id): id is string => Boolean(id) && id.trim() !== "")),
  );
  if (cleaned.length === 0) return { upserted: 0 };

  const staleAfterDays = options.staleAfterDays ?? 30;
  const staleBefore = new Date(
    Date.now() - staleAfterDays * 86400000,
  ).toISOString();

  // Find which ids are missing or stale in cache.
  const { data: existing } = await admin
    .from("twitch_categories")
    .select("game_id, last_synced_at")
    .in("game_id", cleaned);
  const fresh = new Set<string>(
    ((existing ?? []) as { game_id: string; last_synced_at: string }[])
      .filter((r) => r.last_synced_at > staleBefore)
      .map((r) => r.game_id),
  );
  const toFetch = cleaned.filter((id) => !fresh.has(id));
  if (toFetch.length === 0) return { upserted: 0 };

  let games: RawGame[] = [];
  try {
    games = await fetchGames(clientId, appToken, toFetch);
  } catch (e) {
    console.log(
      JSON.stringify({
        event: "twitch_get_games_error",
        message: e instanceof Error ? e.message : "unknown",
      }),
    );
    return { upserted: 0 };
  }
  if (games.length === 0) return { upserted: 0 };

  const now = new Date().toISOString();
  const rows = games
    .filter((g) => g.id && g.name)
    .map((g) => ({
      game_id: g.id,
      game_name: g.name,
      box_art_url: g.box_art_url ?? null,
      last_synced_at: now,
      updated_at: now,
    }));
  if (rows.length === 0) return { upserted: 0 };

  const { error } = await admin
    .from("twitch_categories")
    .upsert(rows, { onConflict: "game_id" });
  if (error) {
    console.log(
      JSON.stringify({
        event: "twitch_categories_upsert_failed",
        message: error.message,
      }),
    );
    return { upserted: 0 };
  }
  return { upserted: rows.length };
}

export async function ingestClipsFor(
  admin: ReturnType<typeof createClient>,
  params: IngestParams,
): Promise<{ fetched: number; upserted: number; categories_synced: number }> {
  const clientId = Deno.env.get("TWITCH_CLIENT_ID")!;
  const clientSecret = Deno.env.get("TWITCH_CLIENT_SECRET")!;
  const appToken = await getAppAccessToken(clientId, clientSecret);
  const endedAt = params.ended_at ?? new Date().toISOString();

  const clips = await fetchClips(
    clientId,
    appToken,
    params.broadcaster_id,
    params.started_at,
    endedAt,
  );
  if (clips.length === 0) {
    return { fetched: 0, upserted: 0, categories_synced: 0 };
  }

  // Dedupe by twitch_clip_id — Helix pagination can return the same clip
  // across pages, which would break ON CONFLICT DO UPDATE in a single batch.
  const seen = new Set<string>();
  const uniqueClips: RawClip[] = [];
  for (const c of clips) {
    if (!c.id || seen.has(c.id)) continue;
    seen.add(c.id);
    uniqueClips.push(c);
  }

  const rows = uniqueClips.map((c) => ({
    user_id: params.user_id,
    broadcaster_id: params.broadcaster_id,
    twitch_clip_id: c.id,
    creator_id: c.creator_id ?? null,
    video_id: c.video_id ?? null,
    game_id: c.game_id ?? null,
    title: c.title ?? null,
    view_count: c.view_count ?? 0,
    clip_created_at: c.created_at ?? new Date().toISOString(),
    duration: c.duration ?? null,
    vod_offset: c.vod_offset ?? null,
    is_featured: c.is_featured ?? null,
    thumbnail_url: c.thumbnail_url ?? null,
    url: c.url ?? null,
    fetched_at: new Date().toISOString(),
  }));

  const { error } = await admin
    .from("twitch_clip_snapshots")
    .upsert(rows, { onConflict: "twitch_clip_id" });
  if (error) throw error;

  // Best-effort category enrichment. Failures must not break ingestion.
  let categoriesSynced = 0;
  try {
    const gameIds = uniqueClips
      .map((c) => c.game_id ?? "")
      .filter((id) => id !== "");
    const res = await enrichCategories(admin, clientId, appToken, gameIds);
    categoriesSynced = res.upserted;
  } catch (e) {
    console.log(
      JSON.stringify({
        event: "twitch_categories_enrich_error",
        message: e instanceof Error ? e.message : "unknown",
      }),
    );
  }

  return {
    fetched: clips.length,
    upserted: rows.length,
    categories_synced: categoriesSynced,
  };
}
