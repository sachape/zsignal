// autoRefreshRunner — Phase 4: thin frontend wrapper.
//
// The full report (facts, score, recommendations, blocking point) is now
// assembled and persisted server-side by the `process-analysis-job` edge
// function. The frontend MUST NOT compute or write analysis_reports.
//
// Responsibilities kept:
//   - find a queued job for the current account
//   - delegate processing to the edge function (single mode, user JWT)
//   - enqueue a new job via twitch-refresh-enqueue
//
// Responsibilities removed (deprecated, do not re-add here):
//   - assembleReport
//   - competitor matching
//   - analysis_reports INSERT
//   - stream_score_snapshots INSERT (the edge function + trigger handle it)

import { supabase } from "@/integrations/supabase/client";

export interface ProcessQueuedJobOptions {
  jobId: string;
  /** Kept for signature compatibility; unused now (edge function uses user JWT). */
  userId?: string;
  platformUserId?: string;
  platformLogin?: string;
  platformDisplayName?: string | null;
}

export interface ProcessQueuedJobResult {
  ok: boolean;
  reportId?: string;
  error?: string;
}

/**
 * Delegate processing of a queued analysis job to the server-side edge
 * function. The edge function (single mode) verifies the user JWT, fetches
 * Twitch facts, computes the score, writes analysis_reports +
 * stream_score_snapshots, and marks the job completed.
 */
export async function processQueuedJob(
  opts: ProcessQueuedJobOptions,
): Promise<ProcessQueuedJobResult> {
  const { data, error } = await supabase.functions.invoke("process-analysis-job", {
    body: { analysis_job_id: opts.jobId },
  });
  if (error) return { ok: false, error: error.message };
  const result = data as {
    ok?: boolean;
    result?: { report_id?: string; status?: string; error?: string };
    error?: string;
  };
  if (!result?.ok) {
    return { ok: false, error: result?.error ?? result?.result?.error ?? "process_failed" };
  }
  return { ok: true, reportId: result?.result?.report_id };
}

/**
 * Find a pending queued job for this connected account and process it via
 * the server-side edge function. Returns null when there is nothing to do.
 */
export async function processPendingForAccount(
  userId: string,
  platformUserId: string,
  platformLogin: string,
  platformDisplayName: string | null,
): Promise<ProcessQueuedJobResult | null> {
  const { data: job } = await supabase
    .from("analysis_jobs")
    .select("id, status")
    .eq("user_id", userId)
    .eq("platform", "twitch")
    .eq("platform_user_id", platformUserId)
    .eq("status", "queued")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!job) return null;

  return processQueuedJob({
    jobId: job.id,
    userId,
    platformUserId,
    platformLogin,
    platformDisplayName,
  });
}

/**
 * Ask the backend to enqueue a refresh job for the current user's
 * connected Twitch account. Server-side function performs auth + insert.
 */
export async function enqueueRefreshForSelf(
  triggerSource: "manual" | "auto_first" = "manual",
): Promise<{ ok: boolean; jobId?: string; error?: string }> {
  const { data, error } = await supabase.functions.invoke("twitch-refresh-enqueue", {
    body: { mode: "self", trigger_source: triggerSource },
  });
  if (error) return { ok: false, error: error.message };
  const result = data as { success?: boolean; job_id?: string; error?: string };
  if (!result?.success) return { ok: false, error: result?.error };
  return { ok: true, jobId: result.job_id };
}

/**
 * Convenience: enqueue + immediately process. Used by the Dashboard
 * "Relancer l'analyse" button so the result is available without waiting
 * for the next cron tick.
 */
export async function enqueueAndProcessForSelf(
  triggerSource: "manual" | "auto_first" = "manual",
): Promise<ProcessQueuedJobResult> {
  const enq = await enqueueRefreshForSelf(triggerSource);
  if (!enq.ok || !enq.jobId) {
    return { ok: false, error: enq.error ?? "enqueue_failed" };
  }
  return processQueuedJob({ jobId: enq.jobId });
}
