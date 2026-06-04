// SCAFFOLD — disabled by default. See docs/meta-instagram-app-review.md
// Real token exchange happens only when flag + secrets are present.
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
        message: "Connexion Meta en préparation.",
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
    const code = typeof body.code === "string" ? body.code : null;
    // const state = typeof body.state === "string" ? body.state : null; // TODO: verify CSRF
    if (!code) return json(400, { error: "missing_code" });

    // TODO (post App Review):
    // 1. POST https://graph.facebook.com/{v}/oauth/access_token
    //    ?client_id&client_secret&redirect_uri&code
    // 2. Long-lived token exchange.
    // 3. GET /me/accounts then resolve Instagram Business Account ID.
    // 4. Encrypt token with TOKEN_ENCRYPTION_KEY before insert.
    // 5. Upsert into creator_meta_connections with connection_status='connected'.

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    await admin.from("creator_meta_connections").upsert({
      user_id: user.id,
      platform: "instagram",
      connection_status: "pending_review",
      error_code: "scaffold_only",
      error_message: "OAuth callback scaffold — Meta App Review not completed.",
    }, { onConflict: "user_id,platform" });

    return json(202, {
      status: "pending_review",
      message: "Scaffold callback. Token exchange will be enabled after Meta App Review.",
    });
  } catch (e) {
    return json(500, { error: "internal_error", message: e instanceof Error ? e.message : "unknown" });
  }
});
