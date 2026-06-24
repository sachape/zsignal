// zernio-webhook
// Receives Zernio webhook events (HMAC-SHA256 signed) and updates publication status.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  const secret = Deno.env.get("ZERNIO_WEBHOOK_SECRET");
  if (!secret) {
    console.error("[zernio-webhook] missing ZERNIO_WEBHOOK_SECRET");
    return new Response("misconfigured", { status: 500 });
  }

  const rawBody = await req.text();
  const sig =
    req.headers.get("X-Zernio-Signature") ??
    req.headers.get("x-zernio-signature") ??
    req.headers.get("X-Late-Signature") ??
    req.headers.get("x-late-signature");
  if (!sig) return new Response("missing signature", { status: 401 });

  const expected = await hmacHex(secret, rawBody);
  if (!timingSafeEqual(expected, sig.toLowerCase())) {
    return new Response("invalid signature", { status: 401 });
  }

  let payload: Record<string, unknown> = {};
  try { payload = JSON.parse(rawBody); } catch { return new Response("invalid json", { status: 400 }); }

  const eventType = String(payload.event ?? payload.type ?? "");
  const data = (payload.data ?? payload) as Record<string, unknown>;
  const postId = String(data.postId ?? data.post_id ?? data._id ?? "");

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  if (eventType.startsWith("post.") && postId) {
    const statusMap: Record<string, string> = {
      "post.scheduled": "scheduled",
      "post.published": "published",
      "post.failed": "failed",
      "post.partial": "partial",
      "post.cancelled": "cancelled",
    };
    const newStatus = statusMap[eventType] ?? null;
    if (newStatus) {
      const patch: Record<string, unknown> = {
        status: newStatus,
        zernio_raw_response: payload,
        updated_at: new Date().toISOString(),
      };
      if (newStatus === "published") {
        patch.published_at = new Date().toISOString();
        patch.published_url = (data.publishedUrl ?? data.url) ?? null;
        patch.external_platform_id = (data.externalId ?? data.platformPostId) ?? null;
      }
      if (newStatus === "failed") {
        patch.error_message = String(data.error ?? data.message ?? "Publication échouée");
        patch.error_code = String(data.errorCode ?? "zernio_failed");
      }
      const { data: updated } = await admin
        .from("creator_social_posts")
        .update(patch)
        .eq("zernio_post_id", postId)
        .select("source_content_item_id, status")
        .maybeSingle();

      // Reflect onto content item when terminal
      const itemId = updated?.source_content_item_id as string | undefined;
      if (itemId && (newStatus === "published" || newStatus === "failed")) {
        await admin
          .from("creator_content_items")
          .update(newStatus === "published"
            ? { status: "published", published_at: new Date().toISOString() }
            : { status: "draft_ready" })
          .eq("id", itemId);
      }
    }
  } else if (eventType.startsWith("account.")) {
    const accountId = String(data.accountId ?? data._id ?? "");
    if (accountId) {
      const status = eventType === "account.connected" ? "connected" : "disconnected";
      await admin
        .from("creator_connected_accounts")
        .update({ connection_status: status, updated_at: new Date().toISOString() })
        .eq("zernio_account_id", accountId);
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

async function hmacHex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
