// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const BUCKET = "creator-visual-uploads";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "missing_auth" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "unauthorized" }, 401);
    const user = userData.user;

    const body = await req.json().catch(() => ({} as any));
    const filename = String(body.filename ?? "upload.png").replace(/[^a-zA-Z0-9._-]/g, "_");
    const mimeType = String(body.mime_type ?? "image/png");
    const sizeBytes = Number(body.size_bytes ?? 0);
    if (sizeBytes > 8 * 1024 * 1024) return json({ error: "file_too_large" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const path = `${user.id}/${crypto.randomUUID()}-${filename}`;
    const { data: signed, error: sErr } = await admin.storage
      .from(BUCKET)
      .createSignedUploadUrl(path);
    if (sErr || !signed) return json({ error: "sign_failed" }, 500);

    const { data: asset, error: insErr } = await admin
      .from("visual_uploaded_assets")
      .insert({
        user_id: user.id,
        kind: "reference",
        storage_bucket: BUCKET,
        storage_path: path,
        original_filename: filename,
        mime_type: mimeType,
        size_bytes: sizeBytes || null,
      })
      .select()
      .single();
    if (insErr || !asset) return json({ error: "insert_failed" }, 500);

    return json(
      {
        asset_id: asset.id,
        upload_url: signed.signedUrl,
        token: signed.token,
        path,
        bucket: BUCKET,
      },
      200,
    );
  } catch (e) {
    console.error("[visual-asset-upload-url] error", e);
    return json({ error: "internal_error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
