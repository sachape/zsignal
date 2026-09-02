// voice-clip-trigger
// Endpoint consumed by the Streamnco Live Companion when a configured voice
// command is detected locally.
//
// SECURITY / PRIVACY invariants:
// - The Companion NEVER holds a Twitch OAuth token. Companion -> Streamnco -> Twitch.
// - The user identity is resolved server-side from the companion token; the
//   Companion never provides a user_id.
// - No audio, blob, buffer or transcript is ever accepted. Only a detection
//   event: { voice_event_id, keyword, confidence, detected_at, sent_at }.
//
// Auth: header `x-companion-token: <uuid>` (voice_clip_settings.companion_token)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getTwitchUserAuth } from "../_shared/twitchUserToken.ts";
import {
  CLIP_FETCH_DELAYS_MS,
  computeLatencies,
  isWithinCooldown,
  logVoiceClip,
  mapTwitchAuthError,
  VOICE_CLIP_ERROR,
  type VoiceClipErrorCode,
} from "../_shared/voiceClip.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-companion-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface TriggerBody {
  voice_event_id?: string;
  keyword?: string;
  confidence?: number;
  detected_at?: string;
  sent_at?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const receivedAt = new Date().toISOString();
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const companionToken = req.headers.get("x-companion-token") ?? "";
  if (!UUID_RE.test(companionToken)) {
    return json({ ok: false, error_code: VOICE_CLIP_ERROR.COMPANION_UNAUTHORIZED }, 401);
  }

  let body: TriggerBody;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error_code: "INVALID_BODY" }, 400);
  }

  const voiceEventId = (body.voice_event_id ?? "").trim();
  const keyword = (body.keyword ?? "").trim().slice(0, 40);
  const confidence = typeof body.confidence === "number" ? body.confidence : null;
  const detectedAt = body.detected_at && !Number.isNaN(Date.parse(body.detected_at))
    ? new Date(body.detected_at).toISOString()
    : receivedAt;
  const companionSentAt = body.sent_at && !Number.isNaN(Date.parse(body.sent_at))
    ? new Date(body.sent_at).toISOString()
    : null;

  if (!UUID_RE.test(voiceEventId) || !keyword) {
    return json({ ok: false, error_code: "INVALID_BODY" }, 400);
  }

  const { data: settingsRow } = await admin
    .from("voice_clip_settings")
    .select("user_id, enabled, keyword, confidence_threshold, cooldown_seconds")
    .eq("companion_token", companionToken)
    .maybeSingle();

  const settings = settingsRow as {
    user_id: string;
    enabled: boolean;
    keyword: string;
    confidence_threshold: number;
    cooldown_seconds: number;
  } | null;

  if (!settings) {
    return json({ ok: false, error_code: VOICE_CLIP_ERROR.COMPANION_UNAUTHORIZED }, 401);
  }

  const userId = settings.user_id;

  await admin
    .from("voice_clip_settings")
    .update({ companion_last_seen_at: receivedAt })
    .eq("user_id", userId);

  if (!settings.enabled) {
    return json({ ok: false, error_code: VOICE_CLIP_ERROR.VOICE_CLIP_DISABLED }, 409);
  }

  if (confidence !== null && confidence < Number(settings.confidence_threshold ?? 0.75)) {
    logVoiceClip("low_confidence", { user_id: userId, voice_event_id: voiceEventId, confidence });
    return json({ ok: false, ignored: true, error_code: VOICE_CLIP_ERROR.LOW_CONFIDENCE }, 202);
  }

  // Backend safety net for the Companion-side cooldown ("clip clip clip").
  const { data: lastRow } = await admin
    .from("voice_clip_events")
    .select("detected_at")
    .eq("user_id", userId)
    .neq("voice_event_id", voiceEventId)
    .order("detected_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const cooldownSeconds = Number(settings.cooldown_seconds ?? 5);
  if (isWithinCooldown((lastRow as { detected_at?: string } | null)?.detected_at, detectedAt, cooldownSeconds)) {
    logVoiceClip("cooldown_skipped", { user_id: userId, voice_event_id: voiceEventId, cooldownSeconds });
    return json({ ok: false, ignored: true, error_code: VOICE_CLIP_ERROR.VOICE_EVENT_COOLDOWN }, 202);
  }

  // Idempotency: the unique index on voice_event_id is the single source of truth.
  // Two concurrent requests with the same id => exactly one insert wins.
  const { data: inserted, error: insertError } = await admin
    .from("voice_clip_events")
    .insert({
      user_id: userId,
      voice_event_id: voiceEventId,
      keyword,
      confidence,
      detected_at: detectedAt,
      companion_sent_at: companionSentAt,
      received_at: receivedAt,
      status: "detected",
    })
    .select("id")
    .maybeSingle();

  if (insertError || !inserted) {
    const { data: existing } = await admin
      .from("voice_clip_events")
      .select("id, status, twitch_clip_id, clip_url, content_item_id, error_code")
      .eq("voice_event_id", voiceEventId)
      .maybeSingle();

    if (existing) {
      logVoiceClip("duplicate_event", { user_id: userId, voice_event_id: voiceEventId });
      return json({
        ok: true,
        duplicate: true,
        error_code: VOICE_CLIP_ERROR.VOICE_EVENT_DUPLICATE,
        event: existing,
      }, 200);
    }
    logVoiceClip("insert_failed", { user_id: userId, voice_event_id: voiceEventId });
    return json({ ok: false, error_code: VOICE_CLIP_ERROR.UNKNOWN_ERROR }, 500);
  }

  const eventId = (inserted as { id: string }).id;

  const fail = async (code: VoiceClipErrorCode, status = 200) => {
    await admin
      .from("voice_clip_events")
      .update({ status: "failed", error_code: code, updated_at: new Date().toISOString() })
      .eq("id", eventId);
    logVoiceClip("failed", { user_id: userId, voice_event_id: voiceEventId, event_id: eventId, error_code: code });
    return json({ ok: false, event_id: eventId, error_code: code }, status);
  };

  const authResult = await getTwitchUserAuth(admin, userId);
  if ("error" in authResult) return await fail(mapTwitchAuthError(authResult.error));
  const auth = authResult.auth;

  if (!auth.scopes.includes("clips:edit")) {
    return await fail(VOICE_CLIP_ERROR.TWITCH_SCOPE_MISSING);
  }

  // The streamer must actually be live — no clip, no phantom queue item otherwise.
  const streamRes = await fetch(
    `https://api.twitch.tv/helix/streams?user_id=${encodeURIComponent(auth.broadcasterId)}`,
    { headers: { Authorization: `Bearer ${auth.accessToken}`, "Client-Id": auth.clientId } },
  );
  if (streamRes.status === 401) return await fail(VOICE_CLIP_ERROR.TWITCH_TOKEN_EXPIRED);
  const streamData = await streamRes.json().catch(() => ({}));
  if (!streamRes.ok) return await fail(VOICE_CLIP_ERROR.TWITCH_UNAVAILABLE);
  const stream = (streamData.data ?? [])[0] as { id?: string } | undefined;
  if (!stream) return await fail(VOICE_CLIP_ERROR.STREAM_OFFLINE);

  const twitchRequestAt = new Date().toISOString();
  await admin
    .from("voice_clip_events")
    .update({ status: "creating", stream_id: stream.id ?? null, twitch_request_at: twitchRequestAt })
    .eq("id", eventId);

  const createRes = await fetch(
    `https://api.twitch.tv/helix/clips?broadcaster_id=${encodeURIComponent(auth.broadcasterId)}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${auth.accessToken}`, "Client-Id": auth.clientId },
    },
  );
  const twitchResponseAt = new Date().toISOString();
  const createData = await createRes.json().catch(() => ({}));

  if (!createRes.ok) {
    logVoiceClip("create_clip_rejected", {
      user_id: userId,
      voice_event_id: voiceEventId,
      status: createRes.status,
    });
    if (createRes.status === 401) return await fail(VOICE_CLIP_ERROR.TWITCH_TOKEN_EXPIRED);
    if (createRes.status === 403) return await fail(VOICE_CLIP_ERROR.TWITCH_SCOPE_MISSING);
    return await fail(VOICE_CLIP_ERROR.TWITCH_CREATE_CLIP_FAILED);
  }

  const clipId = ((createData.data ?? [])[0] as { id?: string } | undefined)?.id;
  if (!clipId) return await fail(VOICE_CLIP_ERROR.TWITCH_CREATE_CLIP_FAILED);

  await admin
    .from("voice_clip_events")
    .update({ status: "processing", twitch_clip_id: clipId, twitch_response_at: twitchResponseAt })
    .eq("id", eventId);

  // Twitch needs a few seconds before the clip is queryable — same clip id,
  // progressive backoff, bounded number of attempts.
  interface TwitchClip {
    id: string;
    url?: string;
    title?: string;
    duration?: number;
    thumbnail_url?: string;
  }
  let clip: TwitchClip | null = null;
  let attempts = 0;

  for (const delay of CLIP_FETCH_DELAYS_MS) {
    await new Promise((r) => setTimeout(r, delay));
    attempts += 1;
    const res = await fetch(
      `https://api.twitch.tv/helix/clips?id=${encodeURIComponent(clipId)}`,
      { headers: { Authorization: `Bearer ${auth.accessToken}`, "Client-Id": auth.clientId } },
    );
    const data = await res.json().catch(() => ({}));
    const found = (data.data ?? [])[0] as TwitchClip | undefined;
    logVoiceClip("clip_fetch_attempt", {
      user_id: userId,
      voice_event_id: voiceEventId,
      twitch_clip_id: clipId,
      attempt: attempts,
      found: Boolean(found),
    });
    if (found) {
      clip = found;
      break;
    }
  }

  await admin.from("voice_clip_events").update({ clip_fetch_attempts: attempts }).eq("id", eventId);

  if (!clip) {
    // Create succeeded but Twitch never exposed the clip: honest failure,
    // and no half-baked Content Queue item.
    return await fail(VOICE_CLIP_ERROR.TWITCH_CLIP_NOT_READY);
  }

  const clipReadyAt = new Date().toISOString();
  const clipUrl = clip.url ?? `https://clips.twitch.tv/${clipId}`;
  const title = clip.title?.trim() || `Voice Clip — ${keyword}`;

  // Content Queue de-duplication: one Twitch clip => one item, retry-safe.
  const { data: existingItem } = await admin
    .from("creator_content_items")
    .select("id")
    .eq("user_id", userId)
    .eq("creation_method", "voice")
    .eq("source_video_url", clipUrl)
    .maybeSingle();

  let contentItemId = (existingItem as { id?: string } | null)?.id ?? null;

  if (!contentItemId) {
    const { data: item, error: itemError } = await admin
      .from("creator_content_items")
      .insert({
        user_id: userId,
        platform: "twitch_clip",
        title,
        status: "to_generate",
        priority: "medium",
        creation_method: "voice",
        source_platform: "twitch",
        source_video_url: clipUrl,
        source_channel_login: auth.login,
        source_duration: clip.duration ?? null,
        thumbnail_url: clip.thumbnail_url ?? null,
        reason: `Créé avec la commande vocale « ${keyword} »`,
      })
      .select("id")
      .maybeSingle();

    if (itemError || !item) {
      // Unique index may have raced us: re-read before declaring failure.
      const { data: raced } = await admin
        .from("creator_content_items")
        .select("id")
        .eq("user_id", userId)
        .eq("creation_method", "voice")
        .eq("source_video_url", clipUrl)
        .maybeSingle();
      contentItemId = (raced as { id?: string } | null)?.id ?? null;
      if (!contentItemId) {
        await admin
          .from("voice_clip_events")
          .update({ clip_url: clipUrl, clip_ready_at: clipReadyAt })
          .eq("id", eventId);
        return await fail(VOICE_CLIP_ERROR.CONTENT_QUEUE_INSERT_FAILED);
      }
    } else {
      contentItemId = (item as { id: string }).id;
    }
  }

  const contentQueuedAt = new Date().toISOString();

  // `ready` only once the clip exists AND it landed in the Content Queue.
  await admin
    .from("voice_clip_events")
    .update({
      status: "ready",
      clip_url: clipUrl,
      clip_ready_at: clipReadyAt,
      content_queued_at: contentQueuedAt,
      content_item_id: contentItemId,
      error_code: null,
    })
    .eq("id", eventId);

  logVoiceClip("ready", {
    user_id: userId,
    voice_event_id: voiceEventId,
    event_id: eventId,
    stream_id: stream.id ?? null,
    twitch_clip_id: clipId,
    status: "ready",
    ...computeLatencies({
      detectedAt,
      companionSentAt,
      receivedAt,
      twitchRequestAt,
      twitchResponseAt,
      clipReadyAt,
      contentQueuedAt,
    }),
  });

  return json({
    ok: true,
    event_id: eventId,
    twitch_clip_id: clipId,
    clip_url: clipUrl,
    content_item_id: contentItemId,
  });
});
