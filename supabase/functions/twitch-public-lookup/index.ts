// Twitch public channel lookup + public enrichment (no user OAuth required).
//
// Pipeline (server-side only, App Access Token via client_credentials):
//   1. Identity        : GET /users?login=...  (fallback /search/channels)
//   2. Recent VODs     : GET /videos?user_id=...&first=20&type=archive
//   3. Recent clips    : GET /clips?broadcaster_id=...&first=20&started_at=last_30d
//   4. Live state      : GET /streams?user_id=...
//   5. Top game info   : GET /games?id=...  (resolve dominant category name)
//   6. Competitors     : GET /search/channels?query=<dominant_category>&first=20
//
// Returns a JSON payload the frontend uses to build an honest public teaser.
// We never fabricate followers — that requires moderator:read:followers scope
// on a connected user account.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeLogin(raw: string): string | null {
  if (!raw) return null;
  let v = raw.trim().toLowerCase();
  if (!v) return null;
  if (v.startsWith("@")) v = v.slice(1);
  if (v.includes("twitch.tv") || v.startsWith("http")) {
    try {
      const withProto = v.startsWith("http") ? v : `https://${v}`;
      const url = new URL(withProto);
      const seg = url.pathname.split("/").filter(Boolean);
      if (seg.length > 0) v = seg[0];
    } catch {
      const idx = v.indexOf("twitch.tv/");
      if (idx >= 0) v = v.slice(idx + "twitch.tv/".length).split("/")[0];
    }
  }
  v = v.split("?")[0].split("#")[0].trim();
  return /^[a-z0-9_]{3,25}$/.test(v) ? v : null;
}

let cachedAppToken: { token: string; expiresAt: number } | null = null;

async function getAppAccessToken(
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const now = Date.now();
  if (cachedAppToken && cachedAppToken.expiresAt - 60_000 > now) {
    return cachedAppToken.token;
  }
  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Twitch app token failed: ${res.status} ${txt}`);
  }
  const data = await res.json();
  cachedAppToken = {
    token: data.access_token,
    expiresAt: now + (data.expires_in ?? 3600) * 1000,
  };
  return cachedAppToken.token;
}

interface HelixUser {
  id: string;
  login: string;
  display_name: string;
  description?: string;
  profile_image_url?: string;
  broadcaster_type?: string;
  view_count?: number;
  created_at?: string;
}

interface HelixSearchChannel {
  id: string;
  broadcaster_login: string;
  display_name: string;
  thumbnail_url?: string;
  is_live?: boolean;
  game_name?: string;
  game_id?: string;
  title?: string;
  started_at?: string;
  broadcaster_language?: string;
}

interface HelixVideo {
  id: string;
  title: string;
  duration: string; // e.g. "3h21m45s"
  view_count: number;
  created_at: string;
  language: string;
  type: string; // archive | upload | highlight
  stream_id: string | null;
  url?: string;
  thumbnail_url?: string;
}

interface HelixClip {
  id: string;
  title: string;
  view_count: number;
  creator_name: string;
  created_at: string;
  duration: number;
  game_id: string;
  broadcaster_id: string;
}

interface HelixStream {
  id: string;
  user_id: string;
  user_login: string;
  game_id: string;
  game_name: string;
  type: string; // "live"
  title: string;
  viewer_count: number;
  started_at: string;
  language: string;
}

async function lookupChannel(
  login: string,
  helixHeaders: Record<string, string>,
): Promise<{ user: HelixUser; source: "exact_get_users" | "search_channels" } | null> {
  // 1) Exact via /users
  const usersRes = await fetch(
    `https://api.twitch.tv/helix/users?login=${encodeURIComponent(login)}`,
    { headers: helixHeaders },
  );
  if (usersRes.ok) {
    const usersJson = await usersRes.json();
    const u: HelixUser | undefined = usersJson?.data?.[0];
    if (u) return { user: u, source: "exact_get_users" };
  } else {
    console.warn("get_users failed", usersRes.status, await usersRes.text());
  }

  // 2) Fallback: /search/channels
  const searchRes = await fetch(
    `https://api.twitch.tv/helix/search/channels?query=${encodeURIComponent(login)}&first=20`,
    { headers: helixHeaders },
  );
  if (!searchRes.ok) return null;
  const searchJson = await searchRes.json();
  const results: HelixSearchChannel[] = searchJson?.data ?? [];
  const exact = results.find(
    (c) => c.broadcaster_login?.toLowerCase() === login,
  );
  if (!exact) return null;

  const u2 = await fetch(
    `https://api.twitch.tv/helix/users?id=${encodeURIComponent(exact.id)}`,
    { headers: helixHeaders },
  );
  if (!u2.ok) return null;
  const j = await u2.json();
  const full: HelixUser | undefined = j?.data?.[0];
  if (!full) return null;
  return { user: full, source: "search_channels" };
}

