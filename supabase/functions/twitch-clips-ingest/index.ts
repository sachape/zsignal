// HTTP entrypoint to ingest Twitch clips.
//
// Two modes:
//   1) Single (default, backward compatible):
//      { user_id, broadcaster_id, started_at, ended_at? }
//      - Caller may be the authenticated user (own broadcaster only)
//      - Or a cron-secret-authenticated job
//
//   2) Batch (cron-only):
//      { mode: "batch" }
//      - Requires cron secret via Authorization: Bearer <secret>
//      - Selects eligible Twitch broadcasters server-side:
//          A. connected_accounts (twitch) with a live_session updated/ended in last 7 days
//          B. connected_accounts (twitch) tied to users with todo weekly_action_items
//             whose action_key references clips
//      - Ingests last 7 days of clips per broadcaster, dedupe via existing
//        unique(twitch_clip_id) constraint.
//
// Privacy: never logs tokens, Authorization headers, or raw Twitch payloads.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ingestClipsFor, type IngestParams } from "../_shared/clipIngest.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface EligibleBroadcaster {
  user_id: string;
  broadcaster_id: string;
  source: "live_session" | "weekly_action";
}

async function selectEligibleBroadcasters(
  admin: ReturnType<typeof createClient>,
): Promise<EligibleBroadcaster[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const map = new Map<string, EligibleBroadcaster>();

  // Source A: connected accounts with recent live activity
  const { data: liveRows } = await admin
    .from("live_sessions")
    .select("user_id, platform_user_id, platform")
    .eq("platform", "twitch")
    .gte("updated_at", sevenDaysAgo);
  for (const r of liveRows ?? []) {
    const pid = (r as { platform_user_id?: string }).platform_user_id;
    const uid = (r as { user_id?: string }).user_id;
    if (!pid || !uid) continue;
    if (!map.has(pid)) {
      map.set(pid, { user_id: uid, broadcaster_id: pid, source: "live_session" });
    }
  }

  // Source B: weekly actions requiring clips verification
  const { data: actionRows } = await admin
    .from("weekly_action_items")
    .select("user_id, action_key, status")
    .eq("status", "todo")
    .ilike("action_key", "%clip%")
    .limit(500);
  const actionUserIds = Array.from(
    new Set(
      (actionRows ?? [])
        .map((r) => (r as { user_id?: string }).user_id)
        .filter(Boolean) as string[],
    ),
  );
  if (actionUserIds.length > 0) {
    const { data: accounts } = await admin
      .from("connected_accounts")
      .select("user_id, platform_user_id")
      .eq("platform", "twitch")
      .in("user_id", actionUserIds);
    for (const a of accounts ?? []) {
      const pid = (a as { platform_user_id?: string }).platform_user_id;
      const uid = (a as { user_id?: string }).user_id;
      if (!pid || !uid) continue;
      if (!map.has(pid)) {
        map.set(pid, { user_id: uid, broadcaster_id: pid, source: "weekly_action" });
      }
    }
  }

  return Array.from(map.values());
}

async function runBatch(admin: ReturnType<typeof createClient>) {
  console.log(JSON.stringify({ event: "clips_ingest_batch_started" }));
  const startedAt = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const eligible = await selectEligibleBroadcasters(admin);
  let processed = 0;
  let skipped = 0;
  let upserted = 0;
  let fetched = 0;
  let errors = 0;

  for (const acc of eligible) {
    try {
      const result = await ingestClipsFor(admin, {
        user_id: acc.user_id,
        broadcaster_id: acc.broadcaster_id,
        started_at: startedAt,
      });
      processed++;
      fetched += result.fetched;
      upserted += result.upserted;
      console.log(
        JSON.stringify({
          event: "clips_ingest_account_processed",
          source: acc.source,
          fetched: result.fetched,
          upserted: result.upserted,
        }),
      );
    } catch (e) {
      errors++;
      console.log(
        JSON.stringify({
          event: "clips_ingest_error",
          source: acc.source,
          message: e instanceof Error ? e.message : "unknown",
        }),
      );
    }
  }

  if (eligible.length === 0) {
    skipped++;
    console.log(JSON.stringify({ event: "clips_ingest_account_skipped", reason: "no_eligible" }));
  }

  const summary = {
    eligible: eligible.length,
    processed,
    skipped,
    fetched,
    upserted,
    errors,
  };
  console.log(JSON.stringify({ event: "clips_ingest_batch_completed", ...summary }));
  return summary;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : "";

    const body = (await req.json().catch(() => ({}))) as
      | (Partial<IngestParams> & { mode?: string })
      | Record<string, never>;

    let isCron = false;
    if (token) {
      const { data: ok } = await admin.rpc("verify_eventsub_cron_secret", {
        token,
      });
      isCron = ok === true;
    }

    // Batch mode: cron-only
    if (body && (body as { mode?: string }).mode === "batch") {
      if (!isCron) {
        return json({ error: "Unauthorized" }, 401);
      }
      const summary = await runBatch(admin);
      return json({ success: true, mode: "batch", ...summary });
    }

    // Single mode (legacy)
    let callerUserId: string | null = null;
    if (!isCron) {
      const { data } = await admin.auth.getUser(token);
      callerUserId = data.user?.id ?? null;
      if (!callerUserId) return json({ error: "Unauthorized" }, 401);
    }

    const single = body as Partial<IngestParams>;
    if (!single.user_id || !single.broadcaster_id || !single.started_at) {
      return json(
        { error: "user_id, broadcaster_id, started_at required" },
        400,
      );
    }
    if (!isCron) {
      if (callerUserId !== single.user_id) return json({ error: "Forbidden" }, 403);
      const { data: account } = await admin
        .from("connected_accounts")
        .select("platform_user_id")
        .eq("user_id", callerUserId)
        .eq("platform", "twitch")
        .maybeSingle();
      const ownedBroadcasterId = account?.platform_user_id ?? null;
      if (!ownedBroadcasterId) {
        return json({ error: "No connected Twitch account" }, 403);
      }
      if (single.broadcaster_id !== ownedBroadcasterId) {
        return json({ error: "Forbidden" }, 403);
      }
    }

    const result = await ingestClipsFor(admin, single as IngestParams);
    return json({ success: true, ...result });
  } catch (err) {
    console.log(
      JSON.stringify({
        event: "clips_ingest_error",
        message: err instanceof Error ? err.message : "unknown",
      }),
    );
    return json({ error: "internal_error" }, 500);
  }
});
