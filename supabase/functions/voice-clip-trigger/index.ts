// voice-clip-trigger
// Endpoint consumed by the Streamnco Live Companion when a configured voice
// command is detected locally. The Companion NEVER sends audio — only a small
// detection event. Twitch OAuth stays server-side.
//
// Auth: header `x-companion-token: <uuid>` (voice_clip_settings.companion_token)
// Body: { voice_event_id, keyword, confidence, detected_at }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getTwitchUserAuth } from "../_shared/twitchUserToken.ts";

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
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  const companionToken = req.headers.get("x-companion-token") ?? "";
  if (!UUID_RE.test(companionToken)) return json({ error: "unauthorized" }, 401);

  let body: TriggerBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_body" }, 400);
  }

  const voiceEventId = (body.voice_event_id ?? "").trim();
  const keyword = (body.keyword ?? "").trim().slice(0, 40);
  const confidence = typeof body.confidence === "number" ? body.confidence : null;
  const detectedAt = body.detected_at && !Number.isNaN(Date.parse(body.detected_at))
    ? new Date(body.detected_at).toISOString()
    : new Date().toISOString();

  if (!UUID_RE.test(voiceEventId) || !keyword) return json({ error: "invalid_body" }, 400);

  const { data: settingsRow } = await admin
    .from("voice_clip_settings")
    .select("user_id, enabled, keyword, confidence_threshold")
    .eq("companion_token", companionToken)
    .maybeSingle();

  const settings = settingsRow as {
    user_id: string;
    enabled: boolean;
    keyword: string;
    confidence_threshold: number;
  } | null;

  if (!settings) return json({ error: "unauthorized" }, 401);

  await admin
    .from("voice_clip_settings")
    .update({ companion_last_seen_at: new Date().toISOString() })
    .eq("user_id", settings.user_id);

  if (!settings.enabled) return json({ error: "voice_clip_disabled" }, 409);

  if (confidence !== null && confidence < Number(settings.confidence_threshold ?? 0.75)) {
    return json({ error: "low_confidence", ignored: true }, 202);
  }

  // Idempotency: the unique constraint on voice_event_id is the single source of truth.
  const { data: inserted, error: insertError } = await admin
    .from("voice_clip_events")
    .insert({
      user_id: settings.user_id,
      voice_event_id: voiceEventId,
      keyword,
      confidence,
      detected_at: detectedAt,
      status: "detected",
    })
    .select("id")
    .maybeSingle();

  if (insertError) {
    const { data: existing } = await admin
      .from("voice_clip_events")
      .select("id, status, twitch_clip_id, clip_url")
      .eq("voice_event_id", voiceEventId)
      .maybeSingle();
    return json({ duplicate: true, event: existing ?? null }, 200);
  }

  const eventId = (inserted as { id: string }).id;

  const fail = async (code: string, status = 200) => {
    await admin
      .from("voice_clip_events")
      .update({ status: "failed", error_code: code })
      .eq("id", eventId);
    return json({ ok: false, error: code, event_id: eventId }, status);
  };

  const authResult = await getTwitchUserAuth(admin, settings.user_id);
  if ("error" in authResult) return await fail(authResult.error);
  const auth = authResult.auth;

  if (!auth.scopes.includes("clips:edit")) return await fail("missing_scope");

  // The streamer must actually be live — otherwise Twitch cannot clip anything.
  const streamRes = await fetch(
    `https://api.twitch.tv/helix/streams?user_id=${encodeURIComponent(auth.broadcasterId)}`,
    { headers: { Authorization: `Bearer ${auth.accessToken}`, "Client-Id": auth.clientId } },
  );
  const streamData = await streamRes.json().catch(() => ({}));
  if (!streamRes.ok) return await fail("twitch_unavailable");
  const stream = (streamData.data ?? [])[0] as { id?: string } | undefined;
  if (!stream) return await fail("not_live");

  await admin
    .from("voice_clip_events")
    .update({ status: "creating", stream_id: stream.id ?? null })
    .eq("id", eventId);

  const createRes = await fetch(
    `https://api.twitch.tv/helix/clips?broadcaster_id=${encodeURIComponent(auth.broadcasterId)}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${auth.accessToken}`, "Client-Id": auth.clientId },
    },
  );
  const createData = await createRes.json().catch(() => ({}));
  if (!createRes.ok) {
    console.log(JSON.stringify({ event: "voice_clip_create_failed", status: createRes.status }));
    return await fail(createRes.status === 401 ? "twitch_auth_expired" : "twitch_refused");
  }
  const clipId = ((createData.data ?? [])[0] as { id?: string } | undefined)?.id;
  if (!clipId) return await fail("twitch_refused");

  await admin
    .from("voice_clip_events")
    .update({ status: "processing", twitch_clip_id: clipId })
    .eq("id", eventId);

  // Twitch needs a few seconds before the clip is queryable.
  let clip: {
    id: string;
    url?: string;
    title?: string;
    duration?: number;
    thumbnail_url?: string;
    created_at?: string;
  } | null = null;

  for (let attempt = 0; attempt < 6; attempt++) {
    await new Promise((r) => setTimeout(r, 2500));
    const res = await fetch(
      `https://api.twitch.tv/helix/clips?id=${encodeURIComponent(clipId)}`,
      { headers: { Authorization: `Bearer ${auth.accessToken}`, "Client-Id": auth.clientId } },
    );
    const data = await res.json().catch(() => ({}));
    const found = (data.data ?? [])[0];
    if (found) {
      clip = found;
      break;
    }
  }

  const clipUrl = clip?.url ?? `https://clips.twitch.tv/${clipId}`;
  const title = clip?.title?.trim() || `Voice Clip — ${keyword}`;

  const { data: item } = await admin
    .from("creator_content_items")
    .insert({
      user_id: settings.user_id,
      platform: "twitch_clip",
      title,
      status: "to_generate",
      priority: "medium",
      creation_method: "voice",
      source_platform: "twitch",
      source_video_url: clipUrl,
      source_channel_login: auth.login,
      source_duration: clip?.duration ?? null,
      thumbnail_url: clip?.thumbnail_url ?? null,
      reason: `Créé avec la commande vocale « ${keyword} »`,
    })
    .select("id")
    .maybeSingle();

  await admin
    .from("voice_clip_events")
    .update({
      status: "ready",
      clip_url: clipUrl,
      content_item_id: (item as { id?: string } | null)?.id ?? null,
    })
    .eq("id", eventId);

  return json({
    ok: true,
    event_id: eventId,
    twitch_clip_id: clipId,
    clip_url: clipUrl,
    content_item_id: (item as { id?: string } | null)?.id ?? null,
  });
});
