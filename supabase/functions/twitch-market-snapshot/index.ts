// Twitch Market Snapshot — Phase A (Streamnco Market Index).
//
// - Cron-protected via CRON_SECRET (header `x-cron-secret` or body { secret }).
// - Pulls live streams from Twitch Helix /streams for a fixed manual list of
//   FR categories.
// - Writes raw snapshots (twitch_stream_snapshots), upserts channel index
//   (twitch_channel_index), writes per-(game,language) aggregates
//   (twitch_game_snapshots), enriches twitch_categories cache.
// - No cron registered yet. No frontend exposure. No secrets in code.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// ---------------------------------------------------------------------------
// V1 manual scope (FR). Easy to edit here. Resolved server-side to game_id.
// ---------------------------------------------------------------------------
const V1_CATEGORY_NAMES = [
  "Just Chatting",
  "League of Legends",
  "VALORANT",
  "Fortnite",
  "Grand Theft Auto V",
  "Minecraft",
  "Rocket League",
  "Counter-Strike",
  "Call of Duty: Warzone",
  "EA Sports FC 25",
];
const V1_LANGUAGES = ["fr"];
const DEFAULT_MAX_PAGES_PER_COMBO = 3;
const HARD_CAP_HELIX_CALLS = 50;

// ---------------------------------------------------------------------------
// Twitch helpers
// ---------------------------------------------------------------------------
interface HelixGame { id: string; name: string; box_art_url?: string }
interface HelixStream {
  id: string;
  user_id: string;
  user_login: string;
  user_name: string;
  game_id: string;
  game_name: string;
  language: string;
  title: string;
  viewer_count: number;
  started_at: string;
  thumbnail_url: string;
}
interface HelixUser {
  id: string;
  login: string;
  display_name: string;
  profile_image_url?: string;
  broadcaster_type?: string;
}

async function getAppToken(clientId: string, clientSecret: string): Promise<string> {
  const r = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
    }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(`twitch_token_failed:${r.status}`);
  return data.access_token as string;
}

async function helix<T>(
  url: string,
  headers: HeadersInit,
  stats: { calls: number; rateLimited: number },
): Promise<{ ok: boolean; status: number; data?: T; retryAfter?: number }> {
  stats.calls += 1;
  const r = await fetch(url, { headers });
  if (r.status === 429) {
    stats.rateLimited += 1;
    const reset = Number(r.headers.get("Ratelimit-Reset") ?? 0);
    const retryAfter = reset > 0 ? Math.max(0, reset * 1000 - Date.now()) : 1000;
    await r.text();
    return { ok: false, status: 429, retryAfter };
  }
  if (!r.ok) {
    await r.text();
    return { ok: false, status: r.status };
  }
  const data = (await r.json()) as T;
  return { ok: true, status: r.status, data };
}

