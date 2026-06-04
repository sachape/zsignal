// Real OAuth start for Instagram — flow "Instagram API with Instagram Login".
// Direct Instagram Login (NOT Facebook Login). No Facebook Page required.
// Scopes V1: instagram_business_basic, instagram_business_content_publish.
// Gated by INSTAGRAM_OAUTH_ENABLED + presence of META_APP_ID/META_REDIRECT_URI.
// Never exposes META_APP_SECRET to the frontend. State is HMAC-signed.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { isOAuthEnabled, getMetaConfig } from "../_shared/metaFlags.ts";
import { signState } from "../_shared/oauthState.ts";

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
    if (!isOAuthEnabled()) {
      return json(503, {
        error: "instagram_oauth_disabled",
        message: "Connexion Meta non encore activée.",
      });
    }
    const cfg = getMetaConfig();
    if (!cfg) {
      return json(503, {
        error: "meta_not_configured",
        message: "Connexion Meta non configurée (secrets manquants).",
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json(401, { error: "unauthorized" });

    const state = await signState(user.id, "instagram", 600);

    // Instagram Login direct — minimal scopes for V1.
    // No pages_*, no business_management, no Facebook Page required.
    const scopes = [
      "instagram_business_basic",
      "instagram_business_content_publish",
    ].join(",");

    // Instagram Login authorize endpoint (NOT facebook.com/dialog/oauth).
    const authorizeUrl = new URL("https://www.instagram.com/oauth/authorize");
    authorizeUrl.searchParams.set("client_id", cfg.appId);
    authorizeUrl.searchParams.set("redirect_uri", cfg.redirectUri);
    authorizeUrl.searchParams.set("state", state);
    authorizeUrl.searchParams.set("scope", scopes);
    authorizeUrl.searchParams.set("response_type", "code");

    return json(200, { authorize_url: authorizeUrl.toString() });
  } catch (e) {
    return json(500, { error: "internal_error", message: e instanceof Error ? e.message : "unknown" });
  }
});
