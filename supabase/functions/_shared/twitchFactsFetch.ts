// Service-callable Twitch facts fetcher.
//
// Used by process-analysis-job (batch/cron mode) to fetch the minimal set of
// Twitch facts needed to compute a StreamScore WITHOUT requiring a user JWT.
//
// Security:
//   - Only callable from inside Edge Functions (uses service role).
//   - Decrypts Twitch tokens via the existing _shared/tokenCrypto helper.
//   - Never returns tokens. Never logs tokens or raw Helix payloads.
//   - If the access token is expired and a refresh token exists, refreshes
//     it server-side and persists the new encrypted pair (same logic as
//     twitch-live-fetch, just usable without a user JWT).

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptToken, encryptToken, isEncrypted } from "./tokenCrypto.ts";

const REQUIRED_FOLLOWERS_SCOPE = "moderator:read:followers";

export interface ServerTwitchFacts {
  profile: {
    id: string;
    login: string;
    display_name: string;
    profile_image_url: string | null;
    description: string;
    broadcaster_type: string;
  };
  follower_count: number | null;
  followers_available: boolean;
  videos: Array<{
    title: string;
    duration: string;
    view_count: number;
    created_at: string;
  }>;
  clips: Array<{
    game_id: string;
    view_count: number;
    created_at: string;
  }>;
  live_sessions: Array<{
    started_at: string;
    ended_at: string | null;
    duration_minutes: number | null;
    avg_viewers: number | null;
    peak_viewers: number | null;
    snapshots_count: number | null;
  }>;
}

export type FetchTwitchFactsError =
  | "missing_account"
  | "missing_credentials"
  | "token_unavailable"
  | "twitch_user_failed"
  | "twitch_unauthorized";

export interface FetchTwitchFactsResult {
  ok: boolean;
  error?: FetchTwitchFactsError;
  facts?: ServerTwitchFacts;
}

interface AccountRow {
  id: string;
  user_id: string;
  platform_user_id: string | null;
  platform_login: string | null;
  platform_display_name: string | null;
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
  scope: string | null;
  expires_at: string | null;
}

/**
 * Fetches StreamScore-relevant Twitch facts for a connected account using
 * the service role (no user JWT required). Returns a normalized payload
 * compatible with _shared/factsEngine.extractChannelFacts().
 */
