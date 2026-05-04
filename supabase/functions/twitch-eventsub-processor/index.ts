// Twitch EventSub Processor
//
// Reads pending rows from `twitch_eventsub_events` and projects them onto
// product tables (live_sessions, creator_alerts, channel_update_history,
// community_events). Idempotent: each raw event is keyed by message_id and
// every product write is deduped by (source_message_id, kind/type) or by
// the active live_session for the broadcaster.
//
// Auth: same Vault-backed CRON_SECRET pattern as twitch-eventsub-monitor.
// Can be invoked by:
//  - the webhook (fire-and-forget after ACK) with the cron secret
//  - the hourly cron (sweeps any leftover pending rows)
//  - manual operator runs

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BATCH_SIZE = 50;
const MAX_ATTEMPTS = 5;

type RawEvent = {
  id: string;
  message_id: string;
  subscription_type: string | null;
  subscription_version: string | null;
  broadcaster_user_id: string | null;
  payload: any;
  received_at: string;
  processing_attempts: number;
};

async function logEvent(
  admin: SupabaseClient,
  level: string,
  event: string,
  message: string,
  context: Record<string, unknown> = {},
) {
  console.log(`[eventsub-processor][${level}] ${event}: ${message}`, context);
  try {
    await admin.from("twitch_eventsub_processing_logs").insert({ level, event, message, context });
  } catch (e) {
    console.error("[eventsub-processor] log insert failed", e);
  }
}

async function findUserContexts(admin: SupabaseClient, broadcasterUserId: string) {
  // A single Twitch broadcaster could be connected to multiple Streamnco users
  // (rare, but possible during testing/multi-account). Project to all of them.
  const { data } = await admin
    .from("connected_accounts")
    .select("id, user_id, platform_login, platform_display_name")
    .eq("platform", "twitch")
    .eq("platform_user_id", broadcasterUserId);
  return data ?? [];
}

async function insertAlertIdempotent(
  admin: SupabaseClient,
  row: {
    broadcaster_user_id: string;
    kind: string;
    title: string;
    body?: string | null;
    severity?: string;
    source_message_id: string;
    source_event_type: string;
    metadata?: Record<string, unknown>;
  },
) {
  const { error } = await admin.from("creator_alerts").insert({
    severity: "info",
    metadata: {},
    ...row,
  });
  // 23505 = unique violation on (source_message_id, kind) — already created
  if (error && (error as any).code !== "23505") throw error;
}

// ---- Handlers ----

async function handleStreamOnline(admin: SupabaseClient, raw: RawEvent) {
  const evt = raw.payload?.event ?? {};
  const broadcasterUserId = String(evt.broadcaster_user_id ?? raw.broadcaster_user_id ?? "");
  if (!broadcasterUserId) throw new Error("missing broadcaster_user_id");

  const accounts = await findUserContexts(admin, broadcasterUserId);
  if (accounts.length === 0) {
    return { skipped: "no_connected_account" };
  }

  const startedAt = evt.started_at ?? new Date().toISOString();
  const twitchStreamId: string | null = evt.id ?? null;

  const sessionIds: string[] = [];
  for (const ctx of accounts) {
    // Idempotency: re-use any active live session for this user+broadcaster.
    const { data: existing } = await admin
      .from("live_sessions")
      .select("id, twitch_stream_id")
      .eq("platform", "twitch")
      .eq("platform_user_id", broadcasterUserId)
      .eq("user_id", ctx.user_id)
      .eq("status", "live")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      sessionIds.push(existing.id);
      if (twitchStreamId && existing.twitch_stream_id !== twitchStreamId) {
        await admin
          .from("live_sessions")
          .update({ twitch_stream_id: twitchStreamId, started_at: startedAt })
          .eq("id", existing.id);
      }
    } else {
      const { data: inserted, error } = await admin
        .from("live_sessions")
        .insert({
          user_id: ctx.user_id,
          connected_account_id: ctx.id,
          platform: "twitch",
          platform_user_id: broadcasterUserId,
          platform_login: ctx.platform_login,
          platform_display_name: ctx.platform_display_name,
          status: "live",
          started_at: startedAt,
          twitch_stream_id: twitchStreamId,
        })
        .select("id")
        .single();
      if (error) throw error;
      sessionIds.push(inserted.id);
    }
  }

  await insertAlertIdempotent(admin, {
    broadcaster_user_id: broadcasterUserId,
    kind: "live_started",
    title: "Live détecté",
    body: "Ton live vient de démarrer. Streamnco suit la session.",
    source_message_id: raw.message_id,
    source_event_type: "stream.online",
    metadata: { live_session_id: sessionId, started_at: startedAt },
  });

  return { live_session_id: sessionId };
}

