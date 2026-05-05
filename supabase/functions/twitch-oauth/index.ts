// Twitch OAuth edge function
// Two actions:
//   - GET ?action=authorize-url&redirect_uri=...&state=... → returns { url }
//   - POST { action: "exchange", code, redirect_uri, state } → exchanges code, stores tokens

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const TWITCH_SCOPES = [
  "user:read:email",
  "channel:read:subscriptions",
  "analytics:read:games",
  "moderator:read:followers",
].join(" ");

async function deriveTwitchPassword(
  twitchUserId: string,
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const input = new TextEncoder().encode(`${twitchUserId}:${clientId}:${clientSecret}`);
  const digest = await crypto.subtle.digest("SHA-256", input);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
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

    const url = new URL(req.url);

    // ---- Action 1: Build authorize URL (no auth needed, just returns a URL) ----
    if (req.method === "GET" && url.searchParams.get("action") === "authorize-url") {
      const redirectUri = url.searchParams.get("redirect_uri");
      const state = url.searchParams.get("state");
      if (!redirectUri || !state) {
        return json({ error: "Missing redirect_uri or state." }, 400);
      }
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: TWITCH_SCOPES,
        state,
        force_verify: "true",
      });
      return json({
        url: `https://id.twitch.tv/oauth2/authorize?${params.toString()}`,
      });
    }

    // ---- Action 2: Exchange code for tokens (auth required) ----
    if (req.method !== "POST") {
      return json({ error: "Method not allowed." }, 405);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const body = await req.json().catch(() => ({}));
    const { code, redirect_uri } = body as {
      code?: string;
      redirect_uri?: string;
    };
    if (!code || !redirect_uri) {
      return json({ error: "Missing code or redirect_uri." }, 400);
    }

    // 1) Exchange code → tokens
    const tokenRes = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error("[twitch-oauth] token exchange failed", tokenData);
      return json(
        { error: tokenData.message || "Token exchange failed.", details: tokenData },
        400,
      );
    }

    const accessToken = tokenData.access_token as string;
    const refreshToken = tokenData.refresh_token as string;
    const expiresIn = tokenData.expires_in as number;
    const scope = Array.isArray(tokenData.scope)
      ? tokenData.scope.join(" ")
      : String(tokenData.scope ?? "");

    // 2) Fetch Twitch user identity
    const userRes = await fetch("https://api.twitch.tv/helix/users", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Client-Id": clientId,
      },
    });
    const userJson = await userRes.json();
    if (!userRes.ok || !userJson.data?.[0]) {
      console.error("[twitch-oauth] helix /users failed", userJson);
      return json({ error: "Failed to fetch Twitch user." }, 400);
    }
    const tw = userJson.data[0];

    // 3) Upsert into connected_accounts using service role (bypass RLS, scoped to this user_id)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    const syntheticEmail = `twitch-${tw.id}@users.streampulse.app`;
    const derivedPassword = await deriveTwitchPassword(tw.id, clientId, clientSecret);

    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("user_id")
      .eq("email", syntheticEmail)
      .maybeSingle();

    let authUserId = existingProfile?.user_id ?? null;

    // Ownership guard — refuse if this Twitch broadcaster is already linked to a
    // different Streamnco user. One Twitch broadcaster_user_id = one Streamnco user.
    const { data: existingConnection } = await adminClient
      .from("connected_accounts")
      .select("user_id")
      .eq("platform", "twitch")
      .eq("platform_user_id", tw.id)
      .maybeSingle();

    if (
      existingConnection &&
      authUserId &&
      existingConnection.user_id !== authUserId
    ) {
      console.warn("[twitch-oauth] ownership conflict", {
        twitch_user_id: tw.id,
        owner: existingConnection.user_id,
        attempted: authUserId,
      });
      return json(
        {
          code: "twitch_account_already_linked",
          error: "Ce compte Twitch est déjà connecté à un autre compte Streamnco.",
        },
        409,
      );
    }

    if (!authUserId) {
      const { data: createdUser, error: createUserError } = await adminClient.auth.admin.createUser({
        email: syntheticEmail,
        password: derivedPassword,
        email_confirm: true,
        user_metadata: {
          twitch_login: tw.login,
          twitch_display_name: tw.display_name,
          auth_source: "twitch_oauth",
        },
      });

      if (createUserError || !createdUser.user) {
        console.error("[twitch-oauth] auth user creation failed", createUserError);
        return json({ code: "session_bootstrap_failed", error: "Unable to initialize user session." }, 500);
      }

      authUserId = createdUser.user.id;
    }

    // Final guard once we know the resolved auth user id.
    if (existingConnection && existingConnection.user_id !== authUserId) {
      return json(
        {
          code: "twitch_account_already_linked",
          error: "Ce compte Twitch est déjà connecté à un autre compte Streamnco.",
        },
        409,
      );
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey);
    const {
      data: authSession,
      error: authSessionError,
    } = await authClient.auth.signInWithPassword({
      email: syntheticEmail,
      password: derivedPassword,
    });

    if (authSessionError || !authSession.session || !authSession.user) {
      console.error("[twitch-oauth] sign in failed", authSessionError);
      return json({ code: "session_bootstrap_failed", error: "Unable to initialize user session." }, 500);
    }

    // Delete any prior twitch row for this user, then insert fresh
    await adminClient
      .from("connected_accounts")
      .delete()
      .eq("user_id", authSession.user.id)
      .eq("platform", "twitch");

    const { error: insertError } = await adminClient
      .from("connected_accounts")
      .insert({
        user_id: authSession.user.id,
        platform: "twitch",
        platform_user_id: tw.id,
        platform_login: tw.login,
        platform_display_name: tw.display_name,
        access_token_encrypted: accessToken,
        refresh_token_encrypted: refreshToken,
        scope,
        expires_at: expiresAt,
      });
    if (insertError) {
      // 23505 = unique_violation → another Streamnco user owns this Twitch account.
      // deno-lint-ignore no-explicit-any
      const code = (insertError as any).code as string | undefined;
      if (code === "23505") {
        return json(
          {
            code: "twitch_account_already_linked",
            error: "Ce compte Twitch est déjà connecté à un autre compte Streamnco.",
          },
          409,
        );
      }
      console.error("[twitch-oauth] insert failed", insertError);
      return json({ code: "connection_store_failed", error: "Failed to store connection." }, 500);
    }

    return json({
      success: true,
      platform_login: tw.login,
      platform_display_name: tw.display_name,
      session: authSession.session,
    });
  } catch (err) {
    console.error("[twitch-oauth] unexpected", err);
    return json({ error: String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
