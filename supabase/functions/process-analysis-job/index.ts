// process-analysis-job — Phase 2 (compute-only, parallel-safe)
//
// Server-side StreamScore computation for a queued analysis_job.
//
// Phase 2 contract (intentional limits):
//   - Compute-only: NO writes to analysis_reports, NO writes to
//     stream_score_snapshots, NO writes to analysis_jobs. The frontend
//     pipeline (autoRefreshRunner / analysisRunner) remains the sole
//     producer of full reports and snapshots. This avoids creating a
//     score-only report that would break Analyse / Dashboard / Weekly
//     Plan / recommendations / competitors consumers.
//   - Job state is NOT touched. Frontend fallback (status='queued') keeps
//     working unchanged. No duplicate-processing risk.
//   - Auth: per-user JWT required. Ownership enforced via RLS (user
//     client). A user cannot process another user's job.
//   - Facts source: reuses twitch-live-fetch (forwarding the user JWT).
//     No Twitch token decryption duplicated here.
//   - No raw Twitch payloads or tokens logged.
//
// Phase 3 (future): batch + persistence. Phase 4 (future): frontend
// defers to server with fallback.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  computeStreamScore,
  normalizeChannelFacts,
  type SharedChannelFact,
} from "../_shared/streamScoreEngine.ts";
import { extractChannelFacts } from "../_shared/factsEngine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface LiveFetchPayload {
  success?: boolean;
  profile?: {
    id?: string | null;
    login?: string | null;
    display_name?: string | null;
  } | null;
  follower_count?: number | null;
  followers_available?: boolean;
  videos?: Array<{
    title: string;
    duration: string;
    view_count: number;
    created_at: string;
  }>;
  clips?: Array<{ game_id: string; view_count: number; created_at: string }>;
  dominant_category?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const analysisJobId = typeof body?.analysis_job_id === "string"
      ? body.analysis_job_id
      : null;
    if (!analysisJobId) {
      return json({ error: "analysis_job_id is required" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    // RLS-scoped job lookup: a user cannot access another user's job here.
    const { data: job, error: jobErr } = await userClient
      .from("analysis_jobs")
      .select(
        "id, user_id, status, platform, platform_user_id, platform_login, channel_name",
      )
      .eq("id", analysisJobId)
      .maybeSingle();

    if (jobErr) return json({ error: "Job lookup failed" }, 500);
    if (!job) return json({ error: "Job not found or forbidden" }, 404);
    if (job.user_id !== userId) return json({ error: "Forbidden" }, 403);

    if (job.platform !== "twitch" || !job.platform_user_id) {
      return json(
        { error: "Job is not a connected Twitch job", job_id: job.id },
        422,
      );
    }

    // Reuse twitch-live-fetch with the same user JWT — no token decryption
    // duplicated, no raw token surfaced to this function.
    const liveRes = await fetch(`${supabaseUrl}/functions/v1/twitch-live-fetch`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify({}),
    });

    if (!liveRes.ok) {
      return json(
        {
          error: "twitch-live-fetch failed",
          status: liveRes.status,
          job_id: job.id,
        },
        502,
      );
    }

    const live = (await liveRes.json()) as LiveFetchPayload;
    if (!live?.success || !live.profile) {
      return json(
        { error: "twitch-live-fetch returned invalid payload", job_id: job.id },
        502,
      );
    }

    const facts = extractChannelFacts(
      {
        follower_count: live.follower_count ?? null,
        followers_available: live.followers_available ?? false,
      },
      live.videos ?? [],
      live.clips ?? [],
    );

    // Normalize to the shared engine's strict input shape (it accepts the
    // {key, value} subset — extra fields like label/confidence are ignored).
    const normalized: SharedChannelFact[] = normalizeChannelFacts(facts);
    const score = computeStreamScore(normalized);

    return json({
      ok: true,
      mode: "compute_only",
      job_id: job.id,
      platform: job.platform,
      platform_user_id: job.platform_user_id,
      platform_login: job.platform_login,
      job_status_unchanged: job.status,
      score,
      facts_count: normalized.length,
      computed_at: new Date().toISOString(),
      persisted: {
        analysis_reports: false,
        stream_score_snapshots: false,
        analysis_jobs: false,
      },
    });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
