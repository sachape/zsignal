const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const raw = typeof body?.channel_name === "string" ? body.channel_name : "";
    // Normalize: trim + lowercase; accept @prefix and twitch.tv URLs by extracting the login segment.
    let candidate = raw.trim().toLowerCase();
    if (candidate.startsWith("@")) candidate = candidate.slice(1);
    if (candidate.includes("twitch.tv")) {
      const idx = candidate.indexOf("twitch.tv/");
      if (idx >= 0) candidate = candidate.slice(idx + "twitch.tv/".length).split(/[/?#]/)[0];
    }
    // Twitch login: 4–25 chars, [a-z0-9_].
    if (!/^[a-z0-9_]{4,25}$/.test(candidate)) {
      return new Response(JSON.stringify({ error: "invalid_channel_name" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const channel_name = candidate;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create analysis job
    const { data: job, error: jobError } = await supabaseAdmin
      .from("analysis_jobs")
      .insert({ user_id: user.id, channel_name, status: "queued" })
      .select("id")
      .single();

    if (jobError) {
      console.error("[twitch-analyze] job insert failed", jobError);
      return new Response(JSON.stringify({ error: "internal_server_error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // TODO: Pipeline steps (to be implemented with live Twitch API)
    // 1. Fetch Twitch profile
    // 2. Fetch recent videos
    // 3. Fetch top clips
    // 4. Extract channel facts
    // 5. Compute StreamScore
    // 6. Find competitors
    // 7. Generate recommendations
    // 8. Compile analysis report
    // 9. Update job status to 'done'

    return new Response(
      JSON.stringify({ success: true, job_id: job.id, status: "queued" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[twitch-analyze] unexpected", err);
    return new Response(JSON.stringify({ error: "internal_server_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