async function handleStreamOffline(admin: SupabaseClient, raw: RawEvent) {
  const evt = raw.payload?.event ?? {};
  const broadcasterUserId = String(evt.broadcaster_user_id ?? raw.broadcaster_user_id ?? "");
  if (!broadcasterUserId) throw new Error("missing broadcaster_user_id");

  const endedAt = new Date().toISOString();

  const { data: session } = await admin
    .from("live_sessions")
    .select("id, started_at")
    .eq("platform", "twitch")
    .eq("platform_user_id", broadcasterUserId)
    .eq("status", "live")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (session) {
    const startedMs = Date.parse(session.started_at);
    const durationMin = Number.isFinite(startedMs)
      ? Math.max(0, Math.round((Date.parse(endedAt) - startedMs) / 60000))
      : null;

    await admin
      .from("live_sessions")
      .update({
        status: "ended",
        ended_at: endedAt,
        duration_minutes: durationMin,
      })
      .eq("id", session.id);
  }

  await insertAlertIdempotent(admin, {
    broadcaster_user_id: broadcasterUserId,
    kind: "live_ended",
    title: "Live terminé — débrief bientôt disponible",
    body: "Streamnco prépare le débrief de ta session.",
    source_message_id: raw.message_id,
    source_event_type: "stream.offline",
    metadata: { live_session_id: session?.id ?? null, ended_at: endedAt },
  });

  return { live_session_id: session?.id ?? null };
}

async function handleChannelUpdate(admin: SupabaseClient, raw: RawEvent) {
  const evt = raw.payload?.event ?? {};
  const broadcasterUserId = String(evt.broadcaster_user_id ?? raw.broadcaster_user_id ?? "");
  if (!broadcasterUserId) throw new Error("missing broadcaster_user_id");

  // Idempotent insert via UNIQUE source_message_id
  const { error } = await admin.from("channel_update_history").insert({
    broadcaster_user_id: broadcasterUserId,
    source_message_id: raw.message_id,
    title: evt.title ?? null,
    category_id: evt.category_id ?? null,
    category_name: evt.category_name ?? null,
    language: evt.language ?? null,
    content_classification_labels: evt.content_classification_labels ?? null,
    changed_at: new Date().toISOString(),
  });
  if (error && (error as any).code !== "23505") throw error;

  // Compare with the previous entry to decide if this is a "significant" change
  const { data: prev } = await admin
    .from("channel_update_history")
    .select("title, category_name")
    .eq("broadcaster_user_id", broadcasterUserId)
    .order("changed_at", { ascending: false })
    .range(1, 1) // second-most-recent (most recent is the one we just inserted)
    .maybeSingle();

  const titleChanged = prev && prev.title !== (evt.title ?? null);
  const categoryChanged = prev && prev.category_name !== (evt.category_name ?? null);

  if (categoryChanged || titleChanged) {
    await insertAlertIdempotent(admin, {
      broadcaster_user_id: broadcasterUserId,
      kind: "channel_updated",
      title: categoryChanged ? "Catégorie modifiée" : "Titre du live modifié",
      body: categoryChanged
        ? `Nouvelle catégorie : ${evt.category_name ?? "—"}`
        : `Nouveau titre : ${evt.title ?? "—"}`,
      source_message_id: raw.message_id,
      source_event_type: "channel.update",
      metadata: {
        previous_title: prev?.title ?? null,
        previous_category: prev?.category_name ?? null,
        new_title: evt.title ?? null,
        new_category: evt.category_name ?? null,
      },
    });
  }

  return { recorded: true };
}

