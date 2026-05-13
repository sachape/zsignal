// Shared helper to enqueue an analysis_jobs row for a connected Twitch
// account. Centralizes the dedupe + throttle policy used by:
//   - stream.offline EventSub processor          (auto_scheduled, 6h throttle)
//   - first-time Twitch OAuth connect            (auto_first, no throttle)
//   - weekly cron refresh                        (auto_weekly, 7d throttle)
//   - manual user "Actualiser" fallback          (manual, no throttle)
//
// Edge functions only ENQUEUE. The frontend autoRefreshRunner consumes
// queued jobs and runs the analysis pipeline — this helper never executes
// the pipeline and never touches Twitch tokens or raw payloads.

// deno-lint-ignore-file no-explicit-any
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type TriggerSource =
  | "manual"
  | "auto_first"
  | "auto_scheduled"
  | "auto_weekly";

export interface EnqueueAccountInput {
  user_id: string;
  platform_user_id: string | null;
  platform_login: string | null;
  platform_display_name?: string | null;
}

export interface EnqueueOptions {
  /** Skip enqueue if a completed analysis exists newer than this many hours. */
  throttleHours?: number;
  /** Skip enqueue if last_auto_refresh_at is newer than this many hours. */
  lastAutoRefreshThrottleHours?: number;
  /** When true, bumps connected_accounts.last_auto_refresh_at on success. */
  bumpLastAutoRefresh?: boolean;
  /** When true, refuse to create a 2nd job of the same trigger_source for this account. */
  uniquePerTriggerSource?: boolean;
}

export interface EnqueueResult {
  enqueued: boolean;
  job_id?: string;
  reason?:
    | "missing_identity"
    | "duplicate_active_job"
    | "duplicate_trigger_source"
    | "throttled_recent_completion"
    | "throttled_recent_auto_refresh"
    | "insert_failed";
  error?: string;
}

const ACTIVE_STATUSES = ["queued", "processing"] as const;

export async function enqueueAnalysisJobForConnectedAccount(
  admin: SupabaseClient,
  account: EnqueueAccountInput,
  triggerSource: TriggerSource,
  opts: EnqueueOptions = {},
): Promise<EnqueueResult> {
  if (!account.platform_user_id || !account.platform_login || !account.user_id) {
    return { enqueued: false, reason: "missing_identity" };
  }

  // 1) Dedupe: any active (queued/processing) job for this account?
  const { data: pending } = await admin
    .from("analysis_jobs")
    .select("id, status, trigger_source")
    .eq("user_id", account.user_id)
    .eq("platform", "twitch")
    .eq("platform_user_id", account.platform_user_id)
    .in("status", ACTIVE_STATUSES as unknown as string[])
    .limit(1)
    .maybeSingle();
  if (pending) {
    return { enqueued: false, reason: "duplicate_active_job", job_id: pending.id };
  }

  // 2) Optional: prevent a 2nd job of the same trigger_source ever
  //    (used by auto_first to make the first-connection enqueue truly one-shot).
  if (opts.uniquePerTriggerSource) {
    const { data: existing } = await admin
      .from("analysis_jobs")
      .select("id")
      .eq("user_id", account.user_id)
      .eq("platform", "twitch")
      .eq("platform_user_id", account.platform_user_id)
      .eq("trigger_source", triggerSource)
      .limit(1)
      .maybeSingle();
    if (existing) {
      return { enqueued: false, reason: "duplicate_trigger_source", job_id: existing.id };
    }
  }

  // 3) Throttle on most recent completed analysis.
  if (opts.throttleHours && opts.throttleHours > 0) {
    const cutoff = new Date(Date.now() - opts.throttleHours * 3600 * 1000).toISOString();
    const { data: recent } = await admin
      .from("analysis_jobs")
      .select("id, completed_at")
      .eq("user_id", account.user_id)
      .eq("platform", "twitch")
      .eq("platform_user_id", account.platform_user_id)
      .eq("status", "completed")
      .gt("completed_at", cutoff)
      .limit(1)
      .maybeSingle();
    if (recent) return { enqueued: false, reason: "throttled_recent_completion" };
  }

  // 4) Throttle on connected_accounts.last_auto_refresh_at.
  if (opts.lastAutoRefreshThrottleHours && opts.lastAutoRefreshThrottleHours > 0) {
    const cutoff = new Date(
      Date.now() - opts.lastAutoRefreshThrottleHours * 3600 * 1000,
    ).toISOString();
    const { data: ca } = await admin
      .from("connected_accounts")
      .select("last_auto_refresh_at")
      .eq("user_id", account.user_id)
      .eq("platform", "twitch")
      .maybeSingle();
    if (ca?.last_auto_refresh_at && ca.last_auto_refresh_at > cutoff) {
      return { enqueued: false, reason: "throttled_recent_auto_refresh" };
    }
  }

  // 5) Insert queued job.
  const { data: job, error } = await admin
    .from("analysis_jobs")
    .insert({
      user_id: account.user_id,
      channel_name: account.platform_login,
      status: "queued",
      platform: "twitch",
      platform_user_id: account.platform_user_id,
      platform_login: account.platform_login,
      trigger_source: triggerSource,
    })
    .select("id")
    .single();

  if (error || !job) {
    return { enqueued: false, reason: "insert_failed", error: error?.message };
  }

  if (opts.bumpLastAutoRefresh && triggerSource !== "manual") {
    await admin
      .from("connected_accounts")
      .update({ last_auto_refresh_at: new Date().toISOString() })
      .eq("user_id", account.user_id)
      .eq("platform", "twitch");
  }

  return { enqueued: true, job_id: job.id };
}
