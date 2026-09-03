// voice-clip-heartbeat
// The Live Companion pings this endpoint every ~20 s so Streamnco can show its
// status, pull its config, and run the microphone test.
//
// PRIVACY: no audio, no transcript. Only liveness + a boolean test detection.
//
// Auth: header `x-companion-token: <uuid>`
// Body (optional): {
//   version?, platform?, microphone_label?, microphone_available?,
//   test_detected?: boolean, test_keyword?: string
// }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logVoiceClip, VOICE_CLIP_ERROR } from "../_shared/voiceClip.ts";

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

interface HeartbeatBody {
  version?: string;
  platform?: string;
  microphone_label?: string;
  microphone_available?: boolean;
  listening?: boolean;
  test_detected?: boolean;
  test_keyword?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const token = req.headers.get("x-companion-token") ?? "";
  if (!UUID_RE.test(token)) {
    return json({ ok: false, error_code: VOICE_CLIP_ERROR.COMPANION_UNAUTHORIZED }, 401);
  }

  let body: HeartbeatBody = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data } = await admin
    .from("voice_clip_settings")
    .select(
      "user_id, enabled, keyword, cooldown_seconds, confidence_threshold, notifications_enabled, sound_feedback_enabled, test_mode_until",
    )
    .eq("companion_token", token)
    .maybeSingle();

  if (!data) {
    return json({ ok: false, error_code: VOICE_CLIP_ERROR.COMPANION_UNAUTHORIZED }, 401);
  }

  const row = data as {
    user_id: string;
    enabled: boolean;
    keyword: string;
    cooldown_seconds: number;
    confidence_threshold: number;
    notifications_enabled: boolean;
    sound_feedback_enabled: boolean;
    test_mode_until: string | null;
  };

  const now = new Date();
  const patch: Record<string, unknown> = { companion_last_seen_at: now.toISOString() };
  if (body.version) patch.companion_version = String(body.version).slice(0, 40);
  if (body.platform) patch.companion_platform = String(body.platform).slice(0, 40);
  if (body.microphone_label) patch.microphone_label = String(body.microphone_label).slice(0, 120);
  if (typeof body.microphone_available === "boolean") {
    patch.companion_microphone_available = body.microphone_available;
  }
  // Liveness is not enough: a running Companion with capture stopped must never
  // look "ready" in the web UI.
  if (typeof body.listening === "boolean") {
    patch.companion_listening = body.listening;
  }

  // Microphone test: the Companion detected the keyword locally. We only record
  // the fact — no Twitch call, no clip, no event row.
  if (body.test_detected === true) {
    patch.last_test_detected_at = now.toISOString();
    patch.last_test_keyword = String(body.test_keyword ?? row.keyword).slice(0, 40);
    patch.test_mode_until = null;
    logVoiceClip("test_detection", { user_id: row.user_id });
  }

  await admin.from("voice_clip_settings").update(patch).eq("companion_token", token);

  const testMode = Boolean(
    row.test_mode_until && new Date(row.test_mode_until).getTime() > now.getTime(),
  );

  return json({
    ok: true,
    server_time: now.toISOString(),
    config: {
      enabled: row.enabled,
      keyword: row.keyword,
      cooldown_seconds: row.cooldown_seconds,
      confidence_threshold: row.confidence_threshold,
      notifications_enabled: row.notifications_enabled,
      sound_feedback_enabled: row.sound_feedback_enabled,
      // In test mode the Companion must NOT call voice-clip-trigger.
      test_mode: testMode,
    },
  });
});