async function hashUserId(raw: string): Promise<string> {
  const data = new TextEncoder().encode(`streamnco:${raw}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function handleChannelFollow(admin: SupabaseClient, raw: RawEvent) {
  const evt = raw.payload?.event ?? {};
  const broadcasterUserId = String(evt.broadcaster_user_id ?? raw.broadcaster_user_id ?? "");
  if (!broadcasterUserId) throw new Error("missing broadcaster_user_id");

  const followerId = evt.user_id ? String(evt.user_id) : null;
  const actorHash = followerId ? await hashUserId(followerId) : null;

  const { error } = await admin.from("community_events").insert({
    broadcaster_user_id: broadcasterUserId,
    source_message_id: raw.message_id,
    kind: "follow",
    occurred_at: evt.followed_at ?? new Date().toISOString(),
    actor_hash: actorHash,
    metadata: {}, // intentionally no login/display_name to limit PII
  });
  if (error && (error as any).code !== "23505") throw error;
  return { recorded: true };
}

async function handleChannelSubscribe(admin: SupabaseClient, raw: RawEvent) {
  const evt = raw.payload?.event ?? {};
  const broadcasterUserId = String(evt.broadcaster_user_id ?? raw.broadcaster_user_id ?? "");
  if (!broadcasterUserId) throw new Error("missing broadcaster_user_id");

  const subscriberId = evt.user_id ? String(evt.user_id) : null;
  const actorHash = subscriberId ? await hashUserId(subscriberId) : null;

  const { error } = await admin.from("community_events").insert({
    broadcaster_user_id: broadcasterUserId,
    source_message_id: raw.message_id,
    kind: "subscribe",
    occurred_at: new Date().toISOString(),
    actor_hash: actorHash,
    is_gift: typeof evt.is_gift === "boolean" ? evt.is_gift : null,
    tier: evt.tier ?? null,
    metadata: {},
  });
  if (error && (error as any).code !== "23505") throw error;
  return { recorded: true };
}

async function processOne(admin: SupabaseClient, raw: RawEvent) {
  const type = raw.subscription_type ?? "";
  switch (type) {
    case "stream.online":
      return await handleStreamOnline(admin, raw);
    case "stream.offline":
      return await handleStreamOffline(admin, raw);
    case "channel.update":
      return await handleChannelUpdate(admin, raw);
    case "channel.follow":
      return await handleChannelFollow(admin, raw);
    case "channel.subscribe":
      return await handleChannelSubscribe(admin, raw);
    default:
      return { skipped: `unhandled_type:${type}` };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  // Auth: Vault-backed cron secret (same as monitor)
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { data: ok, error: rpcError } = await admin.rpc("verify_eventsub_cron_secret", { token });
  if (rpcError || ok !== true) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Optional: caller can target a specific message_id (used by the webhook)
  let targetMessageId: string | null = null;
  try {
    const body = await req.json();
    if (body?.message_id && typeof body.message_id === "string") {
      targetMessageId = body.message_id;
    }
  } catch {
    // empty body is fine
  }

  let query = admin
    .from("twitch_eventsub_events")
    .select("id, message_id, subscription_type, subscription_version, broadcaster_user_id, payload, received_at, processing_attempts")
    .eq("processing_status", "pending")
    .lt("processing_attempts", MAX_ATTEMPTS)
    .order("received_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (targetMessageId) query = query.eq("message_id", targetMessageId);

  const { data: pending, error: fetchError } = await query;
  if (fetchError) {
    await logEvent(admin, "error", "fetch_pending_failed", fetchError.message);
    return new Response(JSON.stringify({ error: "fetch_failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let processed = 0;
  let failed = 0;
  let skipped = 0;

  for (const raw of (pending ?? []) as RawEvent[]) {
    try {
      const result = await processOne(admin, raw);
      await admin
        .from("twitch_eventsub_events")
        .update({
          processing_status: "processed",
          processed_at: new Date().toISOString(),
          processing_attempts: raw.processing_attempts + 1,
          processing_error: null,
        })
        .eq("id", raw.id);
      if ((result as any)?.skipped) {
        skipped++;
        await logEvent(admin, "info", "event_skipped", "No-op for raw event", {
          messageId: raw.message_id,
          subscriptionType: raw.subscription_type,
          reason: (result as any).skipped,
        });
      } else {
        processed++;
        await logEvent(admin, "info", "event_processed", "Projected raw event", {
          messageId: raw.message_id,
          subscriptionType: raw.subscription_type,
        });
      }
    } catch (e) {
      failed++;
      const message = e instanceof Error ? e.message : String(e);
      const attempts = raw.processing_attempts + 1;
      await admin
        .from("twitch_eventsub_events")
        .update({
          processing_status: attempts >= MAX_ATTEMPTS ? "failed" : "pending",
          processing_attempts: attempts,
          processing_error: message,
        })
        .eq("id", raw.id);
      await logEvent(admin, "error", "event_processing_failed", message, {
        messageId: raw.message_id,
        subscriptionType: raw.subscription_type,
        attempts,
      });
    }
  }

  return new Response(
    JSON.stringify({ processed, failed, skipped, picked: pending?.length ?? 0 }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