export async function fetchTwitchFactsForAccount(args: {
  user_id: string;
  platform_user_id: string;
  admin?: SupabaseClient;
}): Promise<FetchTwitchFactsResult> {
  const clientId = Deno.env.get("TWITCH_CLIENT_ID");
  const clientSecret = Deno.env.get("TWITCH_CLIENT_SECRET");
  if (!clientId || !clientSecret) return { ok: false, error: "missing_credentials" };

  const admin =
    args.admin ??
    createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

  const { data: account } = await admin
    .from("connected_accounts")
    .select(
      "id, user_id, platform_user_id, platform_login, platform_display_name, access_token_encrypted, refresh_token_encrypted, scope, expires_at",
    )
    .eq("user_id", args.user_id)
    .eq("platform", "twitch")
    .eq("platform_user_id", args.platform_user_id)
    .maybeSingle();

  if (!account) return { ok: false, error: "missing_account" };
  const acct = account as AccountRow;

  let accessToken = await decryptToken(acct.access_token_encrypted);
  const refreshToken = await decryptToken(acct.refresh_token_encrypted);

  // Opportunistic re-encryption of any legacy raw values.
  const legacyAccess =
    !!acct.access_token_encrypted && !isEncrypted(acct.access_token_encrypted);
  const legacyRefresh =
    !!acct.refresh_token_encrypted && !isEncrypted(acct.refresh_token_encrypted);
  if (legacyAccess || legacyRefresh) {
    await admin
      .from("connected_accounts")
      .update({
        access_token_encrypted: accessToken ? await encryptToken(accessToken) : null,
        refresh_token_encrypted: refreshToken ? await encryptToken(refreshToken) : null,
      })
      .eq("id", acct.id);
  }

  let scope = acct.scope ?? "";
  const expiresAt = acct.expires_at ? new Date(acct.expires_at).getTime() : 0;
  const needsRefresh = !accessToken || (expiresAt && expiresAt - Date.now() < 60_000);

  if (needsRefresh && refreshToken) {
    try {
      const r = await fetch("https://id.twitch.tv/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
      });
      const j = await r.json();
      if (r.ok && j.access_token) {
        accessToken = j.access_token;
        const newScope = Array.isArray(j.scope) ? j.scope.join(" ") : (j.scope ?? scope);
        scope = newScope;
        await admin
          .from("connected_accounts")
          .update({
            access_token_encrypted: await encryptToken(accessToken),
            refresh_token_encrypted: await encryptToken(j.refresh_token ?? refreshToken),
            scope: newScope,
            expires_at: new Date(Date.now() + (j.expires_in ?? 3600) * 1000).toISOString(),
          })
          .eq("id", acct.id);
      } else {
        console.warn("[twitchFactsFetch] refresh failed", { status: r.status });
      }
    } catch (e) {
      console.warn("[twitchFactsFetch] refresh exception", String(e));
    }
  }

  if (!accessToken) return { ok: false, error: "token_unavailable" };

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Client-Id": clientId,
  };

  // /users (canonical profile)
  const userRes = await fetch("https://api.twitch.tv/helix/users", { headers });
  if (!userRes.ok) {
    if (userRes.status === 401) return { ok: false, error: "twitch_unauthorized" };
    return { ok: false, error: "twitch_user_failed" };
  }
  const userJson = await userRes.json();
  const tw = userJson?.data?.[0];
  if (!tw?.id) return { ok: false, error: "twitch_user_failed" };
  const broadcasterId = tw.id as string;

  const hasFollowersScope = scope
    .split(/\s+/)
    .map((s) => s.trim())
    .includes(REQUIRED_FOLLOWERS_SCOPE);

  // Followers / videos / clips in parallel.
  const startedAt = new Date(Date.now() - 30 * 86400000).toISOString();
  const [followers, videosR, clipsR] = await Promise.all([
    hasFollowersScope
      ? fetch(
          `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${encodeURIComponent(broadcasterId)}`,
          { headers },
        )
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      : Promise.resolve(null),
    fetch(
      `https://api.twitch.tv/helix/videos?user_id=${encodeURIComponent(broadcasterId)}&first=20&type=archive&sort=time`,
      { headers },
    )
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .catch(() => ({ data: [] })),
    fetch(
      `https://api.twitch.tv/helix/clips?broadcaster_id=${encodeURIComponent(broadcasterId)}&first=20&started_at=${encodeURIComponent(startedAt)}`,
      { headers },
    )
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .catch(() => ({ data: [] })),
  ]);

  const followerCount =
    followers && typeof followers.total === "number" ? (followers.total as number) : null;

  // Lives 30j: source of truth is live_sessions, NOT Twitch VOD archive.
  // A streamer with VOD storage disabled or a freshly-ended live still
  // shows up here.
  const since30 = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: liveRows } = await admin
    .from("live_sessions")
    .select("started_at, ended_at, duration_minutes, avg_viewers, peak_viewers, snapshots_count")
    .eq("user_id", args.user_id)
    .eq("platform", "twitch")
    .eq("platform_user_id", args.platform_user_id)
    .gte("started_at", since30);

  return {
    ok: true,
    facts: {
      profile: {
        id: broadcasterId,
        login: String(tw.login ?? ""),
        display_name: String(tw.display_name ?? tw.login ?? ""),
      },
      follower_count: followerCount,
      followers_available: hasFollowersScope && followerCount !== null,
      videos: ((videosR?.data ?? []) as Array<Record<string, unknown>>).map((v) => ({
        title: String(v.title ?? ""),
        duration: String(v.duration ?? ""),
        view_count: Number(v.view_count ?? 0),
        created_at: String(v.created_at ?? ""),
      })),
      clips: ((clipsR?.data ?? []) as Array<Record<string, unknown>>).map((c) => ({
        game_id: String(c.game_id ?? ""),
        view_count: Number(c.view_count ?? 0),
        created_at: String(c.created_at ?? ""),
      })),
      live_sessions: ((liveRows ?? []) as Array<Record<string, unknown>>).map((s) => ({
        started_at: String(s.started_at ?? ""),
        ended_at: s.ended_at ? String(s.ended_at) : null,
        duration_minutes: s.duration_minutes != null ? Number(s.duration_minutes) : null,
        avg_viewers: s.avg_viewers != null ? Number(s.avg_viewers) : null,
        peak_viewers: s.peak_viewers != null ? Number(s.peak_viewers) : null,
        snapshots_count: s.snapshots_count != null ? Number(s.snapshots_count) : null,
      })),
    },
  };
}
