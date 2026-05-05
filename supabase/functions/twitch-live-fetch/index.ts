// Twitch live fetch edge function (HARDENED)
//
// For the currently connected user, fetches:
//   - canonical /users profile (Helix)
//   - REAL follower count (/channels/followers) when scope is granted
//   - recent VODs (/videos)
//   - recent clips (/clips, last 30d)
//   - live stream snapshot (/streams)
//   - dominant category name (/games)
//   - competitor candidates (/search/channels) enriched with /users + /streams
//
// All Twitch calls are server-side only. The client receives a typed payload
// it uses to assemble a fully-live report (no mock contamination).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const REQUIRED_FOLLOWERS_SCOPE = "moderator:read:followers";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface HelixVideo {
  id: string;
  title: string;
  duration: string;
  view_count: number;
  created_at: string;
  language: string;
  type: string;
  stream_id: string | null;
}
interface HelixClip {
  id: string;
  title: string;
  view_count: number;
  creator_name: string;
  created_at: string;
  duration: number;
  game_id: string;
}
interface HelixStream {
  id: string;
  user_id: string;
  user_login?: string;
  user_name?: string;
  game_id: string;
  game_name: string;
  title: string;
  viewer_count: number;
  started_at: string;
  language: string;
  thumbnail_url?: string;
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
interface HelixUserSlim {
  id: string;
  login: string;
  display_name: string;
  description?: string;
  broadcaster_type?: string;
  view_count?: number;
  /** Canonical Twitch avatar — only retrievable from /helix/users. */
  profile_image_url?: string;
}

// ---- App Access Token cache (used for /search/channels, batched lookups) ----
let cachedAppToken: { token: string; expiresAt: number } | null = null;
async function getAppAccessToken(
  clientId: string,
  clientSecret: string,
): Promise<string | null> {
  const now = Date.now();
  if (cachedAppToken && cachedAppToken.expiresAt - 60_000 > now) {
    return cachedAppToken.token;
  }
  try {
    const res = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials",
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    cachedAppToken = {
      token: data.access_token,
      expiresAt: now + (data.expires_in ?? 3600) * 1000,
    };
    return cachedAppToken.token;
  } catch (e) {
    console.warn("[twitch-live-fetch] app token failed", e);
    return null;
  }
}

async function fetchVideos(
  userId: string,
  headers: Record<string, string>,
): Promise<HelixVideo[]> {
  try {
    const res = await fetch(
      `https://api.twitch.tv/helix/videos?user_id=${encodeURIComponent(userId)}&first=20&type=archive&sort=time`,
      { headers },
    );
    if (!res.ok) return [];
    const j = await res.json();
    return (j?.data ?? []) as HelixVideo[];
  } catch {
    return [];
  }
}

async function fetchClips(
  broadcasterId: string,
  headers: Record<string, string>,
): Promise<HelixClip[]> {
  try {
    const startedAt = new Date(Date.now() - 30 * 86400000).toISOString();
    const res = await fetch(
      `https://api.twitch.tv/helix/clips?broadcaster_id=${encodeURIComponent(broadcasterId)}&first=20&started_at=${encodeURIComponent(startedAt)}`,
      { headers },
    );
    if (!res.ok) return [];
    const j = await res.json();
    return (j?.data ?? []) as HelixClip[];
  } catch {
    return [];
  }
}

async function fetchLive(
  userId: string,
  headers: Record<string, string>,
): Promise<HelixStream | null> {
  try {
    const res = await fetch(
      `https://api.twitch.tv/helix/streams?user_id=${encodeURIComponent(userId)}`,
      { headers },
    );
    if (!res.ok) return null;
    const j = await res.json();
    return (j?.data?.[0] as HelixStream | undefined) ?? null;
  } catch {
    return null;
  }
}

async function fetchGameName(
  gameId: string | null | undefined,
  headers: Record<string, string>,
): Promise<string | null> {
  if (!gameId) return null;
  try {
    const res = await fetch(
      `https://api.twitch.tv/helix/games?id=${encodeURIComponent(gameId)}`,
      { headers },
    );
    if (!res.ok) return null;
    const j = await res.json();
    return j?.data?.[0]?.name ?? null;
  } catch {
    return null;
  }
}

async function fetchCompetitorCandidates(
  query: string,
  excludeLogin: string,
  headers: Record<string, string>,
): Promise<HelixSearchChannel[]> {
  if (!query) return [];
  try {
    const res = await fetch(
      `https://api.twitch.tv/helix/search/channels?query=${encodeURIComponent(query)}&first=40&live_only=false`,
      { headers },
    );
    if (!res.ok) return [];
    const j = await res.json();
    const results = (j?.data ?? []) as HelixSearchChannel[];
    return results
      .filter((c) => c.broadcaster_login?.toLowerCase() !== excludeLogin)
      .slice(0, 30);
  } catch {
    return [];
  }
}

/**
 * Real category leaderboard via /streams?game_id — gives us the actual top
 * live channels in the dominant category, ranked by viewer_count. This is a
 * much broader discovery surface than name-matched /search/channels alone.
 */
async function fetchTopLiveInCategory(
  gameId: string,
  excludeLogin: string,
  headers: Record<string, string>,
  language?: string,
): Promise<HelixStream[]> {
  if (!gameId) return [];
  try {
    const langParam = language ? `&language=${encodeURIComponent(language)}` : "";
    const res = await fetch(
      `https://api.twitch.tv/helix/streams?game_id=${encodeURIComponent(gameId)}&first=50${langParam}`,
      { headers },
    );
    if (!res.ok) return [];
    const j = await res.json();
    const streams = (j?.data ?? []) as HelixStream[];
    return streams.filter(
      (s) => (s.user_login ?? "").toLowerCase() !== excludeLogin,
    );
  } catch {
    return [];
  }
}

async function batchUsers(
  ids: string[],
  headers: Record<string, string>,
): Promise<Map<string, HelixUserSlim>> {
  const out = new Map<string, HelixUserSlim>();
  if (ids.length === 0) return out;
  try {
    const url =
      "https://api.twitch.tv/helix/users?" +
      ids.map((id) => `id=${encodeURIComponent(id)}`).join("&");
    const res = await fetch(url, { headers });
    if (!res.ok) return out;
    const j = await res.json();
    for (const u of (j?.data ?? []) as HelixUserSlim[]) out.set(u.id, u);
  } catch { /* swallow */ }
  return out;
}

async function batchStreams(
  ids: string[],
  headers: Record<string, string>,
): Promise<Map<string, HelixStream>> {
  const out = new Map<string, HelixStream>();
  if (ids.length === 0) return out;
  try {
    const url =
      "https://api.twitch.tv/helix/streams?" +
      ids.map((id) => `user_id=${encodeURIComponent(id)}`).join("&");
    const res = await fetch(url, { headers });
    if (!res.ok) return out;
    const j = await res.json();
    for (const s of (j?.data ?? []) as HelixStream[]) out.set(s.user_id, s);
  } catch { /* swallow */ }
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization." }, 401);

    // Optional hints from the client to seed candidate discovery when the
    // connected account itself lacks recent activity (no live stream, no
    // recent clips => no dominant category from personal data alone).
    let categoryHint: string | null = null;
    let languageHint: string | null = null;
    try {
      const body = await req.clone().json().catch(() => ({}));
      if (body && typeof body.category_hint === "string" && body.category_hint.trim()) {
        categoryHint = body.category_hint.trim();
      }
      if (body && typeof body.language_hint === "string" && body.language_hint.trim()) {
        languageHint = body.language_hint.trim();
      }
    } catch { /* ignore */ }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: account, error: acctErr } = await admin
      .from("connected_accounts")
      .select(
        "id, platform_user_id, platform_login, platform_display_name, access_token_encrypted, refresh_token_encrypted, scope, expires_at",
      )
      .eq("user_id", user.id)
      .eq("platform", "twitch")
      .maybeSingle();

