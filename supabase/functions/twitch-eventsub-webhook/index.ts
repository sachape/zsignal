// Twitch EventSub Webhook receiver
//
// IMPORTANT — Why webhook transport (not WebSocket):
// The Lovable/Supabase Edge Functions architecture is request/response and
// stateless. There is no long-lived process where we could hold a WebSocket
// connection to Twitch. Webhook transport (HTTP callbacks signed with HMAC)
// is the only viable EventSub transport here. Twitch posts to this function,
// we verify, persist, and ACK quickly. Heavy work happens elsewhere.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, twitch-eventsub-message-id, twitch-eventsub-message-timestamp, twitch-eventsub-message-signature, twitch-eventsub-message-type, twitch-eventsub-subscription-type, twitch-eventsub-subscription-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes replay-protection window

function getHeader(req: Request, name: string): string {
  // Headers are case-insensitive in Fetch's Headers API
  return req.headers.get(name) ?? "";
}

export async function verifySignature(
  secret: string,
  messageId: string,
  timestamp: string,
  rawBody: string,
  signatureHeader: string,
): Promise<boolean> {
  if (!signatureHeader.startsWith("sha256=")) return false;
  const expectedHex = signatureHeader.slice("sha256=".length).toLowerCase();

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(messageId + timestamp + rawBody),
  );
  const computedHex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (computedHex.length !== expectedHex.length) return false;
  let diff = 0;
  for (let i = 0; i < computedHex.length; i++) {
    diff |= computedHex.charCodeAt(i) ^ expectedHex.charCodeAt(i);
  }
  return diff === 0;
}

async function logEvent(
  admin: ReturnType<typeof createClient>,
  level: string,
  event: string,
  message: string,
  context: Record<string, unknown> = {},
) {
  console.log(`[eventsub-webhook][${level}] ${event}: ${message}`, context);
  try {
    await admin
      .from("twitch_eventsub_processing_logs")
      .insert({ level, event, message, context });
  } catch (e) {
    console.error("[eventsub-webhook] log insert failed", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const secret = Deno.env.get("TWITCH_EVENTSUB_SECRET");

  const admin = createClient(supabaseUrl, supabaseServiceKey);

  if (!secret) {
    await logEvent(admin, "error", "config_missing", "TWITCH_EVENTSUB_SECRET not configured");
    return new Response("Server misconfigured", { status: 500, headers: corsHeaders });
  }

  const messageId = getHeader(req, "Twitch-Eventsub-Message-Id");
  const timestamp = getHeader(req, "Twitch-Eventsub-Message-Timestamp");
  const signature = getHeader(req, "Twitch-Eventsub-Message-Signature");
  const messageType = getHeader(req, "Twitch-Eventsub-Message-Type");
  const subscriptionType = getHeader(req, "Twitch-Eventsub-Subscription-Type");
  const subscriptionVersion = getHeader(req, "Twitch-Eventsub-Subscription-Version");

  if (!messageId || !timestamp || !signature || !messageType) {
    await logEvent(admin, "warn", "missing_headers", "Missing required EventSub headers", {
      messageId, timestamp, hasSig: !!signature, messageType,
    });
    return new Response("Bad request", { status: 400, headers: corsHeaders });
  }

  // Replay protection
  const tsMs = Date.parse(timestamp);
  if (Number.isNaN(tsMs) || Math.abs(Date.now() - tsMs) > MAX_AGE_MS) {
    await logEvent(admin, "warn", "replay_rejected", "Timestamp outside acceptance window", {
      messageId, timestamp,
    });
    return new Response("Stale request", { status: 403, headers: corsHeaders });
  }

  const rawBody = await req.text();

  const valid = await verifySignature(secret, messageId, timestamp, rawBody, signature);
  if (!valid) {
    await logEvent(admin, "warn", "signature_invalid", "HMAC signature mismatch", { messageId });
    return new Response("Invalid signature", { status: 403, headers: corsHeaders });
  }
  await logEvent(admin, "info", "signature_valid", "Signature verified", { messageId, messageType });

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
  }

  // ---- 1. Webhook callback verification ----
  if (messageType === "webhook_callback_verification") {
    const challenge = body.challenge ?? "";
    // If we have a local subscription pending for this Twitch sub id, mark it enabled.
    const twSubId = body.subscription?.id;
    if (twSubId) {
      await admin
        .from("twitch_eventsub_subscriptions")
        .update({ status: "enabled", twitch_subscription_id: twSubId })
        .eq("twitch_subscription_id", twSubId);
    }
    await logEvent(admin, "info", "challenge_answered", "Returned challenge to Twitch", {
      twSubId, subscriptionType,
    });
    return new Response(challenge, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
  }

  // ---- 2. Revocation ----
  if (messageType === "revocation") {
    const twSubId = body.subscription?.id;
    const reason = body.subscription?.status ?? "revoked";
    if (twSubId) {
      await admin
        .from("twitch_eventsub_subscriptions")
        .update({
          status: "revoked",
          revoked_at: new Date().toISOString(),
          revoked_reason: reason,
        })
        .eq("twitch_subscription_id", twSubId);
    }
    await logEvent(admin, "warn", "revocation_received", "Subscription revoked by Twitch", {
      twSubId, reason,
    });
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // ---- 3. Notification ----
  if (messageType === "notification") {
    const broadcasterUserId =
      body?.event?.broadcaster_user_id ??
      body?.subscription?.condition?.broadcaster_user_id ??
      null;

    const { error: insertError } = await admin
      .from("twitch_eventsub_events")
      .insert({
        message_id: messageId,
        message_type: messageType,
        subscription_type: subscriptionType || body?.subscription?.type || null,
        subscription_version: subscriptionVersion || body?.subscription?.version || null,
        broadcaster_user_id: broadcasterUserId,
        payload: body,
      });

    if (insertError) {
      // Unique violation on message_id => duplicate
      if ((insertError as any).code === "23505") {
        await logEvent(admin, "info", "duplicate_ignored", "Duplicate message_id ignored", {
          messageId,
        });
        return new Response(null, { status: 204, headers: corsHeaders });
      }
      await logEvent(admin, "error", "insert_failed", insertError.message, { messageId });
      return new Response("Insert failed", { status: 500, headers: corsHeaders });
    }

    await logEvent(admin, "info", "notification_stored", "Event stored", {
      messageId, subscriptionType, broadcasterUserId,
    });

    // Fire-and-forget projection. We must ACK Twitch within ~10s; processing
    // happens asynchronously. Auth uses the Vault-backed cron secret (same
    // path as the hourly cron), retrieved server-side only.
    try {
      const { data: cronSecret } = await admin
        .schema("vault")
        .from("decrypted_secrets")
        .select("decrypted_secret")
        .eq("name", "eventsub_cron_secret")
        .maybeSingle();
      const token = (cronSecret as any)?.decrypted_secret as string | undefined;
      if (token) {
        // Don't await — Twitch must get its 204 fast.
        fetch(`${supabaseUrl}/functions/v1/twitch-eventsub-processor`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message_id: messageId }),
        }).catch((e) => console.error("[eventsub-webhook] processor kick failed", e));
      }
    } catch (e) {
      console.error("[eventsub-webhook] processor secret lookup failed", e);
    }

    return new Response(null, { status: 204, headers: corsHeaders });
  }

  await logEvent(admin, "warn", "unknown_message_type", "Unhandled message type", { messageType });
  return new Response(null, { status: 204, headers: corsHeaders });
});
