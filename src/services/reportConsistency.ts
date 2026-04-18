import type { AnalysisReport } from "@/types/analysis";
import type { SavedReport } from "@/services/reportRepository";

export interface ReportConsistencyResult {
  isConsistent: boolean;
  reason: "ok" | "metadata_payload_identity_mismatch" | "missing_report_payload";
}

export function validateReportConsistency(
  saved: Pick<SavedReport, "platform_user_id" | "platform_login" | "is_demo"> | null,
  report: AnalysisReport | null,
): ReportConsistencyResult {
  if (!saved || !report) {
    return { isConsistent: false, reason: "missing_report_payload" };
  }

  if (saved.is_demo || !saved.platform_login) {
    return { isConsistent: true, reason: "ok" };
  }

  const payloadLogin = report.channel_summary.channel_name?.trim().toLowerCase();
  const metadataLogin = saved.platform_login.trim().toLowerCase();

  if (!payloadLogin || payloadLogin !== metadataLogin) {
    return { isConsistent: false, reason: "metadata_payload_identity_mismatch" };
  }

  return { isConsistent: true, reason: "ok" };
}