    if (acctErr || !account) {
      return json({ error: "No connected Twitch account." }, 404);
    }

    // Decrypt tokens server-side. Legacy raw values pass through unchanged.
    // We then opportunistically re-encrypt them so the row is upgraded in place
    // without requiring an explicit migration script.
    const { encryptToken, decryptToken, isEncrypted } = await import(
      "../_shared/tokenCrypto.ts"
    );
    let accessToken = await decryptToken(account.access_token_encrypted as string | null);
    const refreshTokenPlain = await decryptToken(
      account.refresh_token_encrypted as string | null,
    );
    const legacyAccess = !!account.access_token_encrypted &&
      !isEncrypted(account.access_token_encrypted as string);
    const legacyRefresh = !!account.refresh_token_encrypted &&
      !isEncrypted(account.refresh_token_encrypted as string);
    if (legacyAccess || legacyRefresh) {
      await admin
        .from("connected_accounts")
        .update({
          access_token_encrypted: accessToken ? await encryptToken(accessToken) : null,
          refresh_token_encrypted: refreshTokenPlain
            ? await encryptToken(refreshTokenPlain)
            : null,
        })
        .eq("id", account.id);
    }
    const scope = (account.scope as string) ?? "";
    const hasFollowersScope = scope
      .split(/\s+/)
      .map((s) => s.trim())
      .includes(REQUIRED_FOLLOWERS_SCOPE);

