import type { LiveSession } from "./liveSessions";

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  atRisk: boolean;
  thisWeekCount: number;
  streakBroken: boolean;
  lastLiveAt: string | null;
}

function getMondayTimestamp(date: Date): number {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function getWeekMondayDate(date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function computeStreak(sessions: LiveSession[]): StreakData {
  const ended = sessions.filter((s) => s.status === "ended");

  const now = new Date();
  const thisWeekTs = getMondayTimestamp(now);
  const lastWeekTs = thisWeekTs - 7 * 86400000;

  // Build a set of week timestamps that have at least 1 session
  const weekSet = new Set<number>();
  let lastLiveAt: string | null = null;

  for (const s of ended) {
    const weekTs = getMondayTimestamp(new Date(s.started_at));
    weekSet.add(weekTs);
    const liveEnd = s.ended_at ?? s.started_at;
    if (!lastLiveAt || liveEnd > lastLiveAt) lastLiveAt = liveEnd;
  }

  const thisWeekCount = ended.filter(
    (s) => getMondayTimestamp(new Date(s.started_at)) === thisWeekTs,
  ).length;

  // Most recent live week
  const sortedWeeks = [...weekSet].sort((a, b) => b - a);
  const lastLiveWeekTs = sortedWeeks[0] ?? null;

  // Current streak: count consecutive weeks from the most recent live week
  let currentStreak = 0;
  if (lastLiveWeekTs !== null) {
    // Streak is "alive" if the most recent live week is this week OR last week
    if (lastLiveWeekTs >= lastWeekTs) {
      let cursor = lastLiveWeekTs;
      while (weekSet.has(cursor)) {
        currentStreak++;
        cursor -= 7 * 86400000;
      }
    }
  }

  // Longest streak (all-time)
  let longestStreak = 0;
  if (sortedWeeks.length > 0) {
    const asc = [...sortedWeeks].reverse();
    let run = 1;
    for (let i = 1; i < asc.length; i++) {
      if (asc[i] - asc[i - 1] === 7 * 86400000) {
        run++;
      } else {
        longestStreak = Math.max(longestStreak, run);
        run = 1;
      }
    }
    longestStreak = Math.max(longestStreak, run);
  }

  // atRisk: Wed or later, no live this week, but last week had one (streak alive)
  const dayOfWeek = now.getDay(); // 0=Sun,1=Mon,...,3=Wed
  const atRisk =
    (dayOfWeek >= 3 || dayOfWeek === 0) && // Wed, Thu, Fri, Sat, Sun
    thisWeekCount === 0 &&
    lastLiveWeekTs === lastWeekTs;

  // streakBroken: had a streak history but gap is larger than last week
  const streakBroken =
    longestStreak > 0 &&
    currentStreak === 0 &&
    lastLiveWeekTs !== null &&
    lastLiveWeekTs < lastWeekTs;

  return {
    currentStreak,
    longestStreak,
    atRisk,
    thisWeekCount,
    streakBroken,
    lastLiveAt,
  };
}
