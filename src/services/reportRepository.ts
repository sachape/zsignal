import { supabase } from "@/integrations/supabase/client";
import { getHistoryCutoffISO } from "@/services/historyAccess";
import type { AnalysisReport } from "@/types/analysis";

export interface SavedReport {
  id: string;
  job_id: string;
  channel_summary: string;
  created_at: string;
  report: AnalysisReport;
  platform: string | null;
  platform_user_id: string | null;
  platform_login: string | null;
  /** True when the underlying job has no platform identity (legacy/demo/mock). */
  is_demo: boolean;
}

export interface RecentJob {
  id: string;
  channel_name: string;
  status: string;
  created_at: string;
  completed_at: string | null;
}

type JoinedRow = {
  id: string;
  analysis_job_id: string;
  channel_summary: string | null;
  created_at: string;
  report_data: unknown;
  analysis_jobs: {
    platform: string | null;
    platform_user_id: string | null;
    platform_login: string | null;
  } | null;
};

const SELECT_WITH_JOB =
  "id, analysis_job_id, channel_summary, created_at, report_data, analysis_jobs!inner(platform, platform_user_id, platform_login)";

function map(row: JoinedRow): SavedReport {
  const job = row.analysis_jobs;
  const platform = job?.platform ?? null;
  const platform_user_id = job?.platform_user_id ?? null;
  const platform_login = job?.platform_login ?? null;
  return {
    id: row.id,
    job_id: row.analysis_job_id,
    channel_summary: row.channel_summary ?? "",
    created_at: row.created_at,
    report: row.report_data as unknown as AnalysisReport,
    platform,
    platform_user_id,
    platform_login,
    is_demo: !platform_user_id,
  };
}

export async function getLatestReport(userId: string): Promise<SavedReport | null> {
  const { data, error } = await supabase
    .from("analysis_reports")
    .select(SELECT_WITH_JOB)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return map(data as unknown as JoinedRow);
}

/**
 * Returns the latest report whose underlying job is linked to the given Twitch
 * platform_user_id. Used to source-of-truth the dashboard for the currently
 * connected Twitch account.
 */
export async function getLatestReportForPlatformUser(
  userId: string,
  platformUserId: string,
): Promise<SavedReport | null> {
  const { data: jobs, error: jobErr } = await supabase
    .from("analysis_jobs")
    .select("id")
    .eq("user_id", userId)
    .eq("platform", "twitch")
    .eq("platform_user_id", platformUserId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (jobErr || !jobs || jobs.length === 0) return null;

  const { data, error } = await supabase
    .from("analysis_reports")
    .select(SELECT_WITH_JOB)
    .eq("user_id", userId)
    .eq("analysis_job_id", jobs[0].id)
    .maybeSingle();

  if (error || !data) return null;
  return map(data as unknown as JoinedRow);
}

export async function getReportById(
  reportId: string,
  userId: string,
): Promise<SavedReport | null> {
  const { data, error } = await supabase
    .from("analysis_reports")
    .select(SELECT_WITH_JOB)
    .eq("id", reportId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return map(data as unknown as JoinedRow);
}

export async function getReportByJobId(
  jobId: string,
  userId: string,
): Promise<SavedReport | null> {
  const { data, error } = await supabase
    .from("analysis_reports")
    .select(SELECT_WITH_JOB)
    .eq("analysis_job_id", jobId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return map(data as unknown as JoinedRow);
}

export async function getRecentJobs(
  userId: string,
  limit = 5,
): Promise<RecentJob[]> {
  const { data, error } = await supabase
    .from("analysis_jobs")
    .select("id, channel_name, status, created_at, completed_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data as RecentJob[];
}

export async function getRecentReports(
  userId: string,
  limit = 5,
): Promise<SavedReport[]> {
  const cutoff = await getHistoryCutoffISO(userId);
  let q = supabase
    .from("analysis_reports")
    .select(SELECT_WITH_JOB)
    .eq("user_id", userId);
  if (cutoff) q = q.gte("created_at", cutoff);
  const { data, error } = await q
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as unknown as JoinedRow[]).map(map);
}

export async function getRecentReportsForPlatformUser(
  userId: string,
  platformUserId: string,
  limit = 30,
): Promise<SavedReport[]> {
  const { data: jobs } = await supabase
    .from("analysis_jobs")
    .select("id")
    .eq("user_id", userId)
    .eq("platform", "twitch")
    .eq("platform_user_id", platformUserId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!jobs || jobs.length === 0) return [];

  const cutoff = await getHistoryCutoffISO(userId);
  let q = supabase
    .from("analysis_reports")
    .select(SELECT_WITH_JOB)
    .eq("user_id", userId)
    .in("analysis_job_id", jobs.map((j) => j.id as string));
  if (cutoff) q = q.gte("created_at", cutoff);
  const { data, error } = await q
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return (data as unknown as JoinedRow[]).map(map);
}