async function fetchRecentVideos(
  userId: string,
  helixHeaders: Record<string, string>,
  first = 100,
): Promise<HelixVideo[]> {
  const capped = Math.min(Math.max(first, 1), 100);
  const res = await fetch(
    `https://api.twitch.tv/helix/videos?user_id=${encodeURIComponent(userId)}&first=${capped}&type=archive&sort=time`,
    { headers: helixHeaders },
  );
  if (!res.ok) {
    console.warn("get_videos failed", res.status);
    return [];
  }
  const j = await res.json();
  return (j?.data ?? []) as HelixVideo[];
}

/**
 * Parse a Twitch duration string ("2h13m4s", "45m12s", "1h", "30s") to seconds.
 * Returns 0 for unparseable input.
 */
function parseTwitchDurationSeconds(d: string | null | undefined): number {
  if (!d) return 0;
  const m = d.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/);
  if (!m) return 0;
  const h = m[1] ? parseInt(m[1], 10) : 0;
  const mn = m[2] ? parseInt(m[2], 10) : 0;
  const s = m[3] ? parseInt(m[3], 10) : 0;
  return h * 3600 + mn * 60 + s;
}

/**
 * Derive aggregate public VOD activity facts from /helix/videos archives.
 * Server-side only. Returns aggregates only — never raw payloads or tokens.
 * `avg_viewers` is intentionally NOT derived here: Twitch does not expose
 * public concurrent average live viewers via this endpoint.
 */
export interface PublicVodFacts {
  vod_count_total: number;
  streams_30d: number;
  unique_stream_days_30d: number;
  total_hours_30d: number;
  avg_vod_views_30d: number | null;
  latest_vod_at: string | null;
}

function derivePublicVodFacts(videos: HelixVideo[]): PublicVodFacts {
  const cutoff = Date.now() - 30 * 86400000;
  const recent = videos.filter((v) => {
    const t = v.created_at ? new Date(v.created_at).getTime() : NaN;
    return Number.isFinite(t) && t >= cutoff;
  });
  const days = new Set<string>();
  let totalSeconds = 0;
  let viewSum = 0;
  for (const v of recent) {
    days.add(new Date(v.created_at).toISOString().slice(0, 10));
    totalSeconds += parseTwitchDurationSeconds(v.duration);
    viewSum += Number(v.view_count) || 0;
  }
  const latest = videos
    .map((v) => v.created_at)
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;
  return {
    vod_count_total: videos.length,
    streams_30d: recent.length,
    unique_stream_days_30d: days.size,
    total_hours_30d: Math.round((totalSeconds / 3600) * 10) / 10,
    avg_vod_views_30d: recent.length
      ? Math.round(viewSum / recent.length)
      : null,
    latest_vod_at: latest,
  };
}

async function fetchRecentClips(
  broadcasterId: string,
  helixHeaders: Record<string, string>,
): Promise<HelixClip[]> {
  const startedAt = new Date(Date.now() - 30 * 86400000).toISOString();
  const res = await fetch(
    `https://api.twitch.tv/helix/clips?broadcaster_id=${encodeURIComponent(broadcasterId)}&first=20&started_at=${encodeURIComponent(startedAt)}`,
    { headers: helixHeaders },
  );
  if (!res.ok) {
    console.warn("get_clips failed", res.status, await res.text());
    return [];
  }
  const j = await res.json();
  return (j?.data ?? []) as HelixClip[];
}

