/**
 * Lightweight competitor trend tracking via localStorage snapshots.
 * One snapshot per competitor per day, max 90 days (rolling window).
 * Snapshots are only recorded when the user opens a watchlisted profile.
 */

export interface CompetitorSnapshot {
  date: string;        // YYYY-MM-DD
  stream_score: number | null;
  avg_viewers: number | null;
  clips_30d: number | null;
  streams_30d: number | null;
  is_live: boolean;
}

const KEY_PREFIX = "streampulse:csnap:";
const MAX_SNAPSHOTS = 90;
const MIN_FOR_CHART = 3;

function storageKey(userId: string | null | undefined, login: string): string {
  return `${KEY_PREFIX}${userId ?? "anon"}:${login.toLowerCase()}`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function read(userId: string | null | undefined, login: string): CompetitorSnapshot[] {
  try {
    const raw = localStorage.getItem(storageKey(userId, login));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CompetitorSnapshot[]) : [];
  } catch {
    return [];
  }
}

function write(userId: string | null | undefined, login: string, snapshots: CompetitorSnapshot[]): void {
  try {
    localStorage.setItem(storageKey(userId, login), JSON.stringify(snapshots));
  } catch {
    // Quota exceeded — trim aggressively and retry once
    try {
      const trimmed = snapshots.slice(-30);
      localStorage.setItem(storageKey(userId, login), JSON.stringify(trimmed));
    } catch {
      // ignore
    }
  }
}

/** Record a snapshot. Skips if one already exists for today. */
export function recordSnapshot(
  userId: string | null | undefined,
  login: string,
  data: Omit<CompetitorSnapshot, "date">,
): void {
  const current = read(userId, login);
  const todayStr = today();

  // Dedup: one per day
  if (current.some((s) => s.date === todayStr)) return;

  const next = [
    ...current,
    { date: todayStr, ...data },
  ]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-MAX_SNAPSHOTS); // rolling 90-day window

  write(userId, login, next);
}

export function getSnapshots(
  userId: string | null | undefined,
  login: string,
): CompetitorSnapshot[] {
  return read(userId, login);
}

export function hasEnoughData(snapshots: CompetitorSnapshot[]): boolean {
  return snapshots.filter((s) => s.avg_viewers !== null).length >= MIN_FOR_CHART;
}

/** Returns the trend vs previous snapshot: positive = growing, 0 = flat, negative = declining */
export function viewersTrend(snapshots: CompetitorSnapshot[]): {
  delta: number | null;
  pct: number | null;
  direction: "up" | "down" | "flat" | "unknown";
} {
  const withViewers = snapshots.filter((s) => s.avg_viewers !== null);
  if (withViewers.length < 2) return { delta: null, pct: null, direction: "unknown" };

  const last = withViewers[withViewers.length - 1].avg_viewers!;
  const prev = withViewers[withViewers.length - 2].avg_viewers!;
  const delta = last - prev;
  const pct = prev > 0 ? Math.round((delta / prev) * 100) : null;

  return {
    delta,
    pct,
    direction: Math.abs(delta) < 2 ? "flat" : delta > 0 ? "up" : "down",
  };
}

export { MIN_FOR_CHART };
