// youtube-auth-callback
// Handles the Google OAuth redirect: exchanges code → tokens, persists account,
// then redirects user back to the frontend. Tokens are never returned to the client.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const url          = new URL(req.url);
  const code         = url.searchParams.get("code");
  const state        = url.searchParams.get("state");
  const oauthError   = url.searchParams.get("error");

  const frontendUrl  = Deno.env.get("FRONTEND_URL") ?? "https://streamnco.fr";
  const base         = `${frontendUrl}/reseaux`;

  // User cancelled or Google returned an error
  if (oauthError) {
    const dest = oauthError === "access_denied"
      ? `${base}?youtube=cancelled`
      : `${base}?youtube=error&reason=${encodeURIComponent(oauthError)}`;
    return Response.redirect(dest, 302);
  }

  if (!code || !state) {
    return Response.redirect(`${base}?youtube=error&reason=missing_params`, 302);
  }

  try {
    // Decode userId from state
    let userId: string;
    try {
      userId = atob(state);
      if (!/^[0-9a-f-]{36}$/.test(userId)) throw new Error("invalid uuid");
    } catch {
      return Response.redirect(`${base}?youtube=error&reason=invalid_state`, 302);
    }

    const clientId    = Deno.env.get("YOUTUBE_CLIENT_ID")!;
    const clientSecret = Deno.env.get("YOUTUBE_CLIENT_SECRET")!;
    const supabaseUrl  = Deno.env.get("SUPABASE_URL")!;
    const redirectUri  =
      Deno.env.get("YOUTUBE_REDIRECT_URI") ??
      `${supabaseUrl}/functions/v1/youtube-auth-callback`;

    // Exchange code → tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id:     clientId,
        client_secret: clientSecret,
        redirect_uri:  redirectUri,
        grant_type:    "authorization_code",
      }),
    });
    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("Token exchange failed", tokenData);
      return Response.redirect(`${base}?youtube=error&reason=token_exchange`, 302);
    }

    const accessToken   = tokenData.access_token as string;
    const refreshToken  = (tokenData.refresh_token as string | undefined) ?? null;
    const expiresAt     = new Date(Date.now() + (tokenData.expires_in ?? 3600) * 1000).toISOString();

    // Fetch YouTube channel identity
    const channelRes = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const channelJson = channelRes.ok ? await channelRes.json() : null;
    const channel     = channelJson?.items?.[0];

    const channelId   = channel?.id ?? null;
    const displayName = channel?.snippet?.title ?? null;
    const username    = channel?.snippet?.customUrl?.replace(/^@/, "") ?? null;
    const avatarUrl   = channel?.snippet?.thumbnails?.default?.url ?? null;
    const profileUrl  = channelId
      ? `https://www.youtube.com/channel/${channelId}`
      : null;

    // Persist — tokens stored server-side only, never returned to client
    const db = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { error: upsertErr } = await db
      .from("creator_connected_accounts")
      .upsert({
        user_id:                 userId,
        platform:                "youtube",
        platform_user_id:        channelId,
        username,
        display_name:            displayName,
        profile_url:             profileUrl,
        avatar_url:              avatarUrl,
        access_token_encrypted:  accessToken,
        refresh_token_encrypted: refreshToken,
        token_expires_at:        expiresAt,
        connection_status:       "connected",
        last_synced_at:          new Date().toISOString(),
      }, { onConflict: "user_id,platform" });

    if (upsertErr) {
      console.error("Upsert failed", upsertErr);
      return Response.redirect(`${base}?youtube=error&reason=db_error`, 302);
    }

    return Response.redirect(`${base}?youtube=connected`, 302);
  } catch (e) {
    console.error("youtube-auth-callback", e);
    return Response.redirect(`${base}?youtube=error&reason=internal`, 302);
  }
});
