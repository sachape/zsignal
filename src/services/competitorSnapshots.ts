/**
 * Competitor sparkline snapshots.
 * Source of truth: Lovable Cloud database (`competitor_snapshots`).
 * One snapshot per competitor per day, max 90 days (rolling window).
 * In-memory cache mirrors the DB so existing synchronous getters keep working.
 */

import { supabase } from "@/integrations/supabase/client";

export interface CompetitorSnapshot {
  date: string; // YYYY-MM-DD
  stream_score: number | null;
  avg_viewers: number | null;
  clips_30d: number | null;
  streams_30d: number | null;
  is_live: boolean;
}

const MAX_SNAPSHOTS = 90;
const MIN_FOR_CHART = 3;

const cache = new Map<string, CompetitorSnapshot[]>(); // `${userId}:${login}` -> snapshots

function ckey(userId: string | null | undefined, login: string): string {
  return `${userId ?? "anon"}:${login.toLowerCase()}`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function rowToSnapshot(r: {
  captured_on: string;
  viewer_count: number | null;
  stream_score: number | null;
  clips_30d: number | null;
  streams_30d: number | null;
  is_live: boolean;
}): CompetitorSnapshot {
  return {
    date: r.captured_on,
    avg_viewers: r.viewer_count,
    stream_score: r.stream_score,
    clips_30d: r.clips_30d,
    streams_30d: r.streams_30d,
    is_live: r.is_live,
  };
}

/** Load snapshots for one competitor from DB into the in-memory cache. */
export async function loadSnapshotsFromDb(
  userId: string | null | undefined,
  login: string,
): Promise<CompetitorSnapshot[]> {
  if (!userId) {
    cache.set(ckey(userId, login), []);
    return [];
  }
  const { data, error } = await supabase
    .from("competitor_snapshots")
    .select("captured_on, viewer_count, stream_score, clips_30d, streams_30d, is_live")
    .eq("user_id", userId)
    .eq("login", login.toLowerCase())
    .order("captured_on", { ascending: true })
    .limit(MAX_SNAPSHOTS);
  if (error) return cache.get(ckey(userId, login)) ?? [];
  const snaps = (data ?? []).map(rowToSnapshot);
  cache.set(ckey(userId, login), snaps);
  return snaps;
}

/** Record a snapshot. Skips if one already exists for today (DB unique enforces). */
export async function recordSnapshot(
  userId: string | null | undefined,
  login: string,
  data: Omit<CompetitorSnapshot, "date">,
): Promise<void> {
  const todayStr = today();
  const current = cache.get(ckey(userId, login)) ?? [];
  if (current.some((s) => s.date === todayStr)) return;

  const optimistic: CompetitorSnapshot = { date: todayStr, ...data };
  const next = [...current, optimistic]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-MAX_SNAPSHOTS);
  cache.set(ckey(userId, login), next);

  if (!userId) return;
  await supabase.from("competitor_snapshots").upsert(
    {
      user_id: userId,
      platform: "twitch",
      login: login.toLowerCase(),
      viewer_count: data.avg_viewers,
      stream_score: data.stream_score,
      clips_30d: data.clips_30d,
      streams_30d: data.streams_30d,
      is_live: data.is_live,
      captured_on: todayStr,
    },
    { onConflict: "user_id,platform,login,captured_on", ignoreDuplicates: true },
  );
}

export function getSnapshots(
  userId: string | null | undefined,
  login: string,
): CompetitorSnapshot[] {
  return cache.get(ckey(userId, login)) ?? [];
}

export function hasEnoughData(snapshots: CompetitorSnapshot[]): boolean {
  return snapshots.filter((s) => s.avg_viewers !== null).length >= MIN_FOR_CHART;
}

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
