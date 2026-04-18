import type { SyncState } from "@/components/SyncStatusCard";
import { supabase } from "@/integrations/supabase/client";

export interface SyncSnapshot {
  state: SyncState;
  lastJobId: string | null;
  lastJobStatus: string | null;
  lastJobCreatedAt: string | null;
  lastJobCompletedAt: string | null;
  lastJobError: string | null;
  hasReport: boolean;
  reportCreatedAt: string | null;
  /** True when followers couldn't be retrieved on the last successful run. */
  partialFollowers?: boolean;
}

export interface ResolveSyncOptions {
  /** Pass when the latest report's payload has known integrity caveats. */
  followersAvailable?: boolean | null;
  hasAnyVideos?: boolean | null;
}

/**
 * Resolve the current sync state for a connected Twitch account from real
 * backend data — latest analysis_jobs row + latest matching analysis_report.
 *
 * Adds `partial_refresh` when the most recent successful report is live but
 * is missing essential signals (followers unavailable AND no recent VODs),
 * so the user understands why some KPIs read "—".
 */
export async function resolveSyncSnapshot(
  userId: string,
  platformUserId: string,
  reportCreatedAt: string | null,
  opts: ResolveSyncOptions = {},
): Promise<SyncSnapshot> {
  const { data: job } = await supabase
    .from("analysis_jobs")
    .select("id, status, created_at, completed_at, last_error")
    .eq("user_id", userId)
    .eq("platform", "twitch")
    .eq("platform_user_id", platformUserId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const hasReport = !!reportCreatedAt;
  const status = job?.status ?? null;
  const followersAvailable = opts.followersAvailable !== false;
  const hasAnyVideos = opts.hasAnyVideos !== false;
  const partialFollowers = hasReport && opts.followersAvailable === false;

  let state: SyncState = "synchronized";

  if (!hasReport && !job) {
    state = "no_analysis";
  } else if (!hasReport && (status === "queued" || status === "processing")) {
    state = "first_analysis_in_progress";
  } else if (hasReport && (status === "queued" || status === "processing")) {
    state = "update_in_progress";
  } else if (hasReport && status === "failed") {
    state = "refresh_failed";
  } else if (hasReport && (!followersAvailable || !hasAnyVideos)) {
    state = "partial_refresh";
  } else if (hasReport) {
    state = "synchronized";
  } else if (status === "failed") {
    state = "refresh_failed";
  }

  return {
    state,
    lastJobId: job?.id ?? null,
    lastJobStatus: status,
    lastJobCreatedAt: job?.created_at ?? null,
    lastJobCompletedAt: job?.completed_at ?? null,
    lastJobError: job?.last_error ?? null,
    hasReport,
    reportCreatedAt,
    partialFollowers,
  };
}
