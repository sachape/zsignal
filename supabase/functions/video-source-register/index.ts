// Format Réseaux — enregistre une video source après upload (ou pour URL Twitch).
// Auth: JWT. Body: { source_type, storage_path?, storage_bucket?, source_url?, original_filename?, mime_type?, duration_seconds?, width?, height?, platform?, platform_video_id? }

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claims?.claims) return json({ error: "unauthorized" }, 401);
  const userId = claims.claims.sub as string;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }

  const sourceType = String(body.source_type ?? "");
  if (!["streamnco_detected", "twitch_vod_url", "manual_upload"].includes(sourceType)) {
    return json({ error: "invalid_source_type" }, 400);
  }

  const storagePath = body.storage_path ? String(body.storage_path) : null;
  if (sourceType === "manual_upload") {
    if (!storagePath) return json({ error: "missing_storage_path" }, 400);
    if (!storagePath.startsWith(`${userId}/`)) return json({ error: "forbidden_path" }, 403);
  }

  const row = {
    user_id: userId,
    source_type: sourceType,
    storage_bucket: body.storage_bucket ? String(body.storage_bucket) : (sourceType === "manual_upload" ? "creator-source-videos" : null),
    storage_path: storagePath,
    source_url: body.source_url ? String(body.source_url) : null,
    original_filename: body.original_filename ? String(body.original_filename) : null,
    mime_type: body.mime_type ? String(body.mime_type) : null,
    duration_seconds: Number.isFinite(Number(body.duration_seconds)) ? Number(body.duration_seconds) : null,
    width: Number.isFinite(Number(body.width)) ? Number(body.width) : null,
    height: Number.isFinite(Number(body.height)) ? Number(body.height) : null,
    platform: body.platform ? String(body.platform) : null,
    platform_video_id: body.platform_video_id ? String(body.platform_video_id) : null,
  };

  const { data, error } = await userClient
    .from("creator_video_sources")
    .insert(row)
    .select()
    .single();

  if (error) return json({ error: "insert_failed", detail: error.message }, 500);
  return json({ success: true, source: data });
});
