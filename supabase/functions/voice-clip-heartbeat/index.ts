// voice-clip-heartbeat
// The Live Companion pings this endpoint so Streamnco can show its status.
// No audio, no transcript — only a liveness signal.
//
// Auth: header `x-companion-token: <uuid>`
// Body (optional): { version?: string, microphone_label?: string }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const token = req.headers.get("x-companion-token") ?? "";
  if (!UUID_RE.test(token)) return json({ error: "unauthorized" }, 401);

  let body: { version?: string; microphone_label?: string } = {};
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
    .select("user_id, enabled, keyword, cooldown_seconds, confidence_threshold, notifications_enabled, sound_feedback_enabled")
    .eq("companion_token", token)
    .maybeSingle();

  if (!data) return json({ error: "unauthorized" }, 401);

  const patch: Record<string, unknown> = { companion_last_seen_at: new Date().toISOString() };
  if (body.version) patch.companion_version = String(body.version).slice(0, 40);
  if (body.microphone_label) patch.microphone_label = String(body.microphone_label).slice(0, 120);

  await admin
    .from("voice_clip_settings")
    .update(patch)
    .eq("companion_token", token);

  const row = data as Record<string, unknown>;
  return json({
    ok: true,
    config: {
      enabled: row.enabled,
      keyword: row.keyword,
      cooldown_seconds: row.cooldown_seconds,
      confidence_threshold: row.confidence_threshold,
      notifications_enabled: row.notifications_enabled,
      sound_feedback_enabled: row.sound_feedback_enabled,
    },
  });
});
