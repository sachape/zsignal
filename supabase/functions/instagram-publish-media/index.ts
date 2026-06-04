// SCAFFOLD — disabled by default. See docs/meta-instagram-app-review.md
// Real Graph API publishing happens only when INSTAGRAM_PUBLISH_ENABLED=true.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { isPublishEnabled, getMetaConfig } = await import("../_shared/metaFlags.ts");

    if (!isPublishEnabled()) {
      return json(503, {
        error: "instagram_publish_disabled",
        message: "Publication Instagram en attente de validation Meta.",
      });
    }
    const cfg = getMetaConfig();
    if (!cfg) {
      return json(503, { error: "meta_not_configured" });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json(401, { error: "unauthorized" });

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const socialPostId = typeof body.social_post_id === "string" ? body.social_post_id : null;
    if (!socialPostId) return json(400, { error: "missing_social_post_id" });

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Ownership
    const { data: post } = await admin
      .from("creator_social_posts")
      .select("*")
      .eq("id", socialPostId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!post) return json(404, { error: "post_not_found" });

    // 2. Connection
    const { data: conn } = await admin
      .from("creator_meta_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("platform", "instagram")
      .maybeSingle();
    if (!conn || conn.connection_status !== "connected") {
      return json(412, { error: "instagram_not_connected" });
    }

    // TODO (post App Review):
    // 3. Decrypt access_token_encrypted with TOKEN_ENCRYPTION_KEY
    // 4. Validate token / refresh if needed
    // 5. POST https://graph.facebook.com/{v}/{ig-user-id}/media
    //      Post:  image_url|video_url + caption
    //      Reel:  media_type=REELS, video_url, caption
    //      Story: media_type=STORIES, image_url|video_url
    // 6. Poll container status_code until FINISHED
    // 7. POST /{ig-user-id}/media_publish { creation_id }
    // 8. Update creator_social_posts:
    //      status='published', external_platform_id, published_url, published_at
    //    On error: status='failed', error_code, error_message

    return json(501, {
      error: "not_implemented",
      message: "Publishing pipeline is scaffolded but not yet wired to Graph API.",
    });
  } catch (e) {
    return json(500, { error: "internal_error", message: e instanceof Error ? e.message : "unknown" });
  }
});
