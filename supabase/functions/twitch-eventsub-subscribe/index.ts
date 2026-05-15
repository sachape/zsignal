// Twitch EventSub Subscriber
//
// Creates EventSub subscriptions (webhook transport) for the calling user's
// connected Twitch account. Called after a successful Twitch OAuth connection.
//
// Why webhook transport: see comment in twitch-eventsub-webhook/index.ts.
// Edge Functions are stateless request/response handlers, so we cannot host
// a persistent WebSocket session.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface DesiredSub {
  type: string;
  version: string;
  requiredScope?: string; // optional; if missing in user's stored scope, we skip
}

// Default subscriptions. stream.online/offline/channel.update do NOT require user scopes.
const DEFAULT_SUBS: DesiredSub[] = [
  { type: "stream.online", version: "1" },
  { type: "stream.offline", version: "1" },
  { type: "channel.update", version: "2" },
];

// Optional subscriptions (added only if scopes match)
const OPTIONAL_SUBS: DesiredSub[] = [
  { type: "channel.follow", version: "2", requiredScope: "moderator:read:followers" },
  { type: "channel.subscribe", version: "1", requiredScope: "channel:read:subscriptions" },
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

async function logEvent(
  admin: ReturnType<typeof createClient>,
  level: string,
  event: string,
  message: string,
  context: Record<string, unknown> = {},
) {
  console.log(`[eventsub-subscribe][${level}] ${event}: ${message}`, context);
  try {
    await admin
      .from("twitch_eventsub_processing_logs")
      .insert({ level, event, message, context });
  } catch (e) {
    console.error("[eventsub-subscribe] log insert failed", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const clientId = Deno.env.get("TWITCH_CLIENT_ID")!;
    const clientSecret = Deno.env.get("TWITCH_CLIENT_SECRET")!;
    const eventsubSecret = Deno.env.get("TWITCH_EVENTSUB_SECRET")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    if (!clientId || !clientSecret || !eventsubSecret) {
      return new Response(
        JSON.stringify({ error: "Missing Twitch/EventSub credentials" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey);

    // Identify caller
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // Optional broadcaster_user_id targets a specific Twitch account
    // (Growth plan: a user can have up to 3 connected Twitch accounts).
    let requestedBroadcasterId: string | null = null;
    try {
      const body = await req.json().catch(() => ({}));
      const raw = body?.broadcaster_user_id ?? body?.platform_user_id;
      if (typeof raw === "string" && /^[0-9A-Za-z_-]{1,64}$/.test(raw)) {
        requestedBroadcasterId = raw;
      }
    } catch {
      // no body — legacy single-account behavior
    }

    let accountQuery = admin
      .from("connected_accounts")
      .select("platform_user_id, scope, platform_login")
      .eq("user_id", userId)
      .eq("platform", "twitch");

    if (requestedBroadcasterId) {
      accountQuery = accountQuery.eq("platform_user_id", requestedBroadcasterId);
    }

    const { data: accounts, error: accountError } = await accountQuery.limit(2);

    if (accountError) {
      return new Response(
        JSON.stringify({ error: "No connected Twitch account" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!accounts || accounts.length === 0) {
      return new Response(
        JSON.stringify({ error: "No connected Twitch account" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!requestedBroadcasterId && accounts.length > 1) {
      return new Response(
        JSON.stringify({
          error: "Multiple Twitch accounts connected. Provide broadcaster_user_id.",
          code: "broadcaster_user_id_required",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const account = accounts[0];
    if (!account?.platform_user_id) {
      return new Response(
        JSON.stringify({ error: "No connected Twitch account" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const broadcasterUserId = account.platform_user_id as string;
    const scopes = (account.scope ?? "").split(/\s+/).filter(Boolean);

    const callbackUrl = `${supabaseUrl}/functions/v1/twitch-eventsub-webhook`;
    const appToken = await getAppAccessToken(clientId, clientSecret);

    const desired: DesiredSub[] = [
      ...DEFAULT_SUBS,
      ...OPTIONAL_SUBS.filter((s) => !s.requiredScope || scopes.includes(s.requiredScope)),
    ];

    const results: Array<{ type: string; status: string; error?: string }> = [];

    for (const sub of desired) {
      // Skip if we already have an enabled/pending row for this (broadcaster, type, version)
      const { data: existing } = await admin
        .from("twitch_eventsub_subscriptions")
        .select("id, status, twitch_subscription_id")
        .eq("broadcaster_user_id", broadcasterUserId)
        .eq("type", sub.type)
        .eq("version", sub.version)
        .maybeSingle();

      if (existing && ["enabled", "webhook_callback_verification_pending", "pending"].includes(existing.status)) {
        results.push({ type: sub.type, status: `already_${existing.status}` });
        continue;
      }

      const condition: Record<string, string> = { broadcaster_user_id: broadcasterUserId };
      if (sub.type === "channel.follow") {
        condition.moderator_user_id = broadcasterUserId;
      }

      const transport = {
        method: "webhook",
        callback: callbackUrl,
        secret: eventsubSecret,
      };

      const createRes = await fetch("https://api.twitch.tv/helix/eventsub/subscriptions", {
        method: "POST",
        headers: {
          "Client-Id": clientId,
          Authorization: `Bearer ${appToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: sub.type,
          version: sub.version,
          condition,
          transport,
        }),
      });

      const createData = await createRes.json().catch(() => ({}));

      if (!createRes.ok) {
        await admin.from("twitch_eventsub_subscriptions").upsert(
          {
            broadcaster_user_id: broadcasterUserId,
            type: sub.type,
            version: sub.version,
            status: "failed",
            condition,
            transport: { method: "webhook", callback: callbackUrl }, // never store secret
            callback_url: callbackUrl,
          },
          { onConflict: "broadcaster_user_id,type,version" },
        );
        await logEvent(admin, "error", "subscription_failed", createData?.message ?? "create failed", {
          type: sub.type, status: createRes.status, body: createData,
        });
        results.push({ type: sub.type, status: "failed", error: createData?.message });
        continue;
      }

      const created = createData?.data?.[0];
      await admin.from("twitch_eventsub_subscriptions").upsert(
        {
          twitch_subscription_id: created?.id,
          broadcaster_user_id: broadcasterUserId,
          type: sub.type,
          version: sub.version,
          status: created?.status ?? "webhook_callback_verification_pending",
          condition,
          transport: { method: "webhook", callback: callbackUrl }, // do not persist secret
          callback_url: callbackUrl,
          cost: created?.cost ?? 0,
          revoked_at: null,
          revoked_reason: null,
        },
        { onConflict: "broadcaster_user_id,type,version" },
      );
      await logEvent(admin, "info", "subscription_created", "EventSub subscription created", {
        type: sub.type, twitchId: created?.id, status: created?.status,
      });
      results.push({ type: sub.type, status: created?.status ?? "pending" });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[eventsub-subscribe] unexpected", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
