/**
 * Resolves the benchmark seed (category + language + source) used to drive
 * candidate discovery for the Competitors page.
 *
 * Priority order (first non-empty wins):
 *   1. Connected account current LIVE category (most authoritative)
 *   2. Connected account dominant category from recent clips/VODs
 *   3. Latest report's stored channel_summary.category
 *   4. Most-frequent category among recently opened benchmark profiles
 *   5. First entry in the benchmark watchlist with a known category
 *   6. Manual fallback (e.g. "Just Chatting") so the page is never empty
 */

import type { SavedReport } from "@/services/reportRepository";
import type { LiveTwitchProfileResult } from "@/services/twitchLiveProfile";
import {
  getDominantOpenedCategory,
  getRecentlyOpenedProfiles,
} from "@/services/recentlyOpenedProfiles";
import { getWatchlist } from "@/services/benchmarkWatchlist";

export type BenchmarkSeedSource =
  | "live_stream"
  | "recent_clips"
  | "report_summary"
  | "recent_profile"
  | "watchlist"
  | "manual_fallback";

export interface BenchmarkSeed {
  category: string;
  language: string;
  source: BenchmarkSeedSource;
  /** Free-form note for the dev debug block. */
  note: string;
  /** Optional sample login that justifies this seed (e.g. opened profile). */
  sample_login?: string | null;
}

export interface ResolveSeedInput {
  userId: string | null | undefined;
  /** Pre-fetched live snapshot of the connected account (may be empty). */
  livePreview: Pick<
    LiveTwitchProfileResult,
    "live" | "dominant_category"
  > | null;
  /** Latest persisted report for the connected account, if any. */
  report: SavedReport | null;
  /** Default UI language ("fr" for our French-first product). */
  defaultLanguage?: string;
  /** Manual fallback category when nothing else works. */
  manualFallbackCategory?: string;
}

const DEFAULT_LANGUAGE = "fr";
const DEFAULT_MANUAL_FALLBACK = "Just Chatting";

export function resolveBenchmarkSeed(input: ResolveSeedInput): BenchmarkSeed {
  const language = input.defaultLanguage ?? DEFAULT_LANGUAGE;
  const fallbackCategory =
    input.manualFallbackCategory ?? DEFAULT_MANUAL_FALLBACK;

  // 1. Live stream category — most authoritative
  const liveCat = input.livePreview?.live?.game_name?.trim();
  if (liveCat) {
    return {
      category: liveCat,
      language,
      source: "live_stream",
      note: "Catégorie du stream en cours",
    };
  }

  // 2. Dominant category from recent clips/VODs
  const dominant = input.livePreview?.dominant_category?.trim();
  if (dominant) {
    return {
      category: dominant,
      language,
      source: "recent_clips",
      note: "Catégorie dominante (clips/VODs récents)",
    };
  }

  // 3. Stored report channel_summary
  const reportCat = input.report?.report.channel_summary.category?.trim();
  if (reportCat) {
    return {
      category: reportCat,
      language,
      source: "report_summary",
      note: "Catégorie du dernier rapport",
    };
  }

  // 4. Recently opened benchmark profiles
  const opened = getDominantOpenedCategory(input.userId);
  if (opened) {
    return {
      category: opened.category,
      language,
      source: "recent_profile",
      note: `Inspiré d'un profil récemment ouvert (@${opened.sample_login})`,
      sample_login: opened.sample_login,
    };
  }

  // 5. Watchlist
  const watchlist = getWatchlist(input.userId);
  const wlCat = watchlist.find((w) => w.category && w.category.trim());
  if (wlCat?.category) {
    return {
      category: wlCat.category,
      language,
      source: "watchlist",
      note: `Inspiré de la watchlist (@${wlCat.login})`,
      sample_login: wlCat.login,
    };
  }

  // 6. Manual fallback — page must never be empty
  return {
    category: fallbackCategory,
    language,
    source: "manual_fallback",
    note: "Aucune source personnelle — fallback générique",
  };
}

/**
 * Returns up to N most-recent profile logins (lowercased) for additional
 * context surfaces (e.g. "recently opened" callout).
 */
export function getRecentProfileLogins(
  userId: string | null | undefined,
  limit = 5,
): string[] {
  return getRecentlyOpenedProfiles(userId)
    .slice(0, limit)
    .map((e) => e.login.toLowerCase());
}
