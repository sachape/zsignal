// youtube-upload-video
// Uploads a user-provided video file to YouTube via the authenticated
// YouTube OAuth token (scope youtube.upload). Tokens are decrypted
// server-side only and never exposed to the frontend.
//
// Multipart form-data:
//   - content_item_id : uuid (required)
//   - file            : video file (mp4 or mov, required)
//   - title           : string (optional, defaults to content item title)
//   - description     : string (optional)
//   - tags            : comma-separated string (optional)
//   - privacy_status  : "private" | "unlisted" | "public" (defaults private)
//   - category_id     : YouTube category id (optional, defaults "20" - Gaming)
//
// Returns: { success, video_id?, video_url?, privacy?, reason? }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptToken, decryptToken } from "../_shared/youtube-crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_FILE_BYTES = 128 * 1024 * 1024; // 128 MB
const ACCEPTED_MIME = new Set([
  "video/mp4",
  "video/quicktime", // .mov
  "video/x-quicktime",
]);
const ACCEPTED_EXT = /\.(mp4|mov)$/i;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function refresh(clientId: string, clientSecret: string, refreshToken: string) {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!r.ok) return null;
  return r.json() as Promise<{ access_token: string; expires_in: number; scope?: string }>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const clientId = Deno.env.get("YOUTUBE_CLIENT_ID");
    const clientSecret = Deno.env.get("YOUTUBE_CLIENT_SECRET");
    const encryptionKey = Deno.env.get("TOKEN_ENCRYPTION_KEY");
    if (!clientId || !clientSecret || !encryptionKey) {
      return json({ success: false, reason: "server_misconfigured" }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: authHeader, apikey: anonKey },
    });
    const userData = await userRes.json();
    if (!userData?.id) return json({ error: "Unauthorized" }, 401);
    const userId = userData.id as string;

    // Parse multipart form-data
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return json({ success: false, reason: "invalid_form" }, 400);
    }

    const contentItemId = (form.get("content_item_id") ?? "").toString().trim();
    const file = form.get("file");
    if (!contentItemId || !(file instanceof File)) {
      return json({ success: false, reason: "missing_params" }, 400);
    }

    // File validation
    const fileType = (file.type || "").toLowerCase();
    const fileName = file.name || "";
    if (!ACCEPTED_MIME.has(fileType) && !ACCEPTED_EXT.test(fileName)) {
      return json({ success: false, reason: "invalid_file_type" }, 400);
    }
    if (file.size <= 0) {
      return json({ success: false, reason: "empty_file" }, 400);
    }
    if (file.size > MAX_FILE_BYTES) {
      return json({
        success: false,
        reason: "file_too_large",
        max_bytes: MAX_FILE_BYTES,
      }, 413);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Load the content item (must belong to the user and be YouTube)
    const { data: item, error: itemErr } = await admin
      .from("creator_content_items")
      .select("*")
      .eq("id", contentItemId)
      .eq("user_id", userId)
      .maybeSingle();
    if (itemErr || !item) {
      return json({ success: false, reason: "item_not_found" }, 404);
    }
    if (item.platform !== "youtube_shorts") {
      return json({ success: false, reason: "wrong_platform" }, 400);
    }

    // Metadata
    const title = ((form.get("title") ?? item.title ?? "").toString().trim() || "Untitled").slice(0, 100);
    const description = ((form.get("description") ?? item.description ?? "").toString()).slice(0, 5000);
    const tagsRaw = (form.get("tags") ?? "").toString();
    const tags = tagsRaw
      .split(/[\n,]+/)
      .map((t) => t.trim().replace(/^#/, ""))
      .filter(Boolean)
      .slice(0, 25);
    const privacyInput = (form.get("privacy_status") ?? "private").toString();
    const privacy = ["public", "private", "unlisted"].includes(privacyInput) ? privacyInput : "private";
    const categoryId = (form.get("category_id") ?? "20").toString();

    // Load YouTube connection
    const { data: row } = await admin
      .from("creator_connected_accounts")
      .select("*")
      .eq("user_id", userId)
      .eq("platform", "youtube")
      .maybeSingle();
    if (!row) return json({ success: false, reason: "youtube_not_connected" }, 404);

    let accessToken = await decryptToken(row.access_token_encrypted, encryptionKey);
    const refreshToken = await decryptToken(row.refresh_token_encrypted, encryptionKey);
    const expiresAt = row.token_expires_at ? new Date(row.token_expires_at).getTime() : 0;
    const needsRefresh = !accessToken || (expiresAt > 0 && expiresAt - 60_000 < Date.now());

    if (needsRefresh) {
      if (!refreshToken) {
        await admin.from("creator_connected_accounts")
          .update({ connection_status: "expired" }).eq("id", row.id);
        return json({ success: false, reason: "token_expired" }, 401);
      }
      const refreshed = await refresh(clientId, clientSecret, refreshToken);
      if (!refreshed) {
        await admin.from("creator_connected_accounts")
          .update({ connection_status: "expired" }).eq("id", row.id);
        return json({ success: false, reason: "token_expired" }, 401);
      }
      accessToken = refreshed.access_token;
      await admin.from("creator_connected_accounts").update({
        access_token_encrypted: await encryptToken(accessToken, encryptionKey),
        token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        connection_status: "connected",
      }).eq("id", row.id);
    }

    // ── YouTube resumable upload ──
    // 1) Initiate resumable session
    const metadata = {
      snippet: {
        title,
        description,
        tags,
        categoryId,
      },
      status: {
        privacyStatus: privacy,
        selfDeclaredMadeForKids: false,
        embeddable: true,
      },
    };

    const initRes = await fetch(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Type": fileType || "video/mp4",
          "X-Upload-Content-Length": String(file.size),
        },
        body: JSON.stringify(metadata),
      },
    );

    if (initRes.status === 401) {
      await admin.from("creator_connected_accounts")
        .update({ connection_status: "expired" }).eq("id", row.id);
      return json({ success: false, reason: "token_expired" }, 401);
    }
    if (initRes.status === 403) {
      const txt = await initRes.text().catch(() => "");
      console.warn("youtube-upload init 403", txt.slice(0, 300));
      return json({ success: false, reason: "missing_scope" }, 403);
    }
    if (!initRes.ok) {
      const txt = await initRes.text().catch(() => "");
      console.warn("youtube-upload init failed", initRes.status, txt.slice(0, 300));
      let reason = "youtube_error";
      try {
        const ej = JSON.parse(txt);
        const code = ej?.error?.errors?.[0]?.reason as string | undefined;
        if (code === "insufficientPermissions") reason = "missing_scope";
        else if (code === "quotaExceeded") reason = "quota_exceeded";
        else if (code === "uploadLimitExceeded") reason = "upload_limit";
      } catch { /* ignore */ }
      // consume body already
      return json({ success: false, reason, status: initRes.status }, 502);
    }

    const uploadUrl = initRes.headers.get("location") || initRes.headers.get("Location");
    await initRes.text().catch(() => "");
    if (!uploadUrl) {
      return json({ success: false, reason: "no_upload_url" }, 502);
    }

    // 2) Upload the bytes in a single PUT
    const bytes = new Uint8Array(await file.arrayBuffer());
    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": fileType || "video/mp4",
        "Content-Length": String(bytes.byteLength),
      },
      body: bytes,
    });

    if (!putRes.ok) {
      const txt = await putRes.text().catch(() => "");
      console.warn("youtube-upload PUT failed", putRes.status, txt.slice(0, 300));
      let reason = "upload_failed";
      if (putRes.status === 401) reason = "token_expired";
      else if (putRes.status === 403) reason = "missing_scope";
      else if (putRes.status === 413) reason = "file_too_large";
      return json({ success: false, reason, status: putRes.status }, 502);
    }

    const created = await putRes.json().catch(() => null) as
      | { id?: string; status?: { privacyStatus?: string } }
      | null;
    const videoId = created?.id;
    if (!videoId) {
      return json({ success: false, reason: "no_video_id" }, 502);
    }
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // 3) Persist on the content item
    const nextStatus = privacy === "public" ? "published" : "uploaded";
    const patch: Record<string, unknown> = {
      youtube_video_id: videoId,
      youtube_url: videoUrl,
      youtube_uploaded_at: new Date().toISOString(),
      youtube_privacy_status: privacy,
      status: nextStatus,
      // V3.5 — generic post-publish fields
      published_url: videoUrl,
      published_platform: "youtube",
      external_platform_id: videoId,
    };
    if (privacy === "public") {
      patch.published_at = new Date().toISOString();
    }

    await admin.from("creator_content_items")
      .update(patch)
      .eq("id", contentItemId)
      .eq("user_id", userId);

    return json({
      success: true,
      video_id: videoId,
      video_url: videoUrl,
      privacy,
      status: nextStatus,
    });
  } catch (e) {
    console.error("youtube-upload-video", e);
    return json({ success: false, reason: "internal" }, 500);
  }
});
