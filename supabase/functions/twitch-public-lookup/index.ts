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
): Promise<HelixVideo[]> {
  const res = await fetch(
    `https://api.twitch.tv/helix/videos?user_id=${encodeURIComponent(userId)}&first=20&type=archive&sort=time`,
    { headers: helixHeaders },
  );
  if (!res.ok) {
    console.warn("get_videos failed", res.status, await res.text());
    return [];
  }
  const j = await res.json();
  return (j?.data ?? []) as HelixVideo[];
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

    let body: { input?: string } = {};
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body." }, 400);
    }
    const rawInput = (body.input ?? "").toString();
    const login = normalizeLogin(rawInput);
    if (!login) {
      return json({
        success: false,
        reason: "invalid_input",
        raw_input: rawInput,
      });
    }

    const token = await getAppAccessToken(clientId, clientSecret);
    const helixHeaders = {
      "Client-ID": clientId,
      Authorization: `Bearer ${token}`,
    };

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
