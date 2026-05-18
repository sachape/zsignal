// process-analysis-job — Phase 3 (score snapshot producer)
//
// Phase 3 contract:
//   - Computes the authoritative server-side StreamScore using the SHARED
//     engine, and PERSISTS it as a stream_score_snapshots row.
//   - Does NOT insert into analysis_reports. The full report (recos,
//     competitors, opportunities, weekly plan inputs) is still produced by
//     the existing frontend pipeline.
//   - Does NOT change analysis_jobs.status. The job remains 'queued' so the
//     frontend autoRefreshRunner can still produce the full report later.
//   - Idempotency: the table has a partial UNIQUE index on analysis_job_id.
//     We insert with ON CONFLICT DO NOTHING. If the frontend later inserts
//     an analysis_report for the same job, the
//     upsert_stream_score_snapshot_from_report trigger ON CONFLICT DO
//     UPDATEs the SAME row (id stable), so email dedup keyed on snapshot_id
//     keeps working.
//
// Modes:
//   - single user mode (default): POST { analysis_job_id } with user JWT.
//   - batch mode: POST { mode:"queued_batch", limit?:10 } with
//     Authorization: Bearer <CRON_SECRET>. Picks queued Twitch jobs with no
//     existing snapshot, processes up to N, never marks jobs completed.
//
// Security:
//   - Single mode: RLS-scoped lookup via user client. A user cannot process
//     another user's job.
//   - Batch mode: requires the CRON_SECRET shared with our pg_cron caller.
//   - No Twitch tokens decrypted here. twitch-live-fetch (existing) handles
//     token decryption with the user's JWT.
//   - No raw Twitch payloads or tokens logged.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  computeStreamScore,
  normalizeChannelFacts,
  type SharedChannelFact,
  type SharedStreamScore,
} from "../_shared/streamScoreEngine.ts";
import { extractChannelFacts } from "../_shared/factsEngine.ts";
import {
  fetchTwitchFactsForAccount,
  type ServerTwitchFacts,
} from "../_shared/twitchFactsFetch.ts";

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

type Level = "low" | "medium" | "high";
function levelFromPct(pct: number): Level {
  if (pct >= 70) return "high";
  if (pct >= 35) return "medium";
  return "low";
}

interface JobRow {
  id: string;
  user_id: string;
  status: string;
  platform: string | null;
  platform_user_id: string | null;
  platform_login: string | null;
}

