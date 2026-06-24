// zernio-publish-clip
// Publishes (or schedules) a generated clip to one or more connected social networks.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { zernioJson } from "../_shared/zernio.ts";

interface PublishBody {
  content_item_id?: string;
  clip_id?: string;
  account_ids: string[]; // zernio account ids
  caption?: string;
  hashtags?: string[];
  scheduled_at?: string | null;
  publish_now?: boolean;
  visibility?: "public" | "private" | "unlisted";
}

interface ZernioPostResp {
  post: { _id: string; status?: string };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    const userId = claims?.claims?.sub as string | undefined;
    if (!userId) return json({ error: "Unauthorized" }, 401);

    const body = (await req.json().catch(() => ({}))) as PublishBody;
    const accountIds = Array.isArray(body.account_ids) ? body.account_ids.filter(Boolean) : [];
    if (accountIds.length === 0) return json({ error: "Sélectionne au moins un compte." }, 400);
    if (!body.content_item_id && !body.clip_id) {
      return json({ error: "Identifiant de clip manquant." }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Resolve the clip + ownership
    const itemId = body.content_item_id ?? body.clip_id!;
    const { data: item, error: itemErr } = await admin
      .from("creator_content_items")
      .select("id, user_id, generated_video_url, title, hashtags, selected_hashtags")
      .eq("id", itemId)
      .maybeSingle();
    if (itemErr || !item) return json({ error: "Clip introuvable." }, 404);
    if (item.user_id !== userId) return json({ error: "Accès refusé." }, 403);
    if (!item.generated_video_url) return json({ error: "Vidéo générée indisponible." }, 400);

    // Verify the chosen accounts belong to this user
    const { data: ownedAccounts } = await admin
      .from("creator_connected_accounts")
      .select("id, zernio_account_id, platform")
      .eq("user_id", userId)
      .in("zernio_account_id", accountIds);
    const validAccountIds = (ownedAccounts ?? [])
      .map((a) => a.zernio_account_id)
      .filter((id): id is string => Boolean(id));
    if (validAccountIds.length === 0) {
      return json({ error: "Aucun compte connecté valide." }, 400);
    }

    const caption = (body.caption ?? item.title ?? "").trim();
    const hashtags = Array.isArray(body.hashtags) && body.hashtags.length > 0
      ? body.hashtags
      : Array.isArray(item.selected_hashtags) ? item.selected_hashtags as string[]
      : Array.isArray(item.hashtags) ? item.hashtags as string[]
      : [];

    const fullCaption = hashtags.length > 0
      ? `${caption}\n\n${hashtags.map((h) => h.startsWith("#") ? h : `#${h}`).join(" ")}`.trim()
      : caption;

    const idempotencyKey = `streamnco:${itemId}:${Date.now()}`;
    const postBody: Record<string, unknown> = {
      accountIds: validAccountIds,
      mediaUrl: item.generated_video_url,
      caption: fullCaption,
    };
    if (body.scheduled_at) {
      postBody.scheduledFor = body.scheduled_at;
    } else if (body.publish_now !== false) {
      postBody.publishNow = true;
    }
    if (body.visibility) postBody.visibility = body.visibility;

    let zernioResp: ZernioPostResp | null = null;
    let publishError: string | null = null;
    try {
      zernioResp = await zernioJson<ZernioPostResp>("/posts", {
        method: "POST",
        body: JSON.stringify(postBody),
        idempotencyKey,
      });
    } catch (e) {
      publishError = (e as Error).message ?? "publish_failed";
    }

    const status = publishError
      ? "failed"
      : body.scheduled_at ? "scheduled" : "publishing";

    // Persist a publication row per platform targeted (one row aggregates all accounts)
    const platforms = Array.from(
      new Set((ownedAccounts ?? [])
        .filter((a) => a.zernio_account_id && validAccountIds.includes(a.zernio_account_id))
        .map((a) => a.platform)),
    );
    for (const platform of platforms) {
      await admin.from("creator_social_posts").insert({
        user_id: userId,
        platform,
        format: "clip",
        status,
        caption: fullCaption || null,
        hashtags: hashtags.length > 0 ? hashtags : null,
        media_url: item.generated_video_url,
        source_content_item_id: itemId,
        scheduled_at: body.scheduled_at ?? null,
        zernio_post_id: zernioResp?.post?._id ?? null,
        zernio_raw_response: zernioResp as unknown as Record<string, unknown> ?? null,
        target_account_ids: validAccountIds,
        error_message: publishError,
      });
    }

    // Mirror status on the content item
    if (!publishError) {
      await admin
        .from("creator_content_items")
        .update({
          status: body.scheduled_at ? "draft_ready" : "published",
          published_at: body.scheduled_at ? null : new Date().toISOString(),
          external_platform_id: zernioResp?.post?._id ?? null,
        })
        .eq("id", itemId);
    }

    if (publishError) return json({ error: publishError, status }, 502);
    return json({ ok: true, status, post_id: zernioResp?.post?._id, platforms });
  } catch (e) {
    console.error("[zernio-publish-clip]", e);
    return json({ error: (e as Error).message ?? "internal_error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
