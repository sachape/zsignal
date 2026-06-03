// tiktok-sync-profile
// Fetches TikTok profile + recent videos metrics for the authenticated user
// and persists them. Tokens are decrypted server-side only (AES-GCM,
// TOKEN_ENCRYPTION_KEY) and never returned to the client. Refreshes token
// transparently when possible.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptToken, decryptToken } from "../_shared/youtube-crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function tryRefreshToken(
  clientKey: string,
  clientSecret: string,
  refreshToken: string,
): Promise<{ access_token: string; refresh_token?: string; expires_in: number } | null> {
  const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache" },
    body: new URLSearchParams({
      client_key:    clientKey,
      client_secret: clientSecret,
      grant_type:    "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data?.access_token) return null;
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const clientKey     = Deno.env.get("TIKTOK_CLIENT_KEY");
    const clientSecret  = Deno.env.get("TIKTOK_CLIENT_SECRET");
    const encryptionKey = Deno.env.get("TOKEN_ENCRYPTION_KEY");

    if (!clientKey || !clientSecret || !encryptionKey) {
      return json(
        { error: "Connexion TikTok non configurée côté serveur.", configured: false },
        500,
      );
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl    = Deno.env.get("SUPABASE_URL")!;
    const anonKey        = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: authHeader, apikey: anonKey },
    });
    const userData = await userRes.json();
    if (!userData?.id) return json({ error: "Unauthorized" }, 401);
    const userId = userData.id as string;

    const db = createClient(supabaseUrl, serviceRoleKey);

    const { data: row } = await db
      .from("creator_connected_accounts")
      .select("*")
      .eq("user_id", userId)
      .eq("platform", "tiktok")
      .maybeSingle();

    if (!row) return json({ error: "TikTok account not connected." }, 404);

    let accessToken = await decryptToken(row.access_token_encrypted, encryptionKey);
    const refreshToken = await decryptToken(row.refresh_token_encrypted, encryptionKey);

    const expiresAt  = row.token_expires_at ? new Date(row.token_expires_at).getTime() : 0;
    const needsRefresh = !accessToken || (expiresAt > 0 && expiresAt - 60_000 < Date.now());

    if (needsRefresh) {
      if (!refreshToken) {
        await db.from("creator_connected_accounts")
          .update({ connection_status: "expired" }).eq("id", row.id);
        return json({ error: "Token expired. Please reconnect TikTok.", expired: true }, 401);
      }
      const refreshed = await tryRefreshToken(clientKey, clientSecret, refreshToken);
      if (!refreshed) {
        await db.from("creator_connected_accounts")
          .update({ connection_status: "expired" }).eq("id", row.id);
        return json({ error: "Could not refresh token. Please reconnect.", expired: true }, 401);
      }
      accessToken = refreshed.access_token;
      const encAccess = await encryptToken(accessToken, encryptionKey);
      const encRefresh = refreshed.refresh_token
        ? await encryptToken(refreshed.refresh_token, encryptionKey)
        : row.refresh_token_encrypted;
      await db.from("creator_connected_accounts").update({
        access_token_encrypted: encAccess,
        refresh_token_encrypted: encRefresh,
        token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        connection_status: "connected",
      }).eq("id", row.id);
    }

    if (!accessToken) {
      return json({ error: "Token unavailable. Please reconnect.", expired: true }, 401);
    }

    // ── Profile identity ──────────────────────────────────────────────────────
    const userFields = "open_id,union_id,avatar_url,display_name,username,profile_deep_link";
    const profileRes = await fetch(
      `https://open.tiktokapis.com/v2/user/info/?fields=${encodeURIComponent(userFields)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!profileRes.ok) {
      if (profileRes.status === 401) {
        await db.from("creator_connected_accounts")
          .update({ connection_status: "expired" }).eq("id", row.id);
        return json({ error: "Token invalid. Please reconnect.", expired: true }, 401);
      }
      return json({ error: `TikTok API error ${profileRes.status}` }, 502);
    }

    const profileJson = await profileRes.json();
    const tkUser      = profileJson?.data?.user;
    if (!tkUser) return json({ error: "No TikTok user data." }, 404);

    const openId       = tkUser.open_id as string;
    const displayName  = tkUser.display_name ?? null;
    const username     = tkUser.username ?? null;
    const avatarUrl    = tkUser.avatar_url ?? null;
    const profileUrl   = tkUser.profile_deep_link
      ?? (username ? `https://www.tiktok.com/@${username}` : null);

    // ── Recent videos (last 30 days, paginated up to ~60) ────────────────────
    const videoFields = "id,create_time,view_count,like_count,comment_count,share_count";
    const since = Math.floor(Date.now() / 1000) - 30 * 86400;

    type TikTokVideo = {
      id?: string;
      create_time?: number;
      view_count?: number;
      like_count?: number;
      comment_count?: number;
      share_count?: number;
    };

    const allVideos: TikTokVideo[] = [];
    let cursor: number | null = null;
    let hasMore = true;
    let calls = 0;

    while (hasMore && calls < 3) {
      const videoRes = await fetch(
        `https://open.tiktokapis.com/v2/video/list/?fields=${encodeURIComponent(videoFields)}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ max_count: 20, ...(cursor != null ? { cursor } : {}) }),
        },
      );
      if (!videoRes.ok) break;
      const vJson = await videoRes.json();
      const items: TikTokVideo[] = vJson?.data?.videos ?? [];
      allVideos.push(...items);
      hasMore = !!vJson?.data?.has_more;
      cursor  = vJson?.data?.cursor ?? null;
      calls++;
      // Stop if oldest fetched is already past the 30-day window
      const oldest = items[items.length - 1]?.create_time ?? 0;
      if (oldest && oldest < since) break;
    }

    const recentVideos = allVideos.filter((v) => (v.create_time ?? 0) >= since);

    const sumOrNull = (key: keyof TikTokVideo): number | null => {
      const vals = allVideos.map((v) => v[key]).filter((n): n is number => typeof n === "number");
      return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
    };

    const viewsCount    = sumOrNull("view_count");
    const likesCount    = sumOrNull("like_count");
    const commentsCount = sumOrNull("comment_count");
    const sharesCount   = sumOrNull("share_count");

    const recentPostsCount = recentVideos.length;
    const activityScore = Math.min(100, recentPostsCount * 10);

    const now   = new Date().toISOString();
    const today = now.slice(0, 10);

    await db.from("creator_connected_accounts").update({
      platform_user_id: openId,
      username,
      display_name:  displayName,
      profile_url:   profileUrl,
      avatar_url:    avatarUrl,
      connection_status: "connected",
      last_synced_at: now,
      updated_at:     now,
    }).eq("id", row.id);

    await db.from("creator_platform_metrics").upsert({
      user_id:              userId,
      connected_account_id: row.id,
      platform:             "tiktok",
      snapshot_date:        today,
      videos_count:         allVideos.length || null,
      views_count:          viewsCount,
      likes_count:          likesCount,
      comments_count:       commentsCount,
      shares_count:         sharesCount,
      recent_posts_count:   recentPostsCount,
      recent_activity_score: activityScore,
      raw_metrics: {
        last_video_created_at: allVideos[0]?.create_time
          ? new Date(allVideos[0].create_time * 1000).toISOString()
          : null,
        videos_fetched: allVideos.length,
      },
    }, { onConflict: "user_id,platform,snapshot_date" });

    return json({
      success: true,
      profile: { openId, displayName, username, profileUrl, avatarUrl },
      metrics: {
        videosFetched: allVideos.length,
        recentPostsCount,
        viewsCount,
        likesCount,
        commentsCount,
        sharesCount,
      },
      synced_at: now,
    });
  } catch (e) {
    console.error("tiktok-sync-profile", e);
    return json({ error: "Internal server error" }, 500);
  }
});
