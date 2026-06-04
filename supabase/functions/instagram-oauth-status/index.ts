// Public status endpoint: tells the frontend whether the Instagram OAuth
// flow can be initiated (backend flag ON + Meta secrets present).
// Returns booleans only — no secrets, no tokens, no user data.
import { isOAuthEnabled, isPublishEnabled, getMetaConfig } from "../_shared/metaFlags.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const cfg = getMetaConfig();
  const body = {
    oauth_enabled: isOAuthEnabled() && cfg !== null,
    publish_enabled: isPublishEnabled(),
    configured: cfg !== null,
  };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
