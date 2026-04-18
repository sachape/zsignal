// Twitch live fetch edge function
// Fetches the canonical Twitch profile + REAL follower count for the
// currently connected account of the authenticated user.
//
// Returns:
//   {
//     success: true,
//     profile: { id, login, display_name, description, profile_image_url, broadcaster_type, view_count },
//     follower_count: number | null,
//     followers_available: boolean,
//     missing_scope: boolean,
//     scope: string,
//   }

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

    let accessToken = account.access_token_encrypted as string;
    const scope = (account.scope as string) ?? "";
    const hasFollowersScope = scope
      .split(/\s+/)
      .map((s) => s.trim())
      .includes(REQUIRED_FOLLOWERS_SCOPE);

    // ---- Helper: refresh token if expired/about-to-expire ----
    const expiresAt = account.expires_at ? new Date(account.expires_at).getTime() : 0;
    const needsRefresh =
      !accessToken || (expiresAt && expiresAt - Date.now() < 60_000);

    if (needsRefresh && account.refresh_token_encrypted) {
      const refreshRes = await fetch("https://id.twitch.tv/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "refresh_token",
          refresh_token: account.refresh_token_encrypted as string,
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
        await admin
          .from("connected_accounts")
          .update({
            access_token_encrypted: accessToken,
            refresh_token_encrypted:
              refreshData.refresh_token ?? account.refresh_token_encrypted,
            scope: newScope,
            expires_at: newExpires,
          })
          .eq("id", account.id);
      } else {
        console.warn("[twitch-live-fetch] refresh failed", refreshData);
      }
    }

    // ---- 1. Fetch helix /users (canonical profile) ----
    const helixHeaders = {
      Authorization: `Bearer ${accessToken}`,
      "Client-Id": clientId,
    };
    const userRes = await fetch("https://api.twitch.tv/helix/users", {
      headers: helixHeaders,
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

    // ---- 2. Fetch followers via /channels/followers ----
    let followerCount: number | null = null;
    let followersAvailable = false;

    if (hasFollowersScope) {
      const followersRes = await fetch(
        `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${encodeURIComponent(broadcasterId)}`,
        { headers: helixHeaders },
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
    } else {
      console.warn("[twitch-live-fetch] missing scope moderator:read:followers");
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
    });
  } catch (err) {
    console.error("[twitch-live-fetch] unexpected", err);
    return json({ error: String(err) }, 500);
  }
});
