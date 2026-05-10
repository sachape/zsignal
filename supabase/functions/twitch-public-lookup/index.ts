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

    let body: {
      input?: string;
      category?: string;
      mode?: "lookup" | "search" | "category" | "category_search" | "category_all";
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

    // ────────────────────────────────────────────────────────────────────
    // category_all: Global Twitch category leaderboard scored by Streamnco
    // from public Twitch data. NOT a Streamnco-user leaderboard.
    // ────────────────────────────────────────────────────────────────────
    if (mode === "category_all") {
      const categoryInput = (body.category ?? body.input ?? "").toString().trim();
      if (!categoryInput) {
        return json({ success: false, reason: "missing_category" });
      }

      const limit = Math.min(Math.max(body.limit ?? 50, 5), 100);
      const langFilter = body.language && body.language !== "all" ? body.language : null;

      // 1) Resolve category
      const gameRes = await fetch(
        `https://api.twitch.tv/helix/games?name=${encodeURIComponent(categoryInput)}`,
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
        return json({ success: false, reason: "category_not_found", input: categoryInput });
      }

      // 2) Fetch live streams in category (with optional language filter)
      const langParam = langFilter ? `&language=${encodeURIComponent(langFilter)}` : "";
      let streams: HelixStream[] = [];
      let twitchOk = true;
      try {
        const sRes = await fetch(
          `https://api.twitch.tv/helix/streams?game_id=${encodeURIComponent(game.id)}&first=${limit}${langParam}`,
          { headers: helixHeaders },
        );
        if (sRes.ok) {
          const sJson = await sRes.json();
          streams = (sJson?.data ?? []) as HelixStream[];
        } else {
          twitchOk = false;
        }
      } catch {
        twitchOk = false;
      }

      // 3) Batch /helix/users
      const userIds = streams.map((s) => s.user_id);
      const users = userIds.length > 0
        ? await batchUsers(userIds, helixHeaders)
        : new Map<string, HelixUser>();

      // 4) Compute public StreamScore per channel
      const scoreFor = (s: HelixStream, u: HelixUser | undefined) => {
        const v = s.viewer_count ?? 0;
        const liveScore = Math.min(60, Math.log10(v + 1) * 18);
        const bt = u?.broadcaster_type ?? "";
        const statusScore = bt === "partner" ? 20 : bt === "affiliate" ? 12 : 0;
        const reachScore = Math.min(15, Math.log10((u?.view_count ?? 0) + 1) * 2.5);
        let uptimeScore = 0;
        if (s.started_at) {
          const hours = (Date.now() - new Date(s.started_at).getTime()) / 3_600_000;
          uptimeScore = Math.min(5, Math.max(0, hours));
        }
        const total = Math.max(0, Math.min(100, Math.round(liveScore + statusScore + reachScore + uptimeScore)));
        let signals = 0;
        if (v > 0) signals++;
        if (bt) signals++;
        if ((u?.view_count ?? 0) > 0) signals++;
        if (s.started_at) signals++;
        const confidence: "low" | "medium" | "high" =
          signals >= 4 ? "high" : signals >= 2 ? "medium" : "low";
        return { score: total, confidence };
      };

      type ScoredRow = {
        rank: number;
        login: string;
        display_name: string;
        profile_image_url: string | null;
        broadcaster_type: string;
        stream_score: number;
        score_confidence: "low" | "medium" | "high";
        is_live: boolean;
        live_viewer_count: number | null;
        language: string | null;
        game_name: string;
        game_id: string;
        platform_user_id: string;
      };

      let scored: ScoredRow[] = streams.map((s) => {
        const u = users.get(s.user_id);
        const { score, confidence } = scoreFor(s, u);
        return {
          rank: 0,
          login: s.user_login,
          display_name: u?.display_name ?? s.user_login,
          profile_image_url: u?.profile_image_url ?? null,
          broadcaster_type: u?.broadcaster_type ?? "",
          stream_score: score,
          score_confidence: confidence,
          is_live: true,
          live_viewer_count: s.viewer_count,
          language: s.language ?? null,
          game_name: game.name,
          game_id: game.id,
          platform_user_id: s.user_id,
        };
      });

      // 5) Cache: upsert into channel_stream_scores (best-effort, service-role)
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      let cacheUsed: "fresh" | "stale_fallback" | "skipped" = "skipped";

      if (supabaseUrl && serviceKey && scored.length > 0) {
        try {
          const nowIso = new Date().toISOString();
          const rows = scored.map((r) => ({
            platform: "twitch",
            platform_user_id: r.platform_user_id,
            login: r.login,
            display_name: r.display_name,
            profile_image_url: r.profile_image_url,
            broadcaster_type: r.broadcaster_type || null,
            game_id: r.game_id,
            game_name: r.game_name,
            language: r.language ?? "",
            stream_score: r.stream_score,
            confidence: r.score_confidence,
            signal_quality: r.score_confidence,
            is_live: true,
            live_viewer_count: r.live_viewer_count,
            score_updated_at: nowIso,
            live_updated_at: nowIso,
            updated_at: nowIso,
          }));
          const upsertRes = await fetch(
            `${supabaseUrl}/rest/v1/channel_stream_scores?on_conflict=platform,platform_user_id,game_name,language`,
            {
              method: "POST",
              headers: {
                apikey: serviceKey,
                Authorization: `Bearer ${serviceKey}`,
                "Content-Type": "application/json",
                Prefer: "resolution=merge-duplicates,return=minimal",
              },
              body: JSON.stringify(rows),
            },
          );
          if (!upsertRes.ok) {
            console.warn("channel_stream_scores upsert", upsertRes.status, await upsertRes.text());
          } else {
            cacheUsed = "fresh";
          }
        } catch (err) {
          console.warn("channel_stream_scores upsert failed", err);
        }
      }

      // 5b) Stale fallback if Twitch failed
      if (!twitchOk && scored.length === 0 && supabaseUrl && serviceKey) {
        try {
          const params = new URLSearchParams({
            select: "platform_user_id,login,display_name,profile_image_url,broadcaster_type,game_id,game_name,language,stream_score,confidence,is_live,live_viewer_count",
            game_id: `eq.${game.id}`,
            order: "stream_score.desc",
            limit: String(limit),
          });
          if (langFilter) params.set("language", `eq.${langFilter}`);
          const cacheRes = await fetch(
            `${supabaseUrl}/rest/v1/channel_stream_scores?${params.toString()}`,
            { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
          );
          if (cacheRes.ok) {
            const cacheRows = await cacheRes.json() as Array<Record<string, unknown>>;
            scored = cacheRows.map((r) => ({
              rank: 0,
              login: String(r.login),
              display_name: String(r.display_name),
              profile_image_url: (r.profile_image_url as string) ?? null,
              broadcaster_type: (r.broadcaster_type as string) ?? "",
              stream_score: Number(r.stream_score) || 0,
              score_confidence: ((r.confidence as string) ?? "low") as "low" | "medium" | "high",
              is_live: Boolean(r.is_live),
              live_viewer_count: (r.live_viewer_count as number | null) ?? null,
              language: (r.language as string) || null,
              game_name: String(r.game_name),
              game_id: String(r.game_id),
              platform_user_id: String(r.platform_user_id),
            }));
            cacheUsed = "stale_fallback";
          }
        } catch (err) {
          console.warn("channel_stream_scores cache read failed", err);
        }
      }

      // 6) Sort and rank
      scored.sort((a, b) => {
        if (b.stream_score !== a.stream_score) return b.stream_score - a.stream_score;
        return (b.live_viewer_count ?? 0) - (a.live_viewer_count ?? 0);
      });
      scored = scored.map((r, i) => ({ ...r, rank: i + 1 }));

      return json({
        success: true,
        mode: "category_all",
        category: {
          id: game.id,
          name: game.name,
          box_art_url: game.box_art_url ?? null,
        },
        channels: scored.map((r) => ({
          rank: r.rank,
          login: r.login,
          display_name: r.display_name,
          profile_image_url: r.profile_image_url,
          broadcaster_type: r.broadcaster_type,
          stream_score: r.stream_score,
          score_confidence: r.score_confidence,
          is_live: r.is_live,
          live_viewer_count: r.live_viewer_count,
          language: r.language,
          game_name: r.game_name,
        })),
        meta: {
          scope: "global_twitch_public_live",
          is_exhaustive: false,
          source: cacheUsed === "stale_fallback" ? "channel_stream_scores_cache" : "twitch_public_api",
          cache_ttl_minutes: 60,
          cache: cacheUsed,
        },
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