interface ProcessResult {
  job_id: string;
  status: "persisted" | "skipped_existing" | "skipped_no_facts" | "error";
  snapshot_id?: string;
  overall?: number;
  error?: string;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

/**
 * Builds a stream_score_snapshots row from a computed score.
 * Mirrors src/services/streamScoreSnapshot.ts shape so that a later
 * frontend report-triggered upsert produces compatible values.
 */
function buildSnapshotRow(args: {
  userId: string;
  analysisJobId: string;
  score: SharedStreamScore;
}) {
  const { userId, analysisJobId, score } = args;

  const sortedAsc = [...score.breakdown].sort((a, b) => a.score - b.score);
  const sortedDesc = [...score.breakdown].sort((a, b) => b.score - a.score);
  const weakest = sortedAsc[0];
  const strongest = sortedDesc[0];

  const confidence: Level = levelFromPct(score.confidence);
  const signalQuality: Level = levelFromPct(
    Math.round(score.confidence * 0.6 + score.freshness * 0.4),
  );

  return {
    user_id: userId,
    analysis_job_id: analysisJobId,
    overall: Math.round(score.overall),
    regularity: Math.round(score.regularity),
    structure: Math.round(score.structure),
    content: Math.round(score.content),
    positioning: Math.round(score.positioning),
    momentum: Math.round(score.momentum),
    monetization: Math.round(score.monetization),
    confidence,
    signal_quality: signalQuality,
    priority_dimension: weakest?.dimension ?? null,
    top_drag: weakest?.dimension ?? null,
    top_support: strongest?.dimension ?? null,
    evidence: {
      source: "process-analysis-job",
      score_engine: "shared.v2",
      score_confidence: score.confidence,
      score_freshness: score.freshness,
      dimension_count: score.breakdown.length,
    },
  };
}

/**
 * Compute + persist a snapshot for ONE job, given a working Twitch fetch
 * function. Returns a structured result instead of throwing.
 */
async function processOneJob(args: {
  admin: ReturnType<typeof createClient>;
  job: JobRow;
  fetchLive: () => Promise<Response>;
}): Promise<ProcessResult> {
  const { admin, job, fetchLive } = args;

  // Skip if snapshot already exists for this job (server or trigger origin).
  const { data: existing } = await admin
    .from("stream_score_snapshots")
    .select("id")
    .eq("analysis_job_id", job.id)
    .maybeSingle();
  if (existing?.id) {
    return {
      job_id: job.id,
      status: "skipped_existing",
      snapshot_id: existing.id,
    };
  }

  const liveRes = await fetchLive();
  if (!liveRes.ok) {
    return {
      job_id: job.id,
      status: "error",
      error: `twitch-live-fetch ${liveRes.status}`,
    };
  }
  const live = (await liveRes.json()) as LiveFetchPayload;
  if (!live?.success || !live.profile) {
    return { job_id: job.id, status: "error", error: "invalid live payload" };
  }

  const facts = extractChannelFacts(
    {
      follower_count: live.follower_count ?? null,
      followers_available: live.followers_available ?? false,
    },
    live.videos ?? [],
    live.clips ?? [],
  );
  const normalized: SharedChannelFact[] = normalizeChannelFacts(facts);
  if (normalized.length === 0) {
    return { job_id: job.id, status: "skipped_no_facts" };
  }

  const score = computeStreamScore(normalized);
  const row = buildSnapshotRow({
    userId: job.user_id,
    analysisJobId: job.id,
    score,
  });

  // Insert via service role. We already SELECTed for existing rows above,
  // so a unique-violation here means a concurrent worker raced us — re-read
  // and report skipped_existing.
  const { data: inserted, error: insertErr } = await admin
    .from("stream_score_snapshots")
    .insert(row)
    .select("id")
    .maybeSingle();

  if (insertErr) {
    if (/duplicate key|unique/i.test(insertErr.message)) {
      const { data: again } = await admin
        .from("stream_score_snapshots")
        .select("id")
        .eq("analysis_job_id", job.id)
        .maybeSingle();
      return {
        job_id: job.id,
        status: "skipped_existing",
        snapshot_id: again?.id,
        overall: row.overall,
      };
    }
    return { job_id: job.id, status: "error", error: insertErr.message };
  }

  return {
    job_id: job.id,
    status: "persisted",
    snapshot_id: inserted.id,
    overall: row.overall,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const mode = typeof body?.mode === "string" ? body.mode : "single";
    const authHeader = req.headers.get("Authorization") ?? "";

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // ---------- BATCH MODE (cron-secret protected) ----------
    if (mode === "queued_batch") {
      if (
        !CRON_SECRET ||
        authHeader !== `Bearer ${CRON_SECRET}`
      ) {
        return json({ error: "Unauthorized (batch)" }, 401);
      }
      const limit = Math.min(
        Math.max(Number.isFinite(body?.limit) ? Number(body.limit) : 10, 1),
        25,
      );

      // Queued Twitch jobs that do NOT already have a snapshot.
      const { data: jobs, error: jobsErr } = await admin
        .from("analysis_jobs")
        .select(
          "id, user_id, status, platform, platform_user_id, platform_login",
        )
        .eq("platform", "twitch")
        .eq("status", "queued")
        .not("platform_user_id", "is", null)
        .order("created_at", { ascending: true })
        .limit(limit * 2);

      if (jobsErr) return json({ error: jobsErr.message }, 500);
      const candidates = (jobs ?? []) as JobRow[];

      // Filter out jobs that already have a snapshot (cheap second pass).
      const ids = candidates.map((j) => j.id);
      const { data: existing } = ids.length
        ? await admin
            .from("stream_score_snapshots")
            .select("analysis_job_id")
            .in("analysis_job_id", ids)
        : { data: [] as Array<{ analysis_job_id: string }> };
      const has = new Set(
        (existing ?? []).map((r) => r.analysis_job_id as string),
      );
      const todo = candidates.filter((j) => !has.has(j.id)).slice(0, limit);

      const results: ProcessResult[] = [];
      for (const job of todo) {
        // In batch mode we have no user JWT. We mint a service-role JWT
        // for the job owner so twitch-live-fetch can resolve their
        // connected account. Service role bypasses Edge JWT verification
        // checks for verify_jwt=false functions, and twitch-live-fetch's
        // own logic resolves the connected_account row via the bearer
        // user. Since we cannot impersonate a user without their token,
        // we instead pass a service-role bearer and rely on
        // twitch-live-fetch reading from connected_accounts by the
        // bearer-resolved user. However, twitch-live-fetch uses
        // auth.getUser() — service role tokens do not resolve to a user.
        // To keep Phase 3 SAFE and avoid duplicating token-decryption
        // here, we SKIP jobs in batch mode that require user-scoped
        // Twitch calls. The cron is therefore implemented but NOT
        // scheduled yet — see route response.
        results.push({
          job_id: job.id,
          status: "error",
          error:
            "batch mode requires user-scoped Twitch token; deferred to Phase 4 (frontend invoked or service-token-aware twitch-live-fetch path)",
        });
      }

      return json({
        ok: true,
        mode: "queued_batch",
        considered: candidates.length,
        eligible: todo.length,
        results,
        note:
          "Batch mode is implemented but cron is NOT scheduled yet. Token decryption + user resolution must be moved into a service-callable Twitch fetch path before enabling /5min cron. Single-job (user-invoked) mode is fully functional.",
      });
    }

    // ---------- SINGLE MODE (user JWT) ----------
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const analysisJobId = typeof body?.analysis_job_id === "string"
      ? body.analysis_job_id
      : null;
    if (!analysisJobId) {
      return json({ error: "analysis_job_id is required" }, 400);
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    // RLS-scoped lookup ⇒ cross-user calls return null ⇒ 404.
    const { data: job, error: jobErr } = await userClient
      .from("analysis_jobs")
      .select(
        "id, user_id, status, platform, platform_user_id, platform_login",
      )
      .eq("id", analysisJobId)
      .maybeSingle();
    if (jobErr) return json({ error: "Job lookup failed" }, 500);
    if (!job) return json({ error: "Job not found or forbidden" }, 404);
    if (job.user_id !== userId) return json({ error: "Forbidden" }, 403);
    if (job.platform !== "twitch" || !job.platform_user_id) {
      return json({ error: "Job is not a connected Twitch job" }, 422);
    }

    const result = await processOneJob({
      admin,
      job: job as JobRow,
      fetchLive: () =>
        fetch(`${SUPABASE_URL}/functions/v1/twitch-live-fetch`, {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
            apikey: SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({}),
        }),
    });

    return json({
      ok: result.status === "persisted" || result.status === "skipped_existing",
      mode: "single",
      job_id: job.id,
      job_status_unchanged: job.status,
      persisted: {
        analysis_reports: false,
        stream_score_snapshots: result.status === "persisted",
        analysis_jobs: false,
      },
      result,
    });
  } catch (err) {
    return json(
      { error: err instanceof Error ? err.message : String(err) },
      500,
    );
  }
});