    // ---- Refresh user token if expired/about-to-expire ----
    const expiresAt = account.expires_at ? new Date(account.expires_at).getTime() : 0;
    const needsRefresh =
      !accessToken || (expiresAt && expiresAt - Date.now() < 60_000);

    if (needsRefresh && refreshTokenPlain) {
      const refreshRes = await fetch("https://id.twitch.tv/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "refresh_token",
          refresh_token: refreshTokenPlain,
        }),
      });
      const refreshData = await refreshRes.json();
      if (refreshRes.ok && refreshData.access_token) {
        accessToken = refreshData.access_token;
        const newExpires = new Date(
          Date.now() + (refreshData.expires_in ?? 3600) * 1000,
        ).toISOString();
        const newScope = Array.isArray(refreshData.scope)
          ? refreshData.scope.join(" ")
          : (refreshData.scope ?? scope);
        const newRefresh = refreshData.refresh_token ?? refreshTokenPlain;
        await admin
          .from("connected_accounts")
          .update({
            access_token_encrypted: await encryptToken(accessToken),
            refresh_token_encrypted: await encryptToken(newRefresh),
            scope: newScope,
            expires_at: newExpires,
          })
          .eq("id", account.id);
      } else {
        // Do not log refreshData — could leak token-bearing payloads.
        console.warn("[twitch-live-fetch] refresh failed", { status: refreshRes.status });
      }
    }

    const userHeaders = {
      Authorization: `Bearer ${accessToken}`,
      "Client-Id": clientId,
    };

    // ---- 1. /users (canonical profile) ----
    const userRes = await fetch("https://api.twitch.tv/helix/users", {
      headers: userHeaders,
    });
    const userJson = await userRes.json();
    if (!userRes.ok || !userJson.data?.[0]) {
      console.error("[twitch-live-fetch] /users failed", userJson);
      return json(
        { error: "Failed to fetch Twitch user.", details: userJson },
        userRes.status === 401 ? 401 : 502,
      );
    }
    const tw = userJson.data[0];
    const broadcasterId = tw.id as string;
    const broadcasterLogin = (tw.login as string).toLowerCase();

    // ---- 2. Followers (only when scope granted) ----
    let followerCount: number | null = null;
    let followersAvailable = false;
    if (hasFollowersScope) {
      try {
        const followersRes = await fetch(
          `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${encodeURIComponent(broadcasterId)}`,
          { headers: userHeaders },
        );
        const followersJson = await followersRes.json();
        if (followersRes.ok && typeof followersJson.total === "number") {
          followerCount = followersJson.total as number;
          followersAvailable = true;
        } else {
          console.warn(
            "[twitch-live-fetch] /channels/followers failed",
            followersRes.status,
            followersJson,
          );
        }
      } catch (e) {
        console.warn("[twitch-live-fetch] followers exception", e);
      }
    }

    // ---- 3. Videos / Clips / Live (parallel, soft-fail) ----
    const [videos, clips, live] = await Promise.all([
      fetchVideos(broadcasterId, userHeaders),
      fetchClips(broadcasterId, userHeaders),
      fetchLive(broadcasterId, userHeaders),
    ]);

    // ---- 4. Dominant category resolution (with multi-source fallback) ----
    const gameCounts: Record<string, number> = {};
    for (const c of clips) {
      if (c.game_id) gameCounts[c.game_id] = (gameCounts[c.game_id] ?? 0) + 1;
    }
    const topGameId =
      Object.entries(gameCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ??
      live?.game_id ??
      null;
    let dominantCategory: string | null =
      live?.game_name ?? (await fetchGameName(topGameId, userHeaders));

    // Seed source tracking — exposed to the client for dev debug visibility.
    let seedSource: string;
    if (live?.game_name) seedSource = "live_stream";
    else if (topGameId) seedSource = "recent_clips";
    else seedSource = "none";

    // Fallback: if personal data yields no category, accept a client-provided
    // category hint (recently opened profile, watchlist, manual, rankings).
    if (!dominantCategory && categoryHint) {
      dominantCategory = categoryHint;
      seedSource = "category_hint";
    }

    // ---- 5. Competitor candidates (App Access Token for /search/channels) ----
    let competitors: Array<{
      id: string;
      login: string;
      display_name: string;
      thumbnail_url: string | null;
      /** Canonical avatar from /helix/users — used by the UI. */
      profile_image_url: string | null;
      is_live: boolean;
      game_name: string | null;
      title: string | null;
      started_at: string | null;
      language: string | null;
      live_viewer_count: number | null;
      description: string;
      broadcaster_type: string;
      view_count: number;
    }> = [];

    if (dominantCategory) {
      const appToken = await getAppAccessToken(clientId, clientSecret);
      if (appToken) {
        const appHeaders = {
          "Client-ID": clientId,
          Authorization: `Bearer ${appToken}`,
        };

        // Resolve game_id (live.game_id is most authoritative; otherwise via /games?name)
        let gameId: string | null = live?.game_id ?? topGameId ?? null;
        if (!gameId && dominantCategory) {
          try {
            const gRes = await fetch(
              `https://api.twitch.tv/helix/games?name=${encodeURIComponent(dominantCategory)}`,
              { headers: appHeaders },
            );
            if (gRes.ok) {
              const gJson = await gRes.json();
              gameId = gJson?.data?.[0]?.id ?? null;
            }
          } catch { /* ignore */ }
        }

        // Broaden the candidate pool: name-matched search + real category leaderboard.
        const effectiveLanguage = languageHint ?? null;
        const [searchCandidates, topLive] = await Promise.all([
          fetchCompetitorCandidates(dominantCategory, broadcasterLogin, appHeaders),
          gameId
            ? fetchTopLiveInCategory(
                gameId,
                broadcasterLogin,
                appHeaders,
                effectiveLanguage ?? undefined,
              )
            : Promise.resolve([] as HelixStream[]),
        ]);

        // Merge: dedup by id. Search candidates carry richer metadata first;
        // top-live candidates back-fill broader discovery.
        const merged = new Map<string, HelixSearchChannel>();
        for (const c of searchCandidates) {
          if (c.id) merged.set(c.id, c);
        }
        for (const s of topLive) {
          if (!s.user_id || merged.has(s.user_id)) continue;
          merged.set(s.user_id, {
            id: s.user_id,
            broadcaster_login: s.user_login ?? "",
            display_name: s.user_name ?? s.user_login ?? "",
            thumbnail_url: s.thumbnail_url,
            is_live: true,
            game_name: s.game_name,
            game_id: s.game_id,
            title: s.title,
            started_at: s.started_at,
            broadcaster_language: s.language,
          });
        }
        const candidates = Array.from(merged.values()).slice(0, 40);

        const ids = candidates.map((c) => c.id).filter(Boolean);
        const [candUsers, candStreams] = await Promise.all([
          batchUsers(ids, appHeaders),
          batchStreams(ids, appHeaders),
        ]);
        competitors = candidates.map((c) => {
          const u = candUsers.get(c.id);
          const s = candStreams.get(c.id);
          // Canonical avatar priority: /helix/users.profile_image_url first
          // (real Twitch avatar), then /search/channels.thumbnail_url as a
          // fallback (search returns the avatar in this field too).
          const avatar =
            u?.profile_image_url ||
            c.thumbnail_url ||
            null;
          return {
            id: c.id,
            login: c.broadcaster_login,
            display_name: c.display_name,
            thumbnail_url: c.thumbnail_url ?? null,
            profile_image_url: avatar,
            is_live: s ? true : (c.is_live ?? false),
            game_name: s?.game_name ?? c.game_name ?? null,
            title: s?.title ?? c.title ?? null,
            started_at: s?.started_at ?? c.started_at ?? null,
            language: s?.language ?? c.broadcaster_language ?? null,
            live_viewer_count: s?.viewer_count ?? null,
            description: u?.description ?? "",
            broadcaster_type: u?.broadcaster_type ?? "",
            view_count: u?.view_count ?? 0,
          };
        });
      }
    }

    return json({
      success: true,
      profile: {
        id: tw.id,
        login: tw.login,
        display_name: tw.display_name,
        description: tw.description ?? "",
        profile_image_url: tw.profile_image_url ?? "",
        broadcaster_type: tw.broadcaster_type ?? "",
        view_count: tw.view_count ?? 0,
        created_at: tw.created_at ?? null,
      },
      follower_count: followerCount,
      followers_available: followersAvailable,
      missing_scope: !hasFollowersScope,
      scope,
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
      dominant_category: dominantCategory ?? null,
      seed_source: seedSource,
      category_hint_used: categoryHint,
      competitors,
    });
  } catch (err) {
    console.error("[twitch-live-fetch] unexpected", err);
    return json({ error: String(err) }, 500);
  }
});
