// live-detect (cron, every ~3 min)
//
// For every Twitch-connected account:
//   - Calls /helix/streams?user_id=... with an App Access Token
//   - If live and no open session → create live_sessions(status='live')
//   - If live and open session   → insert a viewer_count snapshot
//   - If NOT live and open session → close it (status='ended'), compute
//     duration / peak / avg, then trigger debrief generation inline.
//
// Mode "self" (called by the dashboard) does the same for the caller only,
// so users can manually force a sync from the cockpit if needed.
//
// All Twitch reads are server-side. We never store tokens here — we use the
// app-level credentials for read-only stream status, which is sufficient.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enqueueAnalysisJobForConnectedAccount } from "../_shared/enqueueAnalysisJob.ts";

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

type AdminClient = ReturnType<typeof createClient<any, any, any>>;

interface Account {
  id: string;
  user_id: string;
  platform_user_id: string | null;
  platform_login: string | null;
  platform_display_name: string | null;
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
}

// ---- App Access Token (cached) ------------------------------------------
let cachedToken: { token: string; expiresAt: number } | null = null;
async function getAppToken(
  clientId: string,
  clientSecret: string,
): Promise<string | null> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt - 60_000 > now) return cachedToken.token;
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
    cachedToken = {
      token: data.access_token,
      expiresAt: now + (data.expires_in ?? 3600) * 1000,
    };
    return cachedToken.token;
  } catch {
    return null;
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

// ---- Debrief generation (shared) ---------------------------------------
import { generateDebrief } from "../_shared/debrief.ts";
import { generateClipCandidates } from "../_shared/clipCandidates.ts";
import { attachVodToSession } from "../_shared/twitchVod.ts";

// ---- Per-account processing --------------------------------------------
async function processAccount(
  admin: AdminClient,
  account: Account,
  headers: Record<string, string>,
): Promise<{ login: string; action: string }> {
  if (!account.platform_user_id) {
    return { login: account.platform_login ?? "?", action: "skip_no_platform_id" };
  }

  const live = await fetchLive(account.platform_user_id, headers);

  // Find currently open session for this account
  const { data: openSession } = await admin
    .from("live_sessions")
    .select("id, twitch_stream_id, started_at, snapshots_count, peak_viewers")
    .eq("connected_account_id", account.id)
    .eq("status", "live")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const open = openSession as
    | {
        id: string;
        twitch_stream_id: string | null;
        started_at: string;
        snapshots_count: number;
        peak_viewers: number | null;
      }
    | null;

  // CASE 1 — live, no open session → create one
  if (live && !open) {
    const { data: created } = await admin
      .from("live_sessions")
      .insert({
        user_id: account.user_id,
        connected_account_id: account.id,
        platform: "twitch",
        platform_user_id: account.platform_user_id,
        platform_login: account.platform_login,
        platform_display_name: account.platform_display_name,
        twitch_stream_id: live.id,
        category_name: live.game_name ?? null,
        start_title: live.title ?? null,
        language: live.language ?? null,
        started_at: live.started_at,
        status: "live",
        peak_viewers: live.viewer_count,
        avg_viewers: live.viewer_count,
        snapshots_count: 1,
      })
      .select("id")
      .single();

    if (created) {
      await admin.from("live_snapshots").insert({
        live_session_id: (created as { id: string }).id,
        viewer_count: live.viewer_count,
        category_name: live.game_name ?? null,
        title: live.title ?? null,
      });
    }
    return { login: account.platform_login ?? "?", action: "created_session" };
  }

  // CASE 2 — live and open session matches → snapshot
  if (live && open) {
    await admin.from("live_snapshots").insert({
      live_session_id: open.id,
      viewer_count: live.viewer_count,
      category_name: live.game_name ?? null,
      title: live.title ?? null,
    });
    // Recompute peak / avg / snapshots_count
    const { data: snaps } = await admin
      .from("live_snapshots")
      .select("viewer_count")
      .eq("live_session_id", open.id);
    const arr = (snaps ?? []) as { viewer_count: number }[];
    const peak = arr.length ? Math.max(...arr.map((x) => x.viewer_count)) : 0;
    const avg = arr.length
      ? Math.round(arr.reduce((s, x) => s + x.viewer_count, 0) / arr.length)
      : 0;
    await admin
      .from("live_sessions")
      .update({
        peak_viewers: peak,
        avg_viewers: avg,
        snapshots_count: arr.length,
        category_name: live.game_name ?? null,
      })
      .eq("id", open.id);
    return { login: account.platform_login ?? "?", action: "snapshot" };
  }

  // CASE 3 — not live, but open session → close it + debrief
  if (!live && open) {
    const startedAt = new Date(open.started_at).getTime();
    const endedAt = Date.now();
    const durationMin = Math.max(1, Math.round((endedAt - startedAt) / 60000));

    await admin
      .from("live_sessions")
      .update({
        status: "ended",
        ended_at: new Date(endedAt).toISOString(),
        duration_minutes: durationMin,
      })
      .eq("id", open.id);

    await generateDebrief(admin, open.id);
    // Auto-clip candidates + VOD attach (best-effort, never blocks closing).
    try {
      await generateClipCandidates(admin, open.id);
    } catch (err) {
      console.error("[live-detect] clip candidates error", err);
    }
    try {
      await attachVodToSession(admin, open.id, headers);
    } catch (err) {
      console.error("[live-detect] vod attach error", err);
    }
    return { login: account.platform_login ?? "?", action: "closed_session" };
  }

  return { login: account.platform_login ?? "?", action: "no_change" };
}

// ---- HTTP handler -------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const clientId = Deno.env.get("TWITCH_CLIENT_ID");
    const clientSecret = Deno.env.get("TWITCH_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      return json({ success: false, error: "twitch_credentials_missing" }, 500);
    }

    const admin: AdminClient = createClient(supabaseUrl, serviceKey);
    const token = await getAppToken(clientId, clientSecret);
    if (!token) return json({ success: false, error: "twitch_app_token_failed" }, 502);

    const headers = {
      "Client-ID": clientId,
      Authorization: `Bearer ${token}`,
    };

    const body = await req.json().catch(() => ({}));
    const mode = (body as { mode?: string }).mode ?? "all";

    let accounts: Account[] = [];

    if (mode === "self") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) return json({ error: "Missing authorization" }, 401);
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const {
        data: { user },
      } = await userClient.auth.getUser();
      if (!user) return json({ error: "Unauthorized" }, 401);

      const { data } = await admin
        .from("connected_accounts")
        .select("id, user_id, platform_user_id, platform_login, platform_display_name")
        .eq("user_id", user.id)
        .eq("platform", "twitch");
      accounts = (data ?? []) as Account[];
    } else {
      // mode === "all" → cron. Require cron-secret since pg_net passes no JWT.
      const tok = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
      const { data: ok } = await admin.rpc("verify_eventsub_cron_secret", { token: tok });
      if (ok !== true) return json({ error: "Unauthorized" }, 401);

      const { data } = await admin
        .from("connected_accounts")
        .select("id, user_id, platform_user_id, platform_login, platform_display_name")
        .eq("platform", "twitch");
      accounts = (data ?? []) as Account[];
    }

    const results: { login: string; action: string }[] = [];
    for (const acc of accounts) {
      try {
        results.push(await processAccount(admin, acc, headers));
      } catch (err) {
        console.error("[live-detect] account error", acc.platform_login, err);
        results.push({
          login: acc.platform_login ?? "?",
          action: "error:internal",
        });
      }
    }

    return json({ success: true, mode, count: results.length, results });
  } catch (err) {
    console.error("[live-detect]", err);
    return json({ success: false, error: "internal_server_error" }, 500);
  }
});
