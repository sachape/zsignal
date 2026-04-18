import { supabase } from "@/integrations/supabase/client";
import { assembleReport } from "./reportAssembler";
import { resolveAnalysisDataset } from "./liveReportSource";
import type { AnalysisReport } from "@/types/analysis";

export type JobStage =
  | "pending"
  | "loading_data"
  | "computing_facts"
  | "scoring"
  | "matching_competitors"
  | "generating_recommendations"
  | "saving"
  | "completed"
  | "failed";

export interface RunAnalysisOptions {
  channelName: string;
  userId: string;
  platform?: string | null;
  platformUserId?: string | null;
  platformLogin?: string | null;
  platformDisplayName?: string | null;
  onStage?: (stage: JobStage) => void;
}

export interface RunAnalysisResult {
  jobId: string;
  reportId: string;
  report: AnalysisReport;
}

export async function runAnalysis({
  channelName,
  userId,
  platform,
  platformUserId,
  platformLogin,
  platformDisplayName,
  onStage,
}: RunAnalysisOptions): Promise<RunAnalysisResult> {
  onStage?.("pending");

  const canonicalLogin = (platformLogin ?? channelName).trim().toLowerCase();
  const canonicalDisplayName =
    platformDisplayName?.trim() || platformLogin?.trim() || channelName.trim();

  const { data: job, error: jobErr } = await supabase
    .from("analysis_jobs")
    .insert({
      user_id: userId,
      channel_name: canonicalLogin,
      status: "processing",
      started_at: new Date().toISOString(),
      platform: platform ?? null,
      platform_user_id: platformUserId ?? null,
      platform_login: platformLogin ?? null,
    })
    .select()
    .single();

  if (jobErr || !job) {
    throw new Error(`Impossible de créer la tâche d'analyse: ${jobErr?.message}`);
  }

  try {
    onStage?.("loading_data");
    const data = resolveAnalysisDataset({
      login: canonicalLogin,
      displayName: canonicalDisplayName,
      platformUserId,
    });
    await sleep(400);

    onStage?.("computing_facts");
    await sleep(400);
    onStage?.("scoring");
    await sleep(400);
    onStage?.("matching_competitors");
    await sleep(400);
    onStage?.("generating_recommendations");
    await sleep(300);

    const report = assembleReport(data, job.id, {
      platform: platform ?? null,
      platform_user_id: platformUserId ?? null,
      platform_login: canonicalLogin,
      display_name: canonicalDisplayName,
      avatar_url: data.profile.profile_image_url || null,
      is_demo: !platformUserId,
    });

    onStage?.("saving");
    const { data: saved, error: repErr } = await supabase
      .from("analysis_reports")
      .insert({
        analysis_job_id: job.id,
        user_id: userId,
        channel_summary: `${report.channel_summary.display_name} · ${report.channel_summary.category} · Score ${report.score.overall}`,
        report_data: report as never,
      })
      .select()
      .single();

    if (repErr || !saved) {
      throw new Error(`Échec de sauvegarde du rapport: ${repErr?.message}`);
    }

    await supabase
      .from("analysis_jobs")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", job.id);

    onStage?.("completed");

    return { jobId: job.id, reportId: saved.id, report };
  } catch (err) {
    await supabase
      .from("analysis_jobs")
      .update({ status: "failed", completed_at: new Date().toISOString() })
      .eq("id", job.id);
    onStage?.("failed");
    throw err;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
