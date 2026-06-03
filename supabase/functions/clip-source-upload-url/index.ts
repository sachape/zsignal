// V3D — Issue a signed upload URL for the source video bucket (per-user folder).
// Auth: user JWT. Returns { path, token, signed_url } so the frontend can PUT the file directly.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ALLOWED_EXT = new Set(["mp4", "mov"]);
const MAX_BYTES = 500 * 1024 * 1024;

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
  const filename = String(body.filename ?? "");
  const sizeBytes = Number(body.size_bytes ?? 0);
  const contentItemId = String(body.content_item_id ?? "");

  if (!filename || !contentItemId) return json({ error: "missing_fields" }, 400);
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return json({ error: "invalid_size" }, 400);
  if (sizeBytes > MAX_BYTES) return json({ error: "file_too_large" }, 400);

  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXT.has(ext)) return json({ error: "invalid_file_type" }, 400);

  // Verify content item ownership.
  const { data: item, error: itemErr } = await userClient
    .from("creator_content_items")
    .select("id")
    .eq("id", contentItemId)
    .maybeSingle();
  if (itemErr || !item) return json({ error: "content_item_not_found" }, 404);

  const path = `${userId}/${contentItemId}/${Date.now()}-source.${ext}`;
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: signed, error: signErr } = await admin.storage
    .from("creator-source-videos")
    .createSignedUploadUrl(path);

  if (signErr || !signed) return json({ error: "sign_failed", detail: signErr?.message }, 500);

  return json({
    success: true,
    path,
    token: signed.token,
    signed_url: signed.signedUrl,
  });
});
