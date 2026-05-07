import type { WatchlistEntry } from "@/services/benchmarkWatchlist";
import { getSnapshots } from "@/services/competitorSnapshots";
import type { CompetitorSnapshot } from "@/services/competitorSnapshots";

export type AlertType =
  | "viewers_surge"
  | "viewers_drop"
  | "score_up"
  | "score_down"
  | "clips_spike";

export interface CompetitorAlert {
  login: string;
  display_name: string;
  avatar_url: string | null;
  type: AlertType;
  pct: number;
  delta: number;
  date: string;
}

const DISMISS_KEY_PREFIX = "streampulse:alerts:dismissed:";

function dismissKey(userId: string | null | undefined): string {
  return `${DISMISS_KEY_PREFIX}${userId ?? "anon"}`;
}

export function dismissAlerts(userId: string | null | undefined): void {
  const until = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
  try {
    localStorage.setItem(dismissKey(userId), until);
    window.dispatchEvent(new CustomEvent("streampulse:alerts-dismissed"));
  } catch {}
}

export function areAlertsDismissed(userId: string | null | undefined): boolean {
  try {
    const until = localStorage.getItem(dismissKey(userId));
    if (!until) return false;
    const today = new Date().toISOString().slice(0, 10);
    return today <= until;
  } catch {
    return false;
  }
}

function detectAlert(
  entry: WatchlistEntry,
  snapshots: CompetitorSnapshot[],
): CompetitorAlert | null {
  const withViewers = snapshots.filter((s) => s.avg_viewers !== null);
  if (withViewers.length < 2) return null;

  const last = withViewers[withViewers.length - 1];
  const prev = withViewers[withViewers.length - 2];

  // Only alert if the most recent snapshot is within the last 7 days
  const lastAgeDays = (Date.now() - new Date(last.date).getTime()) / 86_400_000;
  if (lastAgeDays > 7) return null;

  const lastV = last.avg_viewers!;
  const prevV = prev.avg_viewers!;

  if (prevV > 0) {
    const pctChange = ((lastV - prevV) / prevV) * 100;

    if (pctChange >= 20) {
      return {
        login: entry.login,
        display_name: entry.display_name,
        avatar_url: entry.avatar_url ?? null,
        type: "viewers_surge",
        pct: Math.round(pctChange),
        delta: Math.round(lastV - prevV),
        date: last.date,
      };
    }
    if (pctChange <= -20) {
      return {
        login: entry.login,
        display_name: entry.display_name,
        avatar_url: entry.avatar_url ?? null,
        type: "viewers_drop",
        pct: Math.round(Math.abs(pctChange)),
        delta: Math.round(lastV - prevV),
        date: last.date,
      };
    }
  }

  // Score change
  if (last.stream_score !== null && prev.stream_score !== null) {
    const scoreDelta = last.stream_score - prev.stream_score;
    if (scoreDelta >= 10) {
      return {
        login: entry.login,
        display_name: entry.display_name,
        avatar_url: entry.avatar_url ?? null,
        type: "score_up",
        pct: scoreDelta,
        delta: scoreDelta,
        date: last.date,
      };
    }
    if (scoreDelta <= -10) {
      return {
        login: entry.login,
        display_name: entry.display_name,
        avatar_url: entry.avatar_url ?? null,
        type: "score_down",
        pct: Math.abs(scoreDelta),
        delta: scoreDelta,
        date: last.date,
      };
    }
  }

  // Clips spike (≥5 new clips AND ≥50% increase)
  if (last.clips_30d !== null && prev.clips_30d !== null && prev.clips_30d > 0) {
    const clipsDelta = last.clips_30d - prev.clips_30d;
    if (clipsDelta >= 5 && clipsDelta / prev.clips_30d >= 0.5) {
      return {
        login: entry.login,
        display_name: entry.display_name,
        avatar_url: entry.avatar_url ?? null,
        type: "clips_spike",
        pct: Math.round((clipsDelta / prev.clips_30d) * 100),
        delta: clipsDelta,
        date: last.date,
      };
    }
  }

  return null;
}

const ALERT_PRIORITY: Record<AlertType, number> = {
  viewers_surge: 0,
  viewers_drop: 1,
  score_up: 2,
  clips_spike: 3,
  score_down: 4,
};

export function computeAlerts(
  userId: string | null | undefined,
  entries: WatchlistEntry[],
): CompetitorAlert[] {
  const alerts: CompetitorAlert[] = [];
  for (const entry of entries) {
    const snaps = getSnapshots(userId, entry.login);
    const alert = detectAlert(entry, snaps);
    if (alert) alerts.push(alert);
  }
  return alerts
    .sort((a, b) => (ALERT_PRIORITY[a.type] ?? 9) - (ALERT_PRIORITY[b.type] ?? 9))
    .slice(0, 3);
}
