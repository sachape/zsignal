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

export async function ingestClipsFor(
  admin: ReturnType<typeof createClient>,
  params: IngestParams,
): Promise<{ fetched: number; upserted: number }> {
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
  if (clips.length === 0) return { fetched: 0, upserted: 0 };

  const rows = clips.map((c) => ({
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

  return { fetched: clips.length, upserted: rows.length };
}
