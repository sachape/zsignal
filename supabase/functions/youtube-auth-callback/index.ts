// youtube-auth-callback
// Handles the Google OAuth redirect: verifies HMAC state, exchanges code → tokens,
// encrypts tokens (AES-GCM) and persists the account. Tokens never reach the client.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyOAuthState, encryptToken } from "../_shared/youtube-crypto.ts";

Deno.serve(async (req) => {
  const url          = new URL(req.url);
  const code         = url.searchParams.get("code");
  const state        = url.searchParams.get("state");
  const oauthError   = url.searchParams.get("error");

  const frontendUrl  = Deno.env.get("FRONTEND_URL") ?? "https://streamnco.fr";
  const base         = `${frontendUrl}/reseaux`;

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
    const stateSecret   = Deno.env.get("OAUTH_STATE_SECRET");
    const encryptionKey = Deno.env.get("TOKEN_ENCRYPTION_KEY");
    const clientId      = Deno.env.get("YOUTUBE_CLIENT_ID");
    const clientSecret  = Deno.env.get("YOUTUBE_CLIENT_SECRET");
    const supabaseUrl   = Deno.env.get("SUPABASE_URL")!;

    if (!stateSecret || !encryptionKey || !clientId || !clientSecret) {
      return Response.redirect(`${base}?youtube=error&reason=server_misconfigured`, 302);
    }

    const verified = await verifyOAuthState(state, stateSecret);
    if (!verified) {
      return Response.redirect(`${base}?youtube=error&reason=invalid_state`, 302);
    }
    const userId = verified.userId;

    const redirectUri =
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

    const accessToken  = tokenData.access_token as string;
    const refreshToken = (tokenData.refresh_token as string | undefined) ?? null;
    const expiresAt    = new Date(Date.now() + (tokenData.expires_in ?? 3600) * 1000).toISOString();

    // Fetch YouTube channel identity (read-only, no PII written back to client)
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
    const profileUrl  = channelId ? `https://www.youtube.com/channel/${channelId}` : null;

    // Encrypt tokens (AES-GCM with TOKEN_ENCRYPTION_KEY) before persisting.
    const encAccess  = await encryptToken(accessToken, encryptionKey);
    const encRefresh = refreshToken ? await encryptToken(refreshToken, encryptionKey) : null;

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
        access_token_encrypted:  encAccess,
        refresh_token_encrypted: encRefresh,
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
