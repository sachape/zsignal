import type { AnalysisReport } from "@/types/analysis";

const REPORT_PREFIX = "streampulse_teaser_report_";
const PENDING_KEY = "streampulse_pending_teaser_channel";

export interface TeaserRecord {
  id: string;
  channel: string;
  createdAt: string;
  report: AnalysisReport;
}

/**
 * Lightweight sessionStorage-based store for teaser (anonymous) analyses.
 * Kept fully separate from authenticated `analysis_reports` persistence.
 */
export const teaserStore = {
  save(channel: string, report: AnalysisReport): TeaserRecord {
    const id = `teaser-${channel}-${Date.now()}`;
    const record: TeaserRecord = {
      id,
      channel,
      createdAt: new Date().toISOString(),
      report,
    };
    try {
      sessionStorage.setItem(REPORT_PREFIX + id, JSON.stringify(record));
    } catch {
      /* ignore quota errors — teaser is best-effort */
    }
    return record;
  },

  get(id: string): TeaserRecord | null {
    try {
      const raw = sessionStorage.getItem(REPORT_PREFIX + id);
      if (!raw) return null;
      return JSON.parse(raw) as TeaserRecord;
    } catch {
      return null;
    }
  },

  clear(id: string) {
    try {
      sessionStorage.removeItem(REPORT_PREFIX + id);
    } catch {
      /* noop */
    }
  },

  setPendingChannel(channel: string) {
    try {
      sessionStorage.setItem(PENDING_KEY, channel);
    } catch {
      /* noop */
    }
  },

  getPendingChannel(): string | null {
    try {
      return sessionStorage.getItem(PENDING_KEY);
    } catch {
      return null;
    }
  },

  clearPendingChannel() {
    try {
      sessionStorage.removeItem(PENDING_KEY);
    } catch {
      /* noop */
    }
  },
};
