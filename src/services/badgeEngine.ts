import type { LiveSession } from "./liveSessions";
import type { AnalysisReport } from "@/types/analysis";
import { computeStreak } from "./streakEngine";

export interface Badge {
  id: string;
  icon: string;
  label: string;
  description: string; // contextual, shows current value
  unlocked: boolean;
  isNew: boolean; // unlocked but not yet seen
  progress: number; // 0-100
  progressLabel: string; // e.g. "2/3" or "42%"
}

interface BadgeInput {
  sessions: LiveSession[];
  report: AnalysisReport | null;
  userId: string;
}

const SEEN_KEY = (userId: string) => `seen_badges_${userId}`;

function getSeenBadges(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY(userId));
    return raw ? new Set<string>(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

export function markBadgesSeen(userId: string, badgeIds: string[]): void {
  if (badgeIds.length === 0) return;
  try {
    const seen = getSeenBadges(userId);
    badgeIds.forEach((id) => seen.add(id));
    localStorage.setItem(SEEN_KEY(userId), JSON.stringify([...seen]));
  } catch {
    // localStorage unavailable
  }
}

export function evaluateBadges({ sessions, report, userId }: BadgeInput): Badge[] {
  const ended = sessions.filter((s) => s.status === "ended");
  const seen = getSeenBadges(userId);

  const now = Date.now();
  const ms30d = 30 * 86400000;
  const recent30d = ended.filter(
    (s) => now - new Date(s.started_at).getTime() < ms30d,
  );

  const maxPeak = ended.reduce((max, s) => Math.max(max, s.peak_viewers ?? 0), 0);
  const maxDuration = ended.reduce(
    (max, s) => Math.max(max, s.duration_minutes ?? 0),
    0,
  );
  const streak = computeStreak(sessions);

  const ap = report?.affiliate_progress;
  const avgViewersPct = ap
    ? Math.min(100, (ap.avg_viewers.current / Math.max(1, ap.avg_viewers.target)) * 100)
    : 0;
  const streamDaysPct = ap
    ? Math.min(100, (ap.stream_days.current / Math.max(1, ap.stream_days.target)) * 100)
    : 0;
  const affiliatePct = Math.round((avgViewersPct + streamDaysPct) / 2);

  const overall = report?.score.overall ?? 0;

  const definitions: Omit<Badge, "isNew">[] = [
    {
      id: "regular",
      icon: "📅",
      label: "Régulier",
      description: `3 lives en 30 jours`,
      unlocked: recent30d.length >= 3,
      progress: Math.min(100, Math.round((recent30d.length / 3) * 100)),
      progressLabel: `${Math.min(recent30d.length, 3)}/3`,
    },
    {
      id: "marathoner",
      icon: "⏱️",
      label: "Marathoner",
      description: `Live de 3h ou plus`,
      unlocked: maxDuration >= 180,
      progress: Math.min(100, Math.round((maxDuration / 180) * 100)),
      progressLabel: `${Math.round((maxDuration / 60) * 10) / 10}h/3h`,
    },
    {
      id: "score60",
      icon: "🎯",
      label: "StreamScore 60",
      description: `Score global ≥ 60`,
      unlocked: overall >= 60,
      progress: Math.min(100, overall),
      progressLabel: `${overall}/60`,
    },
    {
      id: "affiliate_close",
      icon: "🚀",
      label: "Affilié proche",
      description: `Viewers + fréquence ≥ 75%`,
      unlocked: affiliatePct >= 75,
      progress: affiliatePct,
      progressLabel: `${affiliatePct}%`,
    },
    {
      id: "streak2",
      icon: "🔥",
      label: "Sur la lancée",
      description: `2 semaines consécutives`,
      unlocked: streak.longestStreak >= 2,
      progress: Math.min(100, Math.round((streak.longestStreak / 2) * 100)),
      progressLabel: `${streak.longestStreak}/2 sem.`,
    },
    {
      id: "popular50",
      icon: "👥",
      label: "Populaire",
      description: `50 viewers en peak`,
      unlocked: maxPeak >= 50,
      progress: Math.min(100, Math.round((maxPeak / 50) * 100)),
      progressLabel: `${maxPeak}/50`,
    },
    {
      id: "persistent10",
      icon: "💪",
      label: "Persistant",
      description: `10 lives terminés`,
      unlocked: ended.length >= 10,
      progress: Math.min(100, Math.round((ended.length / 10) * 100)),
      progressLabel: `${Math.min(ended.length, 10)}/10`,
    },
  ];

  return definitions.map((def) => ({
    ...def,
    isNew: def.unlocked && !seen.has(def.id),
  }));
}
