// Format Réseaux — génère une signed upload URL pour uploader une vidéo source.
// Auth: JWT. Body: { filename, mime_type }
// Retourne: { upload_url, storage_bucket, storage_path }

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ALLOWED_MIMES = new Set([
  "video/mp4",
  "video/quicktime", // .mov
  "video/webm",
  "video/x-matroska",
]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
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

  const filename = sanitize(String(body.filename ?? "upload.mp4"));
  const mimeType = String(body.mime_type ?? "video/mp4");

  if (!ALLOWED_MIMES.has(mimeType)) {
    return json({ error: "unsupported_mime", message: "Format non supporté. Utilise MP4, MOV ou WebM." }, 400);
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const storagePath = `${userId}/uploads/${crypto.randomUUID()}-${filename}`;
  const { data, error } = await admin.storage
    .from("creator-source-videos")
    .createSignedUploadUrl(storagePath);

  if (error || !data?.signedUrl) {
    return json({ error: "signed_url_failed", detail: error?.message }, 500);
  }

  return json({
    upload_url: data.signedUrl,
    storage_bucket: "creator-source-videos",
    storage_path: storagePath,
  });
});
