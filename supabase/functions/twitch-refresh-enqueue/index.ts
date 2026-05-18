// twitch-refresh-enqueue
// Two modes:
//   - { mode: "all" }  (called by pg_cron hourly with no auth) → enqueue
//     refresh jobs for every connected_account whose next_auto_refresh_at
//     has elapsed (or is null). Uses service-role.
//   - { mode: "self" } (called by an authenticated user from the dashboard
//     'Actualiser maintenant' fallback) → enqueue ONE refresh job for the
//     caller's own connected Twitch account.
//
// In both cases we only INSERT a queued analysis_job. The actual
// pipeline compute is performed by the dashboard runtime (hybrid model)
// when the user is on the dashboard; this keeps the well-tested TS
// engines as the single source of truth.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const REFRESH_INTERVAL_HOURS = 24;

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

interface Account {
  id: string;
  user_id: string;
  platform_user_id: string | null;
  platform_login: string | null;
  next_auto_refresh_at: string | null;
}

// Untyped admin client to avoid leaking new table generics into this file.
// The schema is validated at runtime by the Supabase API; this signature is
// intentionally permissive so adding tables doesn't break unrelated functions.
type AdminClient = ReturnType<typeof createClient<any, any, any>>;

async function enqueueForAccount(
  admin: AdminClient,
  account: Account,
  triggerSource: "auto_first" | "auto_scheduled" | "manual",
) {
  if (!account.platform_user_id || !account.platform_login) {
    return { skipped: true, reason: "missing_platform_identity" as const };
  }

  // Skip if there is already a queued/processing job for this account.
  const { data: pending } = await admin
    .from("analysis_jobs")
    .select("id, status, created_at")
    .eq("user_id", account.user_id)
    .eq("platform", "twitch")
    .eq("platform_user_id", account.platform_user_id)
    .in("status", ["queued", "processing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pending) {
    return { skipped: true, reason: "job_already_pending" as const, job_id: pending.id };
  }

  const { data: job, error } = await admin
    .from("analysis_jobs")
    .insert({
      user_id: account.user_id,
      channel_name: account.platform_login,
      status: "queued",
      platform: "twitch",
      platform_user_id: account.platform_user_id,
      platform_login: account.platform_login,
      trigger_source: triggerSource,
    })
    .select("id")
    .single();

  if (error || !job) {
    return { skipped: true, reason: "insert_failed" as const, error: error?.message };
  }

  const next = new Date(Date.now() + REFRESH_INTERVAL_HOURS * 3600 * 1000).toISOString();
  await admin
    .from("connected_accounts")
    .update({ next_auto_refresh_at: next })
    .eq("id", account.id);

  return { enqueued: true, job_id: job.id, trigger: triggerSource };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin: AdminClient = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const mode = (body as { mode?: string }).mode ?? "self";

    if (mode === "all") {
      // Cron-secret auth (pg_net passes no JWT).
      const tok = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
      const { data: cronOk } = await admin.rpc("verify_eventsub_cron_secret", { token: tok });
      if (cronOk !== true) return json({ error: "Unauthorized" }, 401);

      // Enqueue for every account whose next_auto_refresh_at has elapsed
      const nowIso = new Date().toISOString();
      const { data: accounts, error } = await admin
        .from("connected_accounts")
        .select("id, user_id, platform_user_id, platform_login, next_auto_refresh_at")
        .eq("platform", "twitch")
        .or(`next_auto_refresh_at.is.null,next_auto_refresh_at.lte.${nowIso}`);

      if (error) return json({ error: error.message }, 500);

      const results: unknown[] = [];
      for (const account of (accounts ?? []) as Account[]) {
        results.push(await enqueueForAccount(admin, account, "auto_scheduled"));
      }
      return json({ success: true, mode: "all", count: results.length, results });
    }

    if (mode === "weekly") {
      // Vault-backed cron auth (same pattern as eventsub functions).
      const authHeader = req.headers.get("Authorization") ?? "";
      const token = authHeader.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length)
        : "";
      if (!token) return json({ error: "Unauthorized" }, 401);
      const { data: ok, error: rpcError } = await admin.rpc(
        "verify_eventsub_cron_secret",
        { token },
      );
      if (rpcError || ok !== true) return json({ error: "Unauthorized" }, 401);

      const { enqueueAnalysisJobForConnectedAccount } = await import(
        "../_shared/enqueueAnalysisJob.ts"
      );
      const cutoff = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      const { data: accounts, error } = await admin
        .from("connected_accounts")
        .select("id, user_id, platform_user_id, platform_login, platform_display_name, last_auto_refresh_at")
        .eq("platform", "twitch")
        .or(`last_auto_refresh_at.is.null,last_auto_refresh_at.lte.${cutoff}`);
      if (error) return json({ error: error.message }, 500);

      const results: unknown[] = [];
      for (const a of accounts ?? []) {
        const r = await enqueueAnalysisJobForConnectedAccount(
          admin,
          {
            user_id: (a as any).user_id,
            platform_user_id: (a as any).platform_user_id,
            platform_login: (a as any).platform_login,
            platform_display_name: (a as any).platform_display_name,
          },
          "auto_weekly",
          { bumpLastAutoRefresh: true },
        );
        results.push({
          user_id: (a as any).user_id,
          platform_user_id: (a as any).platform_user_id,
          enqueued: r.enqueued,
          reason: r.reason,
        });
      }
      return json({ success: true, mode: "weekly", count: results.length, results });
    }

    // mode === "self" → user-initiated manual refresh
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization." }, 401);

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const { data: account } = await admin
      .from("connected_accounts")
      .select("id, user_id, platform_user_id, platform_login, next_auto_refresh_at")
      .eq("user_id", user.id)
      .eq("platform", "twitch")
      .maybeSingle();

    if (!account) return json({ error: "No connected Twitch account." }, 404);

    const triggerSource =
      (body as { trigger_source?: "auto_first" | "manual" }).trigger_source ?? "manual";
    const result = await enqueueForAccount(admin, account as Account, triggerSource);

    return json({ success: true, mode: "self", ...result });
  } catch (err) {
    console.error("[twitch-refresh-enqueue]", err);
    return json({ error: "Internal server error" }, 500);
  }
});
