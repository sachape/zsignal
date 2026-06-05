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
import { assembleServerReport } from "../_shared/reportAssembler.ts";

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
  report_id?: string;
  overall?: number;
  error?: string;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;


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
 * Compute + persist a snapshot for ONE job given already-fetched Twitch
 * facts. Idempotent: returns skipped_existing if a snapshot row is present
 * for the analysis_job_id (server- or trigger-origin).
 */
async function markJobScoreStatus(
  admin: ReturnType<typeof createClient>,
  jobId: string,
  fields: {
    score_status: "computed" | "failed";
    score_error_message?: string | null;
  },
) {
  const patch: Record<string, unknown> = {
    score_status: fields.score_status,
    score_processed_by: "server",
    updated_at: new Date().toISOString(),
  };
  if (fields.score_status === "computed") {
    patch.score_computed_at = new Date().toISOString();
    patch.score_error_message = null;
  }
  if (fields.score_status === "failed") {
    patch.score_error_message = (fields.score_error_message ?? "unknown").slice(0, 200);
  }
  await admin.from("analysis_jobs").update(patch).eq("id", jobId);
}

/**
 * Compute + persist a snapshot for ONE job given already-fetched Twitch
 * facts. Idempotent: returns skipped_existing if a snapshot row is present
 * for the analysis_job_id (server- or trigger-origin).
 */
