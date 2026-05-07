// HTTP entrypoint to ingest Twitch clips for a (user, broadcaster).
// Idempotent upsert keyed by twitch_clip_id. Server-side only — uses
// Twitch app access token, never exposes tokens or raw payloads.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ingestClipsFor, type IngestParams } from "../_shared/clipIngest.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : "";

    let isCron = false;
    if (token) {
      const { data: ok } = await admin.rpc("verify_eventsub_cron_secret", {
        token,
      });
      isCron = ok === true;
    }

    let callerUserId: string | null = null;
    if (!isCron) {
      const { data } = await admin.auth.getUser(token);
      callerUserId = data.user?.id ?? null;
      if (!callerUserId) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const body = (await req.json().catch(() => ({}))) as Partial<IngestParams>;
    if (!body.user_id || !body.broadcaster_id || !body.started_at) {
      return new Response(
        JSON.stringify({
          error: "user_id, broadcaster_id, started_at required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    if (!isCron) {
      if (callerUserId !== body.user_id) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Derive/verify broadcaster_id from connected Twitch account.
      // A JWT user can only ingest clips for their own connected broadcaster.
      const { data: account } = await admin
        .from("connected_accounts")
        .select("platform_user_id")
        .eq("user_id", callerUserId)
        .eq("platform", "twitch")
        .maybeSingle();
      const ownedBroadcasterId = account?.platform_user_id ?? null;
      if (!ownedBroadcasterId) {
        return new Response(
          JSON.stringify({ error: "No connected Twitch account" }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      if (body.broadcaster_id !== ownedBroadcasterId) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const result = await ingestClipsFor(admin, body as IngestParams);
    return new Response(JSON.stringify({ success: true, ...result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[twitch-clips-ingest] error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
