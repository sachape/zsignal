import { supabase } from "@/integrations/supabase/client";
import type { AnalysisReport } from "@/types/analysis";

export interface SavedReport {
  id: string;
  job_id: string;
  channel_summary: string;
  created_at: string;
  report: AnalysisReport;
}

export interface RecentJob {
  id: string;
  channel_name: string;
  status: string;
  created_at: string;
  completed_at: string | null;
}

export async function getLatestReport(userId: string): Promise<SavedReport | null> {
  const { data, error } = await supabase
    .from("analysis_reports")
    .select("id, analysis_job_id, channel_summary, created_at, report_data")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    job_id: data.analysis_job_id,
    channel_summary: data.channel_summary ?? "",
    created_at: data.created_at,
    report: data.report_data as unknown as AnalysisReport,
  };
}

export async function getReportByJobId(
  jobId: string,
  userId: string
): Promise<SavedReport | null> {
  const { data, error } = await supabase
    .from("analysis_reports")
    .select("id, analysis_job_id, channel_summary, created_at, report_data")
    .eq("analysis_job_id", jobId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    job_id: data.analysis_job_id,
    channel_summary: data.channel_summary ?? "",
    created_at: data.created_at,
    report: data.report_data as unknown as AnalysisReport,
  };
}

export async function getRecentJobs(
  userId: string,
  limit = 5
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
  limit = 5
): Promise<SavedReport[]> {
  const { data, error } = await supabase
    .from("analysis_reports")
    .select("id, analysis_job_id, channel_summary, created_at, report_data")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((d) => ({
    id: d.id,
    job_id: d.analysis_job_id,
    channel_summary: d.channel_summary ?? "",
    created_at: d.created_at,
    report: d.report_data as unknown as AnalysisReport,
  }));
}
