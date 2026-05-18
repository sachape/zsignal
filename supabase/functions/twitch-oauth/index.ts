// Twitch OAuth edge function
// Two actions:
//   - GET ?action=authorize-url&redirect_uri=...&state=... → returns { url }
//   - POST { code, redirect_uri, mode? } → exchanges code, stores tokens
//
// Modes (authenticated callers only):
//   - undefined / "default" → first-connection behavior. If the caller already
//     owns a Twitch row, we update/replace that single row (legacy semantics
//     so existing single-account users keep working).
//   - "add" → multi-account. Append a new Twitch account to the caller's
//     existing accounts. Subject to plan limits.
//   - "replace" → drop ALL existing Twitch rows for the caller and insert
//     the freshly-linked account. Used by the explicit "replace" UX.

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

/**
 * After a successful Twitch (re)connect, allow the server score batch to
 * retry analysis_jobs that previously failed for a transient/account-bound
 * reason. Scoped to (user_id, platform='twitch', platform_user_id) so it
 * never touches other users or other Twitch identities owned by the same
 * user. Leaves `computed` jobs and non-retryable failures untouched.
 */
const RETRYABLE_SCORE_ERROR_REASONS = [
  "missing_account",
  "token_unavailable",
  "twitch_unauthorized",
  "missing_credentials",
  "fetch_failed",
];

// deno-lint-ignore no-explicit-any
async function resetRetryableScoreFailures(adminClient: any, userId: string, platformUserId: string) {
  try {
    const { data, error } = await adminClient
      .from("analysis_jobs")
      .update({
        score_status: null,
        score_error_message: null,
        score_computed_at: null,
        score_processed_by: null,
      })
      .eq("user_id", userId)
      .eq("platform", "twitch")
      .eq("platform_user_id", platformUserId)
      .eq("status", "queued")
      .eq("score_status", "failed")
      .in("score_error_message", RETRYABLE_SCORE_ERROR_REASONS)
      .select("id");
    if (error) {
      console.warn("[twitch-oauth] score_reset_failed");
      return;
    }
    if (data && data.length > 0) {
      console.log("[twitch-oauth] score_reset_ok", { count: data.length });
    }
  } catch (_e) {
    console.warn("[twitch-oauth] score_reset_exception");
  }
}



// Plan-based connected-account limits.
const LIMIT_FREE_PRO = 1;
const LIMIT_GROWTH = 3;

