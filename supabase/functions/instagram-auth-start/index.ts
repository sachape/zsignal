// SCAFFOLD — disabled by default. See docs/meta-instagram-app-review.md
// Returns 503 unless INSTAGRAM_OAUTH_ENABLED=true AND Meta secrets exist.
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
    const { isOAuthEnabled, getMetaConfig } = await import("../_shared/metaFlags.ts");

    if (!isOAuthEnabled()) {
      return json(503, {
        error: "instagram_oauth_disabled",
        message: "Connexion Meta en préparation. OAuth Instagram non encore activé.",
      });
    }

    const cfg = getMetaConfig();
    if (!cfg) {
      return json(503, {
        error: "meta_not_configured",
        message: "Meta non configuré (META_APP_ID / META_APP_SECRET / META_REDIRECT_URI manquants).",
      });
    }

    // Auth: identify user calling start
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json(401, { error: "unauthorized" });

    // CSRF state — signed with OAUTH_STATE_SECRET in a future iteration.
    const state = crypto.randomUUID();

    // Permissions minimales pour publication Instagram via Graph API
    // (Instagram Login for Business / Instagram Graph API).
    const scopes = [
      "instagram_business_basic",
      "instagram_business_content_publish",
      "instagram_business_manage_comments",
      "instagram_business_manage_messages",
    ].join(",");

    const authorizeUrl = new URL("https://www.facebook.com/" + cfg.graphApiVersion + "/dialog/oauth");
    authorizeUrl.searchParams.set("client_id", cfg.appId);
    authorizeUrl.searchParams.set("redirect_uri", cfg.redirectUri);
    authorizeUrl.searchParams.set("state", state);
    authorizeUrl.searchParams.set("scope", scopes);
    authorizeUrl.searchParams.set("response_type", "code");
    if (cfg.businessConfigId) authorizeUrl.searchParams.set("config_id", cfg.businessConfigId);

    return json(200, { authorize_url: authorizeUrl.toString(), state });
  } catch (e) {
    return json(500, { error: "internal_error", message: e instanceof Error ? e.message : "unknown" });
  }
});