async function fetchLiveStream(
  userId: string,
  helixHeaders: Record<string, string>,
): Promise<HelixStream | null> {
  const res = await fetch(
    `https://api.twitch.tv/helix/streams?user_id=${encodeURIComponent(userId)}`,
    { headers: helixHeaders },
  );
  if (!res.ok) {
    console.warn("get_streams failed", res.status, await res.text());
    return null;
  }
  const j = await res.json();
  return (j?.data?.[0] as HelixStream | undefined) ?? null;
}

async function fetchGameName(
  gameId: string | null | undefined,
  helixHeaders: Record<string, string>,
): Promise<string | null> {
  if (!gameId) return null;
  const res = await fetch(
    `https://api.twitch.tv/helix/games?id=${encodeURIComponent(gameId)}`,
    { headers: helixHeaders },
  );
  if (!res.ok) return null;
  const j = await res.json();
  return j?.data?.[0]?.name ?? null;
}

async function fetchCompetitorCandidates(
  query: string,
  excludeLogin: string,
  helixHeaders: Record<string, string>,
): Promise<HelixSearchChannel[]> {
  if (!query) return [];
  const res = await fetch(
    `https://api.twitch.tv/helix/search/channels?query=${encodeURIComponent(query)}&first=20&live_only=false`,
    { headers: helixHeaders },
  );
  if (!res.ok) return [];
  const j = await res.json();
  const results = (j?.data ?? []) as HelixSearchChannel[];
  return results
    .filter((c) => c.broadcaster_login?.toLowerCase() !== excludeLogin)
    .slice(0, 12);
}

async function batchUsers(
  ids: string[],
  helixHeaders: Record<string, string>,
): Promise<Map<string, HelixUser>> {
  const out = new Map<string, HelixUser>();
  if (ids.length === 0) return out;
  const url =
    "https://api.twitch.tv/helix/users?" +
    ids.map((id) => `id=${encodeURIComponent(id)}`).join("&");
  const res = await fetch(url, { headers: helixHeaders });
  if (!res.ok) return out;
  const j = await res.json();
  for (const u of (j?.data ?? []) as HelixUser[]) out.set(u.id, u);
  return out;
}

