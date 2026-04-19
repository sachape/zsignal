/**
 * Resolves the benchmark seed (category + language + source) used to drive
 * candidate discovery for the Competitors page.
 *
 * TRUSTWORTHINESS RULES:
 * - Generic "Just Chatting" fallback is NOT a trustworthy personal seed.
 *   It only triggers `selected_niche` mode when the user explicitly chose it.
 * - If no trustworthy seed exists, returns `null` so the page can switch
 *   into "niche exploration" mode instead of faking direct competitors.
 *
 * Priority order (first match wins):
 *   1. Connected account current LIVE category
 *   2. Connected account dominant category from recent clips/VODs
 *   3. Latest report's stored channel_summary.category
 *   4. User-selected preferred niche (explicit choice)
 *   5. Most-frequent category among recently opened benchmark profiles
 *   6. First entry in the benchmark watchlist with a known category
 *   → otherwise null (caller switches to exploration mode)
 */

import type { SavedReport } from "@/services/reportRepository";
import type { LiveTwitchProfileResult } from "@/services/twitchLiveProfile";
import {
  getDominantOpenedCategory,
  getRecentlyOpenedProfiles,
} from "@/services/recentlyOpenedProfiles";
import { getWatchlist } from "@/services/benchmarkWatchlist";
import { getPreferredNiche } from "@/services/preferredNiche";

export type BenchmarkSeedSource =
  | "live_stream"
  | "recent_clips"
  | "report_summary"
  | "selected_niche"
  | "recent_profile"
  | "watchlist";

/** Trust level granted by the seed source. */
export type SeedTrust = "strong" | "medium" | "weak";

export interface BenchmarkSeed {
  category: string;
  language: string;
  source: BenchmarkSeedSource;
  trust: SeedTrust;
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
}

const DEFAULT_LANGUAGE = "fr";

export function resolveBenchmarkSeed(
  input: ResolveSeedInput,
): BenchmarkSeed | null {
  const language = input.defaultLanguage ?? DEFAULT_LANGUAGE;

  // 1. Live stream category — strongest possible signal
  const liveCat = input.livePreview?.live?.game_name?.trim();
  if (liveCat) {
    return {
      category: liveCat,
      language,
      source: "live_stream",
      trust: "strong",
      note: "Catégorie du stream en cours",
    };
  }

  // 2. Dominant category from recent clips/VODs — still strong
  const dominant = input.livePreview?.dominant_category?.trim();
  if (dominant) {
    return {
      category: dominant,
      language,
      source: "recent_clips",
      trust: "strong",
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
      trust: "medium",
      note: "Catégorie du dernier rapport",
    };
  }

  // 4. User-explicit preferred niche — trustworthy because intentional
  const preferred = getPreferredNiche(input.userId);
  if (preferred?.category) {
    return {
      category: preferred.category,
      language: preferred.language || language,
      source: "selected_niche",
      trust: "medium",
      note: "Niche choisie manuellement par l'utilisateur",
    };
  }

  // 5. Recently opened benchmark profiles — weak (exploratory)
  const opened = getDominantOpenedCategory(input.userId);
  if (opened) {
    return {
      category: opened.category,
      language,
      source: "recent_profile",
      trust: "weak",
      note: `Inspiré d'un profil récemment ouvert (@${opened.sample_login})`,
      sample_login: opened.sample_login,
    };
  }

  // 6. Watchlist — weak
  const watchlist = getWatchlist(input.userId);
  const wlCat = watchlist.find((w) => w.category && w.category.trim());
  if (wlCat?.category) {
    return {
      category: wlCat.category,
      language,
      source: "watchlist",
      trust: "weak",
      note: `Inspiré de la watchlist (@${wlCat.login})`,
      sample_login: wlCat.login,
    };
  }

  // No trustworthy seed → caller switches to exploration mode
  return null;
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
