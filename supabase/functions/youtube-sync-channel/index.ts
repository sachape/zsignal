// youtube-sync-channel
// Fetches YouTube channel metrics for the authenticated user and persists them.
// Access/refresh tokens are handled server-side only.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): Promise<{ access_token: string; expires_in: number } | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type:    "refresh_token",
    }),
  });
  if (!res.ok) return null;
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const clientId     = Deno.env.get("YOUTUBE_CLIENT_ID");
    const clientSecret = Deno.env.get("YOUTUBE_CLIENT_SECRET");
    if (!clientId || !clientSecret) {
      return json({ error: "YouTube credentials not configured." }, 500);
    }

    // Authenticate caller
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

    // Load stored account (tokens are server-side only)
    const { data: row } = await db
      .from("creator_connected_accounts")
      .select("*")
      .eq("user_id", userId)
      .eq("platform", "youtube")
      .maybeSingle();

    if (!row) return json({ error: "YouTube account not connected." }, 404);

    let accessToken: string = row.access_token_encrypted ?? "";
    const storedRefresh: string | null = row.refresh_token_encrypted ?? null;

    // Refresh if expired
    const expiresAt  = row.token_expires_at ? new Date(row.token_expires_at).getTime() : 0;
    const needsRefresh = !accessToken || (expiresAt > 0 && expiresAt - 60_000 < Date.now());

    if (needsRefresh) {
      if (!storedRefresh) {
        await db.from("creator_connected_accounts")
          .update({ connection_status: "expired" })
          .eq("id", row.id);
        return json({ error: "Token expired. Please reconnect YouTube.", expired: true }, 401);
      }
      const refreshed = await tryRefreshToken(clientId, clientSecret, storedRefresh);
      if (!refreshed) {
        await db.from("creator_connected_accounts")
          .update({ connection_status: "expired" })
          .eq("id", row.id);
        return json({ error: "Could not refresh token. Please reconnect.", expired: true }, 401);
      }
      accessToken = refreshed.access_token;
      await db.from("creator_connected_accounts").update({
        access_token_encrypted: accessToken,
        token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        connection_status: "connected",
      }).eq("id", row.id);
    }

    // ── Channel identity + stats ──────────────────────────────────────────────
    const channelRes = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!channelRes.ok) {
      if (channelRes.status === 401) {
        await db.from("creator_connected_accounts")
          .update({ connection_status: "expired" })
          .eq("id", row.id);
        return json({ error: "Token invalid. Please reconnect.", expired: true }, 401);
      }
      return json({ error: `YouTube API error ${channelRes.status}` }, 502);
    }

    const channelJson = await channelRes.json();
    const channel     = channelJson?.items?.[0];
    if (!channel) return json({ error: "No YouTube channel found for this Google account." }, 404);

    const stats       = channel.statistics ?? {};
    const snippet     = channel.snippet ?? {};
    const channelId   = channel.id as string;
    const displayName = snippet.title ?? null;
    const username    = snippet.customUrl?.replace(/^@/, "") ?? null;
    const avatarUrl   = snippet.thumbnails?.high?.url
      ?? snippet.thumbnails?.medium?.url
      ?? snippet.thumbnails?.default?.url
      ?? null;
    const profileUrl  = `https://www.youtube.com/channel/${channelId}`;

    const subscriberCount = stats.hiddenSubscriberCount
      ? null
      : (parseInt(stats.subscriberCount as string) || null);
    const videoCount  = parseInt(stats.videoCount as string)  || null;
    const viewCount   = parseInt(stats.viewCount as string)   || null;

    // ── Recent activity (last 30 days) ────────────────────────────────────────
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=id&channelId=${channelId}&type=video&order=date&maxResults=10&publishedAfter=${encodeURIComponent(since)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const recentVideoCount: number | null = searchRes.ok
      ? ((await searchRes.json())?.items ?? []).length
      : null;

    const activityScore = recentVideoCount != null
      ? Math.min(100, recentVideoCount * 10)
      : null;

    // ── Persist ───────────────────────────────────────────────────────────────
    const now   = new Date().toISOString();
    const today = now.slice(0, 10);

    await db.from("creator_connected_accounts").update({
      platform_user_id: channelId,
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
      platform:             "youtube",
      snapshot_date:        today,
      subscribers_count:    subscriberCount,
      videos_count:         videoCount,
      views_count:          viewCount,
      recent_posts_count:   recentVideoCount,
      recent_activity_score: activityScore,
    }, { onConflict: "user_id,platform,snapshot_date" });

    // Return only non-sensitive fields
    return json({
      success: true,
      channel: { channelId, displayName, username, profileUrl, avatarUrl },
      metrics: { subscriberCount, videoCount, viewCount, recentVideoCount },
      synced_at: now,
    });
  } catch (e) {
    console.error("youtube-sync-channel", e);
    return json({ error: "Internal server error" }, 500);
  }
});