async function batchStreams(
  ids: string[],
  helixHeaders: Record<string, string>,
): Promise<Map<string, HelixStream>> {
  const out = new Map<string, HelixStream>();
  if (ids.length === 0) return out;
  const url =
    "https://api.twitch.tv/helix/streams?" +
    ids.map((id) => `user_id=${encodeURIComponent(id)}`).join("&");
  const res = await fetch(url, { headers: helixHeaders });
  if (!res.ok) return out;
  const j = await res.json();
  for (const s of (j?.data ?? []) as HelixStream[]) out.set(s.user_id, s);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const clientId = Deno.env.get("TWITCH_CLIENT_ID");
    const clientSecret = Deno.env.get("TWITCH_CLIENT_SECRET");
    if (!clientId || !clientSecret) {
      return json({ error: "Twitch credentials not configured." }, 500);
    }

    let body: {
      input?: string;
      mode?:
        | "lookup"
        | "search"
        | "category"
        | "category_search"
        | "category_all";
      limit?: number;
      language?: string;
    } = {};
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body." }, 400);
    }
    const rawInput = (body.input ?? "").toString().trim();
    const mode = body.mode ?? "lookup";

    const token = await getAppAccessToken(clientId, clientSecret);
    const helixHeaders = {
      "Client-ID": clientId,
      Authorization: `Bearer ${token}`,
    };

    // Lightweight channel autocomplete (streamer name).
    if (mode === "search") {
      if (rawInput.length < 2) {
        return json({ success: true, mode: "search", suggestions: [] });
      }
      const limit = Math.min(Math.max(body.limit ?? 8, 1), 20);
      const res = await fetch(
        `https://api.twitch.tv/helix/search/channels?query=${encodeURIComponent(rawInput)}&first=${limit}&live_only=false`,
        { headers: helixHeaders },
      );
      if (!res.ok) {
        return json({ success: true, mode: "search", suggestions: [] });
      }
      const j = await res.json();
      const results = (j?.data ?? []) as HelixSearchChannel[];
      return json({
        success: true,
        mode: "search",
        suggestions: results.map((c) => ({
          id: c.id,
          login: c.broadcaster_login,
          display_name: c.display_name,
          thumbnail_url: c.thumbnail_url ?? null,
          is_live: c.is_live ?? false,
          game_name: c.game_name ?? null,
          language: c.broadcaster_language ?? null,
        })),
      });
    }

    // Category autocomplete (real game/category entities, not streamer names).
    if (mode === "category_search") {
      if (rawInput.length < 2) {
        return json({ success: true, mode: "category_search", categories: [] });
      }
      const limit = Math.min(Math.max(body.limit ?? 8, 1), 20);
      const res = await fetch(
        `https://api.twitch.tv/helix/search/categories?query=${encodeURIComponent(rawInput)}&first=${limit}`,
        { headers: helixHeaders },
      );
      if (!res.ok) {
        return json({ success: true, mode: "category_search", categories: [] });
      }
      const j = await res.json();
      const results = (j?.data ?? []) as Array<{
        id: string;
        name: string;
        box_art_url?: string;
      }>;
      return json({
        success: true,
        mode: "category_search",
        categories: results.map((c) => ({
          id: c.id,
          name: c.name,
          box_art_url: c.box_art_url ?? null,
        })),
      });
    }

    // Real category-based leaderboard:
    //   1. Resolve category name → canonical game_id via /helix/games?name=
    //   2. /helix/streams?game_id=...   (real live ranking, viewer_count desc)
    //   3. Batch /helix/users for avatars + broadcaster_type
    if (mode === "category") {
      if (!rawInput) {
        return json({ success: false, reason: "missing_category" });
      }
      const gameRes = await fetch(
        `https://api.twitch.tv/helix/games?name=${encodeURIComponent(rawInput)}`,
        { headers: helixHeaders },
      );
      if (!gameRes.ok) {
        return json({ success: false, reason: "game_lookup_failed" });
      }
      const gameJson = await gameRes.json();
      const game = gameJson?.data?.[0] as
        | { id: string; name: string; box_art_url?: string }
        | undefined;
      if (!game) {
        return json({
          success: false,
          reason: "category_not_found",
          input: rawInput,
        });
      }

      const limit = Math.min(Math.max(body.limit ?? 30, 5), 60);
      const langParam =
        body.language && body.language !== "all"
          ? `&language=${encodeURIComponent(body.language)}`
          : "";
      const streamsRes = await fetch(
        `https://api.twitch.tv/helix/streams?game_id=${encodeURIComponent(game.id)}&first=${limit}${langParam}`,
        { headers: helixHeaders },
      );
      if (!streamsRes.ok) {
        return json({ success: false, reason: "streams_fetch_failed" });
      }
      const streamsJson = await streamsRes.json();
      const streams = (streamsJson?.data ?? []) as HelixStream[];

      const userIds = streams.map((s) => s.user_id);
      const users = await batchUsers(userIds, helixHeaders);

      return json({
        success: true,
        mode: "category",
        category: {
          id: game.id,
          name: game.name,
          box_art_url: game.box_art_url ?? null,
        },
        channels: streams.map((s, idx) => {
          const u = users.get(s.user_id);
          return {
            rank: idx + 1,
            id: s.user_id,
            login: s.user_login,
            display_name: u?.display_name ?? s.user_login,
            profile_image_url: u?.profile_image_url ?? null,
            broadcaster_type: u?.broadcaster_type ?? "",
            description: u?.description ?? "",
            view_count: u?.view_count ?? 0,
            is_live: true,
            live_viewer_count: s.viewer_count,
            title: s.title,
            game_name: s.game_name,
            game_id: s.game_id,
            language: s.language ?? null,
            started_at: s.started_at,
          };
        }),
      });
    }

    // Indexed Streamnco leaderboard for a given Twitch category, enriched with
    // current live data when possible. Reads channel_stream_scores (public-read
    // RLS) — never exhaustive across Twitch.
    if (mode === "category_all") {
      if (!rawInput) {
        return json({ success: false, reason: "missing_category" });
      }

      const gameRes = await fetch(
        `https://api.twitch.tv/helix/games?name=${encodeURIComponent(rawInput)}`,
        { headers: helixHeaders },
      );
      let category: { id: string; name: string; box_art_url: string | null } | null = null;
      if (gameRes.ok) {
        const gj = await gameRes.json();
        const g = gj?.data?.[0] as
          | { id: string; name: string; box_art_url?: string }
          | undefined;
        if (g) {
          category = { id: g.id, name: g.name, box_art_url: g.box_art_url ?? null };
        }
      }
      if (!category) {
        return json({
          success: false,
          reason: "category_not_found",
          input: rawInput,
        });
      }

      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY");
      if (!supabaseUrl || !supabaseAnon) {
        return json({ success: false, reason: "db_unavailable" }, 500);
      }
      const db = createClient(supabaseUrl, supabaseAnon);

      const limit = Math.min(Math.max(body.limit ?? 50, 1), 100);
      const langFilter =
        body.language && body.language !== "all" ? body.language : null;

      // Primary candidate source = indexed Streamnco scores. We never fall
      // back to /helix/streams here — that is the Score Live tab's job.
      let q = db
        .from("channel_stream_scores")
        .select(
          "platform_user_id, login, display_name, profile_image_url, broadcaster_type, stream_score, language, game_name, game_id, score_updated_at, updated_at",
        )
        .eq("platform", "twitch")
        .not("stream_score", "is", null)
        .or(`game_id.eq.${category.id},game_name.eq.${category.name.replace(/,/g, "")}`)
        .order("stream_score", { ascending: false })
        .order("live_viewer_count", { ascending: false, nullsFirst: false })
        .order("updated_at", { ascending: false })
        .limit(limit);

      if (langFilter) q = q.eq("language", langFilter);

      const { data: rows, error: dbErr } = await q;
      if (dbErr) {
        return json({ success: false, reason: "db_error" }, 500);
      }

      const liveByPid = new Map<string, HelixStream>();
      const ids = (rows ?? [])
        .map((r: { platform_user_id: string }) => r.platform_user_id)
        .filter(Boolean);
      if (ids.length > 0) {
        try {
          const live = await batchStreams(ids, helixHeaders);
          live.forEach((s, pid) => liveByPid.set(pid, s));
        } catch {
          // swallow — return cached rows without live enrichment
        }
      }

      const nowIso = new Date().toISOString();
      const channels = (rows ?? []).map(
        (r: {
          platform_user_id: string;
          login: string;
          display_name: string;
          profile_image_url: string | null;
          broadcaster_type: string | null;
          stream_score: number;
          language: string | null;
          game_name: string;
          score_updated_at: string;
          updated_at: string | null;
        }) => {
          const live = liveByPid.get(r.platform_user_id);
          return {
            login: r.login,
            display_name: r.display_name,
            profile_image_url: r.profile_image_url ?? null,
            broadcaster_type: r.broadcaster_type ?? null,
            stream_score: r.stream_score,
            is_live: !!live,
            live_viewer_count: live?.viewer_count ?? null,
            language: r.language ?? null,
            game_name: r.game_name,
            updated_at: r.updated_at ?? r.score_updated_at,
            live_updated_at: live ? nowIso : null,
          };
        },
      );

      const coverageLevel: "empty" | "low" | "medium" | "good" =
        channels.length === 0 ? "empty"
        : channels.length < 10 ? "low"
        : channels.length < 50 ? "medium"
        : "good";

      return json({
        success: true,
        category,
        channels,
        meta: {
          scope: "streamnco_indexed_category",
          is_exhaustive: false,
          includes_offline: true,
          source: "channel_stream_scores",
          live_enriched: true,
          indexed_count: channels.length,
          coverage_level: coverageLevel,
          cache_ttl_minutes: 60,
        },
      });
    }

    const login = normalizeLogin(rawInput);
    if (!login) {
      return json({
        success: false,
        reason: "invalid_input",
        raw_input: rawInput,
      });
    }

    const lookup = await lookupChannel(login, helixHeaders);
    if (!lookup) {
      return json({
        success: false,
        reason: "not_found",
        searched_login: login,
      });
    }

    const u = lookup.user;

    // Enrich in parallel — failures degrade gracefully.
    const [videos, clips, live] = await Promise.all([
      fetchRecentVideos(u.id, helixHeaders),
      fetchRecentClips(u.id, helixHeaders),
      fetchLiveStream(u.id, helixHeaders),
    ]);

    // Resolve dominant category name from clips' game_ids (most frequent)
    const gameCounts: Record<string, number> = {};
    for (const c of clips) {
      if (c.game_id) gameCounts[c.game_id] = (gameCounts[c.game_id] ?? 0) + 1;
    }
    const topGameId =
      Object.entries(gameCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ??
      live?.game_id ??
      null;
    const topGameName =
      live?.game_name ?? (await fetchGameName(topGameId, helixHeaders));

    // Competitor candidates from real Search Channels (best-effort)
    const competitorQuery = topGameName ?? "";
    const competitors = await fetchCompetitorCandidates(
      competitorQuery,
      u.login.toLowerCase(),
      helixHeaders,
    );

    // Enrich candidates with /users (description, view_count) and /streams
    // (live viewer_count + game_name) so the frontend can run a meaningful
    // weighted similarity (language, type, format, size, activity).
    const candidateIds = competitors.map((c) => c.id).filter(Boolean);
    const [candUsers, candStreams] = await Promise.all([
      batchUsers(candidateIds, helixHeaders),
      batchStreams(candidateIds, helixHeaders),
    ]);

    return json({
      success: true,
      source: lookup.source,
      login: u.login,
      channel: {
        id: u.id,
        login: u.login,
        display_name: u.display_name,
        description: u.description ?? "",
        profile_image_url: u.profile_image_url ?? "",
        broadcaster_type: u.broadcaster_type ?? "",
        view_count: u.view_count ?? 0,
        created_at: u.created_at ?? null,
      },
      videos: videos.map((v) => ({
        id: v.id,
        title: v.title,
        duration: v.duration,
        view_count: v.view_count,
        created_at: v.created_at,
        language: v.language,
        type: v.type,
        stream_id: v.stream_id,
        thumbnail_url: v.thumbnail_url
          ? v.thumbnail_url
              .replace(/%\{width\}x%\{height\}/g, "440x248")
              .replace(/\{width\}x\{height\}/g, "440x248")
          : null,
        url: v.url ?? null,
      })),
      clips: clips.map((c) => ({
        id: c.id,
        title: c.title,
        view_count: c.view_count,
        creator_name: c.creator_name,
        created_at: c.created_at,
        duration: c.duration,
        game_id: c.game_id,
      })),
      live: live
        ? {
            id: live.id,
            title: live.title,
            game_id: live.game_id,
            game_name: live.game_name,
            viewer_count: live.viewer_count,
            started_at: live.started_at,
            language: live.language,
          }
        : null,
      dominant_category: topGameName ?? null,
      vod_facts: derivePublicVodFacts(videos),
      competitors: competitors.map((c) => {
        const userInfo = candUsers.get(c.id);
        const streamInfo = candStreams.get(c.id);
        return {
          id: c.id,
          login: c.broadcaster_login,
          display_name: c.display_name,
          thumbnail_url: c.thumbnail_url ?? null,
          is_live: streamInfo ? true : c.is_live ?? false,
          game_name: streamInfo?.game_name ?? c.game_name ?? null,
          title: streamInfo?.title ?? c.title ?? null,
          started_at: streamInfo?.started_at ?? c.started_at ?? null,
          language:
            streamInfo?.language ?? c.broadcaster_language ?? null,
          live_viewer_count: streamInfo?.viewer_count ?? null,
          description: userInfo?.description ?? "",
          broadcaster_type: userInfo?.broadcaster_type ?? "",
          view_count: userInfo?.view_count ?? 0,
        };
      }),
    });
  } catch (e) {
    console.error("twitch-public-lookup error", e);
    return json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      500,
    );
  }
});
