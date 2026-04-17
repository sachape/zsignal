import { supabase } from "@/integrations/supabase/client";
import { assembleReport } from "./reportAssembler";
import { allMockStreamers, nexaGaming } from "@/data/mockStreamers";
import type { AnalysisReport, MockStreamerData } from "@/types/analysis";

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
  onStage?: (stage: JobStage) => void;
}

export interface RunAnalysisResult {
  jobId: string;
  reportId: string;
  report: AnalysisReport;
}

/**
 * Resolves source data for a channel.
 * For now, uses mock streamers. Will be replaced with Twitch ingestion later.
 */
function resolveStreamerData(channel: string): MockStreamerData {
  const key = channel.toLowerCase().replace(/\s+/g, "_");
  return (allMockStreamers as Record<string, MockStreamerData>)[key] || nexaGaming;
}

/**
 * Real analysis pipeline:
 * 1. Insert analysis_jobs (queued -> processing)
 * 2. Load source data (mock for now)
 * 3. Run engines (facts -> score -> recos -> competitors)
 * 4. Persist final report in analysis_reports
 * 5. Mark job completed
 */
export async function runAnalysis({
  channelName,
  userId,
  onStage,
}: RunAnalysisOptions): Promise<RunAnalysisResult> {
  onStage?.("pending");

  // 1. Create job
  const { data: job, error: jobErr } = await supabase
    .from("analysis_jobs")
    .insert({
      user_id: userId,
      channel_name: channelName,
      status: "processing",
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (jobErr || !job) {
    throw new Error(`Impossible de créer la tâche d'analyse: ${jobErr?.message}`);
  }

  try {
    // 2. Load data
    onStage?.("loading_data");
    const data = resolveStreamerData(channelName);
    await sleep(400);

    // 3. Engines (assembleReport runs facts/score/recos/competitors)
    onStage?.("computing_facts");
    await sleep(400);
    onStage?.("scoring");
    await sleep(400);
    onStage?.("matching_competitors");
    await sleep(400);
    onStage?.("generating_recommendations");
    await sleep(300);

    const report = assembleReport(data, job.id);

    // 4. Save report
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

    // 5. Mark job complete
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
