// Twitch EventSub Monitor
//
// Reconciles local subscription state with Twitch's view. Run on a schedule
// (e.g. via pg_cron + pg_net) or manually. For each known broadcaster, we
// fetch Twitch's EventSub list, sync statuses, and recreate missing required
// subscriptions when possible.
//
// Webhook transport (not WebSocket): see twitch-eventsub-webhook for rationale.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const REQUIRED_SUBS = [
  { type: "stream.online", version: "1" },
  { type: "stream.offline", version: "1" },
  { type: "channel.update", version: "2" },
];

async function getAppAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`App token failed: ${JSON.stringify(data)}`);
  return data.access_token as string;
}

async function fetchAllTwitchSubs(clientId: string, appToken: string) {
  const out: any[] = [];
  let cursor: string | undefined;
  do {
    const url = new URL("https://api.twitch.tv/helix/eventsub/subscriptions");
    if (cursor) url.searchParams.set("after", cursor);
    const res = await fetch(url, {
      headers: { "Client-Id": clientId, Authorization: `Bearer ${appToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`List subs failed: ${JSON.stringify(data)}`);
    out.push(...(data.data ?? []));
    cursor = data.pagination?.cursor;
  } while (cursor);
  return out;
}

async function logEvent(
  admin: ReturnType<typeof createClient>,
  level: string,
  event: string,
  message: string,
  context: Record<string, unknown> = {},
) {
  console.log(`[eventsub-monitor][${level}] ${event}: ${message}`, context);
  try {
    await admin
      .from("twitch_eventsub_processing_logs")
      .insert({ level, event, message, context });
  } catch (e) {
    console.error("[eventsub-monitor] log insert failed", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Auth: this function is publicly reachable (verify_jwt = false) so that
  // pg_cron + pg_net can call it without a Supabase user JWT. We protect it
  // with a shared CRON_SECRET — Twitch never calls this endpoint directly.
  const cronSecret = Deno.env.get("CRON_SECRET");
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const clientId = Deno.env.get("TWITCH_CLIENT_ID")!;
    const clientSecret = Deno.env.get("TWITCH_CLIENT_SECRET")!;
    const eventsubSecret = Deno.env.get("TWITCH_EVENTSUB_SECRET")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const admin = createClient(supabaseUrl, supabaseServiceKey);
    const callbackUrl = `${supabaseUrl}/functions/v1/twitch-eventsub-webhook`;
    const appToken = await getAppAccessToken(clientId, clientSecret);

    const remoteSubs = await fetchAllTwitchSubs(clientId, appToken);
    const remoteById = new Map<string, any>(remoteSubs.map((s) => [s.id, s]));

    // 1. Sync statuses for all known local subs
    const { data: localSubs } = await admin
      .from("twitch_eventsub_subscriptions")
      .select("id, twitch_subscription_id, broadcaster_user_id, type, version, status");

    const repaired: string[] = [];
    const updated: string[] = [];
    const broadcasters = new Set<string>();

    for (const local of localSubs ?? []) {
      broadcasters.add(local.broadcaster_user_id);
      const remote = local.twitch_subscription_id
        ? remoteById.get(local.twitch_subscription_id)
        : null;

      if (!remote) {
        if (local.status !== "missing" && local.status !== "revoked") {
          await admin
            .from("twitch_eventsub_subscriptions")
            .update({ status: "missing" })
            .eq("id", local.id);
          updated.push(`${local.type}:missing`);
        }
        continue;
      }

      if (remote.status !== local.status) {
        await admin
          .from("twitch_eventsub_subscriptions")
          .update({
            status: remote.status,
            cost: remote.cost ?? 0,
            revoked_at: remote.status === "enabled" ? null : new Date().toISOString(),
            revoked_reason: remote.status === "enabled" ? null : remote.status,
          })
          .eq("id", local.id);
        updated.push(`${local.type}:${remote.status}`);
      }
    }

    // 2. Recreate required subs that are missing/failed/revoked per broadcaster
    for (const broadcasterUserId of broadcasters) {
      for (const req of REQUIRED_SUBS) {
        const { data: row } = await admin
          .from("twitch_eventsub_subscriptions")
          .select("status")
          .eq("broadcaster_user_id", broadcasterUserId)
          .eq("type", req.type)
          .eq("version", req.version)
          .maybeSingle();

        const broken = !row || ["missing", "failed", "revoked", "authorization_revoked", "user_removed", "notification_failures_exceeded"].includes(row.status);
        if (!broken) continue;

        const condition: Record<string, string> = { broadcaster_user_id: broadcasterUserId };
        const transport = { method: "webhook", callback: callbackUrl, secret: eventsubSecret };

        const createRes = await fetch("https://api.twitch.tv/helix/eventsub/subscriptions", {
          method: "POST",
          headers: {
            "Client-Id": clientId,
            Authorization: `Bearer ${appToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ type: req.type, version: req.version, condition, transport }),
        });
        const createData = await createRes.json().catch(() => ({}));

        if (!createRes.ok) {
          await logEvent(admin, "error", "subscription_failed", createData?.message ?? "monitor recreate failed", {
            broadcasterUserId, type: req.type,
          });
          continue;
        }

        const created = createData?.data?.[0];
        await admin.from("twitch_eventsub_subscriptions").upsert(
          {
            twitch_subscription_id: created?.id,
            broadcaster_user_id: broadcasterUserId,
            type: req.type,
            version: req.version,
            status: created?.status ?? "webhook_callback_verification_pending",
            condition,
            transport: { method: "webhook", callback: callbackUrl },
            callback_url: callbackUrl,
            cost: created?.cost ?? 0,
            revoked_at: null,
            revoked_reason: null,
          },
          { onConflict: "broadcaster_user_id,type,version" },
        );
        repaired.push(`${broadcasterUserId}:${req.type}`);
        await logEvent(admin, "info", "monitor_repaired", "Recreated required subscription", {
          broadcasterUserId, type: req.type, twitchId: created?.id,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        remote_count: remoteSubs.length,
        local_count: localSubs?.length ?? 0,
        updated,
        repaired,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[eventsub-monitor] unexpected", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