async function processOneJob(args: {
  admin: ReturnType<typeof createClient>;
  job: JobRow;
  facts: ServerTwitchFacts;
}): Promise<ProcessResult> {
  const { admin, job, facts } = args;

  const { data: existing } = await admin
    .from("stream_score_snapshots")
    .select("id")
    .eq("analysis_job_id", job.id)
    .maybeSingle();
  if (existing?.id) {
    await markJobScoreStatus(admin, job.id, { score_status: "computed" });
    return {
      job_id: job.id,
      status: "skipped_existing",
      snapshot_id: existing.id,
    };
  }

  const channelFacts = extractChannelFacts(
    {
      follower_count: facts.follower_count,
      followers_available: facts.followers_available,
    },
    facts.videos,
    facts.clips,
    facts.live_sessions,
  );
  const normalized: SharedChannelFact[] = normalizeChannelFacts(channelFacts);
  if (normalized.length === 0) {
    await markJobScoreStatus(admin, job.id, {
      score_status: "failed",
      score_error_message: "no_facts_available",
    });
    return { job_id: job.id, status: "skipped_no_facts" };
  }

  const score = computeStreamScore(normalized);
  const row = buildSnapshotRow({
    userId: job.user_id,
    analysisJobId: job.id,
    score,
  });

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
      await markJobScoreStatus(admin, job.id, { score_status: "computed" });
      return {
        job_id: job.id,
        status: "skipped_existing",
        snapshot_id: again?.id,
        overall: row.overall,
      };
    }
    await markJobScoreStatus(admin, job.id, {
      score_status: "failed",
      score_error_message: `insert_failed:${insertErr.code ?? "db"}`,
    });
    return { job_id: job.id, status: "error", error: insertErr.message };
  }

  await markJobScoreStatus(admin, job.id, { score_status: "computed" });
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

    // ---------- ADMIN AUTH (vault eventsub_cron_secret OR env CRON_SECRET) ----------
    const adminToken = authHeader.replace(/^Bearer\s+/i, "");
    const cronEnv = Deno.env.get("CRON_SECRET") ?? "";
    async function isAdminAuthed(): Promise<boolean> {
      if (cronEnv && adminToken && adminToken === cronEnv) return true;
      const { data: ok } = await admin.rpc("verify_eventsub_cron_secret", { token: adminToken });
      return ok === true;
    }

    // ---------- SINGLE_ADMIN MODE (server-side trigger for one job) ----------
    if (mode === "single_admin") {
      if (!(await isAdminAuthed())) {
        return json({ error: "Unauthorized (single_admin)" }, 401);
      }
      const analysisJobId = typeof body?.analysis_job_id === "string" ? body.analysis_job_id : null;
      if (!analysisJobId) return json({ error: "analysis_job_id required" }, 400);

      const { data: job, error: jobErr } = await admin
        .from("analysis_jobs")
        .select("id, user_id, status, platform, platform_user_id, platform_login")
        .eq("id", analysisJobId)
        .maybeSingle();
      if (jobErr || !job) return json({ error: "Job not found" }, 404);
      if (job.platform !== "twitch" || !job.platform_user_id) {
        return json({ error: "Job is not a connected Twitch job" }, 422);
      }

      const fetched = await fetchTwitchFactsForAccount({
        user_id: job.user_id,
        platform_user_id: job.platform_user_id,
        admin,
      });
      if (!fetched.ok || !fetched.facts) {
        return json({ error: `twitch_facts_failed:${fetched.error ?? "unknown"}` }, 502);
      }
      const result = await processOneJob({ admin, job: job as JobRow, facts: fetched.facts });
      return json({ ok: result.status === "persisted" || result.status === "skipped_existing", mode: "single_admin", result });
    }

    // ---------- BATCH MODE ----------
    if (mode === "queued_batch") {
      if (!(await isAdminAuthed())) {
        return json({ error: "Unauthorized (batch)" }, 401);
      }
      const limit = Math.min(
        Math.max(Number.isFinite(body?.limit) ? Number(body.limit) : 10, 1),
        25,
      );

      const { data: jobs, error: jobsErr } = await admin
        .from("analysis_jobs")
        .select(
          "id, user_id, status, platform, platform_user_id, platform_login, score_status",
        )
        .eq("platform", "twitch")
        .eq("status", "queued")
        .not("platform_user_id", "is", null)
        .or("score_status.is.null,score_status.eq.pending")
        .order("created_at", { ascending: true })
        .limit(limit * 2);

      if (jobsErr) return json({ error: jobsErr.message }, 500);
      const candidates = (jobs ?? []) as Array<JobRow & { score_status: string | null }>;

      const ids = candidates.map((j) => j.id);
      const { data: existingSnaps } = ids.length
        ? await admin
            .from("stream_score_snapshots")
            .select("analysis_job_id")
            .in("analysis_job_id", ids)
        : { data: [] as Array<{ analysis_job_id: string }> };
      const has = new Set(
        (existingSnaps ?? []).map((r) => r.analysis_job_id as string),
      );

      // Pre-mark jobs that already have a snapshot but no score_status set
      // (legacy/frontend-only snapshots) so future cron ticks skip them.
      for (const j of candidates) {
        if (has.has(j.id) && j.score_status !== "computed") {
          await markJobScoreStatus(admin, j.id, { score_status: "computed" });
        }
      }

      const todo = candidates.filter((j) => !has.has(j.id)).slice(0, limit);

      const summary = {
        scanned: candidates.length,
        processed: 0,
        skipped_existing_snapshot: candidates.length - todo.length,
        skipped_missing_account: 0,
        skipped_no_facts: 0,
        failed: 0,
      };
      const results: ProcessResult[] = [];

      for (const job of todo) {
        const fetched = await fetchTwitchFactsForAccount({
          user_id: job.user_id,
          platform_user_id: job.platform_user_id!,
          admin,
        });
        if (!fetched.ok || !fetched.facts) {
          const reason = fetched.error ?? "fetch_failed";
          // Mark score_status=failed so the next cron tick does NOT retry
          // forever (missing_account, token issues, etc.). Stored message
          // is sanitized — no token material is ever passed back here.
          await markJobScoreStatus(admin, job.id, {
            score_status: "failed",
            score_error_message: reason,
          });
          if (reason === "missing_account") {
            summary.skipped_missing_account++;
          } else {
            summary.failed++;
          }
          results.push({ job_id: job.id, status: "error", error: reason });
          continue;
        }
        const r = await processOneJob({ admin, job, facts: fetched.facts });
        results.push(r);
        if (r.status === "persisted") summary.processed++;
        else if (r.status === "skipped_existing") summary.skipped_existing_snapshot++;
        else if (r.status === "skipped_no_facts") summary.skipped_no_facts++;
        else summary.failed++;
      }

      return json({
        ok: true,
        mode: "queued_batch",
        ...summary,
        results,
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

    const fetched = await fetchTwitchFactsForAccount({
      user_id: job.user_id,
      platform_user_id: job.platform_user_id,
      admin,
    });
    if (!fetched.ok || !fetched.facts) {
      return json(
        { error: `twitch_facts_failed:${fetched.error ?? "unknown"}` },
        502,
      );
    }

    const result = await processOneJob({
      admin,
      job: job as JobRow,
      facts: fetched.facts,
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
    console.error("[process-analysis-job] error", err);
    return json({ error: "Internal server error" }, 500);
  }
});