async function resolveGames(
  clientId: string,
  token: string,
  names: string[],
  stats: { calls: number; rateLimited: number },
  logs: string[],
): Promise<HelixGame[]> {
  // Twitch Get Games supports multiple ?name= params (max 100).
  const url = new URL("https://api.twitch.tv/helix/games");
  for (const n of names) url.searchParams.append("name", n);
  const res = await helix<{ data: HelixGame[] }>(url.toString(), {
    "Client-Id": clientId,
    Authorization: `Bearer ${token}`,
  }, stats);
  if (!res.ok || !res.data) {
    logs.push(`resolveGames_failed status=${res.status}`);
    return [];
  }
  const found = new Set(res.data.map((g) => g.name.toLowerCase()));
  for (const n of names) {
    if (!found.has(n.toLowerCase())) logs.push(`category_not_found "${n}"`);
  }
  return res.data;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const t0 = Date.now();
  const stats = { calls: 0, rateLimited: 0 };
  const logs: string[] = [];

  // --- Auth: CRON_SECRET ---
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret) return json({ error: "missing_cron_secret_env" }, 500);

  let body: { secret?: string; languages?: string[]; categories?: string[]; maxPagesPerCombo?: number } = {};
  try {
    if (req.method === "POST") body = await req.json().catch(() => ({}));
  } catch (_) { /* ignore */ }

  const provided = req.headers.get("x-cron-secret") ?? body.secret ?? "";
  if (provided !== cronSecret) return json({ error: "unauthorized" }, 401);

  // --- Env ---
  const clientId = Deno.env.get("TWITCH_CLIENT_ID");
  const clientSecret = Deno.env.get("TWITCH_CLIENT_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!clientId || !clientSecret || !supabaseUrl || !serviceKey) {
    return json({ error: "missing_env" }, 500);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // --- Scope ---
  const languages = (body.languages && body.languages.length > 0 ? body.languages : V1_LANGUAGES)
    .map((l) => l.trim().toLowerCase()).filter(Boolean);
  const categoryNames = (body.categories && body.categories.length > 0 ? body.categories : V1_CATEGORY_NAMES)
    .map((c) => c.trim()).filter(Boolean);
  const maxPages = Math.max(1, Math.min(5, body.maxPagesPerCombo ?? DEFAULT_MAX_PAGES_PER_COMBO));

  let token: string;
  try {
    token = await getAppToken(clientId, clientSecret);
  } catch (e) {
    return json({ error: "twitch_token_failed", message: (e as Error).message }, 502);
  }

  const headers: HeadersInit = { "Client-Id": clientId, Authorization: `Bearer ${token}` };

  // --- Resolve categories to game_id ---
  const games = await resolveGames(clientId, token, categoryNames, stats, logs);
  if (games.length === 0) {
    return json({ ok: false, reason: "no_categories_resolved", logs, stats }, 200);
  }

  // Upsert resolved games into twitch_categories cache (best-effort).
  try {
    const now = new Date().toISOString();
    const rows = games.map((g) => ({
      game_id: g.id,
      game_name: g.name,
      box_art_url: g.box_art_url ?? null,
      last_synced_at: now,
      updated_at: now,
    }));
    if (rows.length > 0) {
      const { error } = await admin.from("twitch_categories").upsert(rows, { onConflict: "game_id" });
      if (error) logs.push(`twitch_categories_upsert_failed ${error.message}`);
    }
  } catch (e) {
    logs.push(`twitch_categories_upsert_threw ${(e as Error).message}`);
  }

  // --- Collect streams ---
  const capturedAt = new Date().toISOString();
  const allStreams: HelixStream[] = [];
  const seenStreamKey = new Set<string>(); // dedup (broadcaster_id)

  outer: for (const game of games) {
    for (const lang of languages) {
      let cursor: string | undefined;
      for (let page = 0; page < maxPages; page++) {
        if (stats.calls >= HARD_CAP_HELIX_CALLS) {
          logs.push("hard_cap_helix_calls_reached");
          break outer;
        }
        const url = new URL("https://api.twitch.tv/helix/streams");
        url.searchParams.set("game_id", game.id);
        url.searchParams.set("language", lang);
        url.searchParams.set("first", "100");
        if (cursor) url.searchParams.set("after", cursor);

        const res = await helix<{ data: HelixStream[]; pagination?: { cursor?: string } }>(
          url.toString(), headers, stats,
        );

        if (res.status === 429) {
          logs.push(`rate_limited_pausing ${res.retryAfter}ms game=${game.name}`);
          await new Promise((r) => setTimeout(r, Math.min(res.retryAfter ?? 1000, 5000)));
          continue;
        }
        if (!res.ok || !res.data) {
          logs.push(`helix_streams_failed status=${res.status} game=${game.name} lang=${lang}`);
          break;
        }

        for (const s of res.data.data) {
          if (!s.user_id) continue;
          if (seenStreamKey.has(s.user_id)) continue;
          seenStreamKey.add(s.user_id);
          allStreams.push(s);
        }

        cursor = res.data.pagination?.cursor;
        if (!cursor || res.data.data.length === 0) break;
      }
    }
  }

  // --- Write stream snapshots (batched) ---
  const snapshotRows = allStreams.map((s) => ({
    captured_at: capturedAt,
    broadcaster_id: s.user_id,
    broadcaster_login: s.user_login,
    broadcaster_name: s.user_name ?? null,
    profile_image_url: null,
    game_id: s.game_id || null,
    game_name: s.game_name || null,
    language: s.language || null,
    title: s.title ?? null,
    viewer_count: s.viewer_count ?? 0,
    started_at: s.started_at || null,
    thumbnail_url: s.thumbnail_url ?? null,
  }));

  let snapshotsWritten = 0;
  if (snapshotRows.length > 0) {
    // Insert in chunks of 500 to stay safe.
    for (let i = 0; i < snapshotRows.length; i += 500) {
      const chunk = snapshotRows.slice(i, i + 500);
      const { error, count } = await admin
        .from("twitch_stream_snapshots")
        .upsert(chunk, { onConflict: "broadcaster_id,captured_at", count: "exact" });
      if (error) {
        logs.push(`stream_snapshots_upsert_failed ${error.message}`);
      } else {
        snapshotsWritten += count ?? chunk.length;
      }
    }
  }

  // --- Upsert channel index ---
  let channelsUpserted = 0;
  if (allStreams.length > 0) {
    // Fetch existing rows to compute lifetime_peak and snapshot_count properly.
    const ids = Array.from(seenStreamKey);
    const { data: existing } = await admin
      .from("twitch_channel_index")
      .select("broadcaster_id, lifetime_peak_viewers, snapshot_count, first_seen_at")
      .in("broadcaster_id", ids);
    const existingMap = new Map<string, { lifetime_peak_viewers: number; snapshot_count: number; first_seen_at: string }>();
    for (const r of (existing ?? []) as { broadcaster_id: string; lifetime_peak_viewers: number; snapshot_count: number; first_seen_at: string }[]) {
      existingMap.set(r.broadcaster_id, r);
    }

    const indexRows = allStreams.map((s) => {
      const prev = existingMap.get(s.user_id);
      const peak = Math.max(prev?.lifetime_peak_viewers ?? 0, s.viewer_count ?? 0);
      return {
        broadcaster_id: s.user_id,
        broadcaster_login: s.user_login,
        broadcaster_name: s.user_name ?? null,
        profile_image_url: null,
        broadcaster_type: null,
        first_seen_at: prev?.first_seen_at ?? capturedAt,
        last_seen_at: capturedAt,
        last_game_id: s.game_id || null,
        last_game_name: s.game_name || null,
        last_language: s.language || null,
        last_viewer_count: s.viewer_count ?? 0,
        lifetime_peak_viewers: peak,
        snapshot_count: (prev?.snapshot_count ?? 0) + 1,
        updated_at: capturedAt,
      };
    });

    for (let i = 0; i < indexRows.length; i += 500) {
      const chunk = indexRows.slice(i, i + 500);
      const { error, count } = await admin
        .from("twitch_channel_index")
        .upsert(chunk, { onConflict: "broadcaster_id", count: "exact" });
      if (error) {
        logs.push(`channel_index_upsert_failed ${error.message}`);
      } else {
        channelsUpserted += count ?? chunk.length;
      }
    }
  }

  // --- Compute and write game snapshots ---
  // Group by (game_id, language)
  const groups = new Map<string, HelixStream[]>();
  for (const s of allStreams) {
    if (!s.game_id) continue;
    const key = `${s.game_id}::${s.language ?? ""}`;
    const arr = groups.get(key) ?? [];
    arr.push(s);
    groups.set(key, arr);
  }

  const gameRows: Array<Record<string, unknown>> = [];
  for (const [key, streams] of groups) {
    const [gameId, language] = key.split("::");
    const viewers = streams.map((s) => s.viewer_count ?? 0).sort((a, b) => a - b);
    const total = viewers.reduce((a, b) => a + b, 0);
    const median = viewers.length === 0
      ? 0
      : viewers.length % 2 === 1
      ? viewers[(viewers.length - 1) / 2]
      : (viewers[viewers.length / 2 - 1] + viewers[viewers.length / 2]) / 2;
    const top = viewers[viewers.length - 1] ?? 0;
    const channels = streams.length;
    const ratio = channels > 0 ? total / channels : 0;
    gameRows.push({
      captured_at: capturedAt,
      game_id: gameId,
      game_name: streams[0].game_name || null,
      language: language || "",
      total_channels: channels,
      total_viewers: total,
      median_viewers: median,
      top_channel_viewers: top,
      viewer_channel_ratio: ratio,
    });
  }

  let gameSnapshotsWritten = 0;
  if (gameRows.length > 0) {
    const { error, count } = await admin
      .from("twitch_game_snapshots")
      .upsert(gameRows, { onConflict: "game_id,language,captured_at", count: "exact" });
    if (error) logs.push(`game_snapshots_upsert_failed ${error.message}`);
    else gameSnapshotsWritten = count ?? gameRows.length;
  }

  const durationMs = Date.now() - t0;
  const summary = {
    ok: true,
    captured_at: capturedAt,
    scope: {
      categories_requested: categoryNames.length,
      categories_resolved: games.length,
      languages,
      max_pages_per_combo: maxPages,
    },
    helix_calls: stats.calls,
    rate_limited: stats.rateLimited,
    streams_collected: allStreams.length,
    snapshots_written: snapshotsWritten,
    channels_upserted: channelsUpserted,
    game_snapshots_written: gameSnapshotsWritten,
    duration_ms: durationMs,
    logs,
  };

  console.log(JSON.stringify({ event: "twitch_market_snapshot_done", ...summary }));
  return json(summary, 200);
});
