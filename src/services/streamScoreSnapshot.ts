// stream_score_snapshots is system-generated and immutable from clients.
// It is upserted automatically by:
//   - The SECURITY DEFINER trigger `upsert_stream_score_snapshot_from_report`
//     that fires on analysis_reports INSERT.
//   - The `process-analysis-job` edge function (service role).
// Client INSERT/UPDATE/DELETE on this table is denied by RLS.
// This module is kept as a no-op shim for backwards compatibility with
// existing call sites (analysisRunner, autoRefreshRunner).

import type { AnalysisReport } from "@/types/analysis";

export interface PersistSnapshotOptions {
  userId: string;
  analysisJobId: string | null;
  report: AnalysisReport;
}

export async function persistStreamScoreSnapshot(
  _opts: PersistSnapshotOptions,
): Promise<void> {
  return;
}