async function deriveTwitchPassword(
  twitchUserId: string,
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const input = new TextEncoder().encode(`${twitchUserId}:${clientId}:${clientSecret}`);
  const digest = await crypto.subtle.digest("SHA-256", input);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// deno-lint-ignore no-explicit-any
async function resolveAccountLimit(admin: any, userId: string): Promise<number> {
  const { data } = await admin
    .from("subscriptions")
    .select("plan_name, status")
    .eq("user_id", userId)
    .maybeSingle();
  const status = (data?.status ?? "") as string;
  const plan = (data?.plan_name ?? "free") as string;
  const active = status === "active" || status === "trialing";
  if (active && plan === "growth") return LIMIT_GROWTH;
  return LIMIT_FREE_PRO;
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

    if (req.method !== "POST") {
      return json({ error: "Method not allowed." }, 405);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const body = await req.json().catch(() => ({}));
    const { code, redirect_uri, mode } = body as {
      code?: string;
      redirect_uri?: string;
      mode?: "add" | "replace" | "default";
    };
    if (!code || !redirect_uri) {
      return json({ error: "Missing code or redirect_uri." }, 400);
    }
    const linkMode: "add" | "replace" | "default" =
      mode === "add" || mode === "replace" ? mode : "default";

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
      console.error("[twitch-oauth] error: token_exchange_failed");
      return json(
        { error: tokenData.message || "Token exchange failed.", code: "token_exchange_failed" },
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
      console.error("[twitch-oauth] error: helix_users_failed");
      return json({ error: "Failed to fetch Twitch user.", code: "twitch_user_lookup_failed" }, 400);
    }
    const tw = userJson.data[0];

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // 3) Resolve authenticated caller (if any).
    let callerUserId: string | null = null;
    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
    if (authHeader && /^Bearer\s+/i.test(authHeader)) {
      try {
        const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: { user } } = await callerClient.auth.getUser();
        if (user?.id) callerUserId = user.id;
      } catch (_e) {
        // ignore
      }
    }
    console.log("[twitch-oauth] link_started", {
      mode: callerUserId ? `linked_existing_user:${linkMode}` : "twitch_first",
    });

    // Global ownership guard (across users).
    const { data: existingConnection } = await adminClient
      .from("connected_accounts")
      .select("user_id")
      .eq("platform", "twitch")
      .eq("platform_user_id", tw.id)
      .maybeSingle();

    const { encryptToken } = await import("../_shared/tokenCrypto.ts");
    const encAccess = await encryptToken(accessToken);
    const encRefresh = refreshToken ? await encryptToken(refreshToken) : null;

    // ============ Branch A: authenticated caller — LINK ONLY ============
    if (callerUserId) {
      if (existingConnection && existingConnection.user_id !== callerUserId) {
        // Check if the existing row belongs to a synthetic Twitch-first user
        // (auto-created by Branch B when the user had no email account yet).
        // If so, the authenticated caller is reclaiming their own Twitch identity:
        // delete the synthetic row and let the insert below reassign it.
        const syntheticEmail = `twitch-${tw.id}@users.streampulse.app`;
        const { data: existingOwner } = await adminClient
          .from("profiles")
          .select("email")
          .eq("user_id", existingConnection.user_id)
          .maybeSingle();

        if (existingOwner?.email !== syntheticEmail) {
          console.warn("[twitch-oauth] conflict_existing_link");
          return json(
            {
              success: false,
              code: "twitch_account_already_linked",
              error: "Ce compte Twitch est déjà connecté à un autre compte Streamnco.",
            },
            409,
          );
        }
        // Synthetic owner — reclaim: delete their row so the insert below can proceed.
        console.log("[twitch-oauth] reclaiming_synthetic_user_twitch");
        await adminClient
          .from("connected_accounts")
          .delete()
          .eq("user_id", existingConnection.user_id)
          .eq("platform", "twitch")
          .eq("platform_user_id", tw.id);
      }

      // Load this user's existing Twitch rows.
      const { data: existingRows } = await adminClient
        .from("connected_accounts")
        .select("id, platform_user_id")
        .eq("user_id", callerUserId)
        .eq("platform", "twitch");

      const rows = existingRows ?? [];
      const alreadyHasThisAccount = rows.some((r) => r.platform_user_id === tw.id);

      // Plan-limit enforcement.
      // Reconnecting an existing account = no new row → never blocked.
      // mode=replace = end count stays the same (or shrinks) → never blocked.
      if (!alreadyHasThisAccount && linkMode !== "replace") {
        const wouldHave = rows.length + 1;
        const limit = await resolveAccountLimit(adminClient, callerUserId);
        if (wouldHave > limit) {
          console.warn("[twitch-oauth] limit_reached");
          return json(
            {
              success: false,
              code: "twitch_account_limit_reached",
              error:
                "Tu as atteint la limite de comptes Twitch connectés pour ton offre actuelle.",
            },
            403,
          );
        }
      }

      // Apply mode-specific deletion.
      if (linkMode === "replace") {
        // Replace ALL twitch rows for this user with the new one.
        await adminClient
          .from("connected_accounts")
          .delete()
          .eq("user_id", callerUserId)
          .eq("platform", "twitch");
      } else if (linkMode === "default") {
        // Legacy first-connection semantics: keep at most one twitch row.
        // If the user already had a different twitch account, replace it.
        // (Multi-account users use mode=add explicitly.)
        if (rows.length > 0 && !alreadyHasThisAccount) {
          await adminClient
            .from("connected_accounts")
            .delete()
            .eq("user_id", callerUserId)
            .eq("platform", "twitch");
        } else if (alreadyHasThisAccount) {
          await adminClient
            .from("connected_accounts")
            .delete()
            .eq("user_id", callerUserId)
            .eq("platform", "twitch")
            .eq("platform_user_id", tw.id);
        }
      } else {
        // mode=add: only remove the prior row for THIS specific twitch account
        // (token refresh path). Other accounts stay intact.
        if (alreadyHasThisAccount) {
          await adminClient
            .from("connected_accounts")
            .delete()
            .eq("user_id", callerUserId)
            .eq("platform", "twitch")
            .eq("platform_user_id", tw.id);
        }
      }

      const { error: insertError } = await adminClient
        .from("connected_accounts")
        .insert({
          user_id: callerUserId,
          platform: "twitch",
          platform_user_id: tw.id,
          platform_login: tw.login,
          platform_display_name: tw.display_name,
          access_token_encrypted: encAccess,
          refresh_token_encrypted: encRefresh,
          scope,
          expires_at: expiresAt,
        });
      if (insertError) {
        // deno-lint-ignore no-explicit-any
        const errCode = (insertError as any).code as string | undefined;
        if (errCode === "23505") {
          return json(
            {
              success: false,
              code: "twitch_account_already_linked",
              error: "Ce compte Twitch est déjà connecté à un autre compte Streamnco.",
            },
            409,
          );
        }
        console.error("[twitch-oauth] error: insert failed");
        return json({ success: false, code: "connection_store_failed", error: "Failed to store connection." }, 500);
      }

      // Auto-enqueue first analysis for this specific Twitch identity.
      try {
        const { enqueueAnalysisJobForConnectedAccount } = await import(
          "../_shared/enqueueAnalysisJob.ts"
        );
        const { data: prior } = await adminClient
          .from("analysis_jobs")
          .select("id")
          .eq("user_id", callerUserId)
          .eq("platform", "twitch")
          .eq("platform_user_id", tw.id)
          .limit(1)
          .maybeSingle();
        if (!prior) {
          await enqueueAnalysisJobForConnectedAccount(
            adminClient,
            {
              user_id: callerUserId,
              platform_user_id: tw.id,
              platform_login: tw.login,
              platform_display_name: tw.display_name,
            },
            "auto_first",
            { uniquePerTriggerSource: true, bumpLastAutoRefresh: true },
          );
        }
      } catch (_e) {
        console.error("[twitch-oauth] auto_first enqueue failed");
      }

      // Reset prior retryable server-score failures so the cron picks them up.
      await resetRetryableScoreFailures(adminClient, callerUserId, tw.id);



      console.log("[twitch-oauth] linked_existing_user", { mode: linkMode });
      return json({
        success: true,
        linked: true,
        mode: linkMode,
        session: null,
        platform_user_id: tw.id,
        platform_login: tw.login,
        platform_display_name: tw.display_name,
      });
    }

    // ============ Branch B: unauthenticated — Twitch-first signup ============
    const syntheticEmail = `twitch-${tw.id}@users.streampulse.app`;
    const derivedPassword = await deriveTwitchPassword(tw.id, clientId, clientSecret);

    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("user_id")
      .eq("email", syntheticEmail)
      .maybeSingle();

    let authUserId = existingProfile?.user_id ?? null;

    if (existingConnection && authUserId && existingConnection.user_id !== authUserId) {
      return json(
        {
          success: false,
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
        console.error("[twitch-oauth] auth user creation failed");
        return json({ code: "session_bootstrap_failed", error: "Unable to initialize user session." }, 500);
      }

      authUserId = createdUser.user.id;
      console.log("[twitch-oauth] created_twitch_user");
    }

    if (existingConnection && existingConnection.user_id !== authUserId) {
      return json(
        {
          success: false,
          code: "twitch_account_already_linked",
          error: "Ce compte Twitch est déjà connecté à un autre compte Streamnco.",
        },
        409,
      );
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: authSession, error: authSessionError } = await authClient.auth.signInWithPassword({
      email: syntheticEmail,
      password: derivedPassword,
    });

    if (authSessionError || !authSession.session || !authSession.user) {
      console.error("[twitch-oauth] sign in failed");
      return json({ code: "session_bootstrap_failed", error: "Unable to initialize user session." }, 500);
    }

    // Twitch-first: only one row per twitch account is needed; keep prior row
    // for THIS twitch account if any (refresh tokens), then upsert.
    await adminClient
      .from("connected_accounts")
      .delete()
      .eq("user_id", authSession.user.id)
      .eq("platform", "twitch")
      .eq("platform_user_id", tw.id);

    const { error: insertError } = await adminClient
      .from("connected_accounts")
      .insert({
        user_id: authSession.user.id,
        platform: "twitch",
        platform_user_id: tw.id,
        platform_login: tw.login,
        platform_display_name: tw.display_name,
        access_token_encrypted: encAccess,
        refresh_token_encrypted: encRefresh,
        scope,
        expires_at: expiresAt,
      });
    if (insertError) {
      // deno-lint-ignore no-explicit-any
      const errCode = (insertError as any).code as string | undefined;
      if (errCode === "23505") {
        return json(
          {
            success: false,
            code: "twitch_account_already_linked",
            error: "Ce compte Twitch est déjà connecté à un autre compte Streamnco.",
          },
          409,
        );
      }
      console.error("[twitch-oauth] insert failed");
      return json({ code: "connection_store_failed", error: "Failed to store connection." }, 500);
    }

    try {
      const { enqueueAnalysisJobForConnectedAccount } = await import(
        "../_shared/enqueueAnalysisJob.ts"
      );
      const { data: prior } = await adminClient
        .from("analysis_jobs")
        .select("id")
        .eq("user_id", authSession.user.id)
        .eq("platform", "twitch")
        .eq("platform_user_id", tw.id)
        .limit(1)
        .maybeSingle();
      if (!prior) {
        await enqueueAnalysisJobForConnectedAccount(
          adminClient,
          {
            user_id: authSession.user.id,
            platform_user_id: tw.id,
            platform_login: tw.login,
            platform_display_name: tw.display_name,
          },
          "auto_first",
          { uniquePerTriggerSource: true, bumpLastAutoRefresh: true },
        );
      }
    } catch (_e) {
      console.error("[twitch-oauth] auto_first enqueue failed");
    }

    // Reset prior retryable server-score failures (Twitch-first signup path).
    await resetRetryableScoreFailures(adminClient, authSession.user.id, tw.id);



    return json({
      success: true,
      linked: false,
      platform_user_id: tw.id,
      platform_login: tw.login,
      platform_display_name: tw.display_name,
      session: authSession.session,
    });
  } catch (err) {
    console.error("[twitch-oauth] error: unexpected");
    return json({ error: String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
