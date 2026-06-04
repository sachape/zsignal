// generate-auto-clip-candidates
// Manual / cron retry endpoint for generating auto-clip candidates for a live
// session. Inline path is wired in live-detect after generateDebrief().
//
// Body: { live_session_id: string }

import { createClient } from "npm:@supabase/supabase-js@2";
import { generateClipCandidates } from "../_shared/clipCandidates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json().catch(() => ({}));
    const sessionId = String((body as { live_session_id?: string }).live_session_id ?? "");
    if (!sessionId) return json({ error: "missing_live_session_id" }, 400);

    // Auth: user JWT must own the session.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (!claims?.claims) return json({ error: "unauthorized" }, 401);
    const userId = claims.claims.sub as string;

    const { data: owned } = await admin
      .from("live_sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!owned) return json({ error: "forbidden" }, 403);

    const result = await generateClipCandidates(admin, sessionId);
    return json({ success: true, result });
  } catch (err) {
    console.error("[generate-auto-clip-candidates]", err);
    return json({ success: false, error: "internal_server_error" }, 500);
  }
});
