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

// Seen-badge state is persisted in Lovable Cloud (`user_badge_state`).
// In-memory caches mirror DB so getters stay synchronous.
import { supabase } from "@/integrations/supabase/client";

const seenBadgeCache = new Map<string, Set<string>>();
const seenTierCache = new Map<string, Set<string>>();

function getSeenBadges(userId: string): Set<string> {
  return seenBadgeCache.get(userId) ?? new Set();
}

export async function loadSeenBadgesFromDb(userId: string): Promise<void> {
  if (!userId) return;
  const { data, error } = await supabase
    .from("user_badge_state")
    .select("badge_key, badge_type")
    .eq("user_id", userId);
  if (error) return;
  const badges = new Set<string>();
  const tiers = new Set<string>();
  for (const r of data ?? []) {
    if (r.badge_type === "tier") tiers.add(r.badge_key);
    else badges.add(r.badge_key);
  }
  seenBadgeCache.set(userId, badges);
  seenTierCache.set(userId, tiers);
}

export async function markBadgesSeen(userId: string, badgeIds: string[]): Promise<void> {
  if (badgeIds.length === 0 || !userId) return;
  const seen = getSeenBadges(userId);
  badgeIds.forEach((id) => seen.add(id));
  seenBadgeCache.set(userId, seen);
  await supabase.from("user_badge_state").upsert(
    badgeIds.map((id) => ({ user_id: userId, badge_key: id, badge_type: "badge" })),
    { onConflict: "user_id,badge_key,badge_type", ignoreDuplicates: true },
  );
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

// ─── Tiered badge system (used by QuestesPage) ──────────────────────────────

export interface BadgeTier {
  tier: "bronze" | "silver" | "gold";
  label: string;
  description: string;
  unlocked: boolean;
  isNew: boolean;
  progress: number;
  progressLabel: string;
}

export interface TieredBadge {
  id: string;
  icon: string;
  label: string;
  tiers: BadgeTier[];
  currentTier: "bronze" | "silver" | "gold" | null;
  nextTier: BadgeTier | null;
}

function getTierSeenIds(userId: string): Set<string> {
  return seenTierCache.get(userId) ?? new Set();
}

export async function markTierBadgesSeen(userId: string, ids: string[]): Promise<void> {
  if (ids.length === 0 || !userId) return;
  const seen = getTierSeenIds(userId);
  ids.forEach((id) => seen.add(id));
  seenTierCache.set(userId, seen);
  await supabase.from("user_badge_state").upsert(
    ids.map((id) => ({ user_id: userId, badge_key: id, badge_type: "tier" })),
    { onConflict: "user_id,badge_key,badge_type", ignoreDuplicates: true },
  );
}

function makeTier(
  badgeId: string,
  tier: BadgeTier["tier"],
  label: string,
  description: string,
  unlocked: boolean,
  isNew: boolean,
  progress: number,
  progressLabel: string,
): BadgeTier {
  return { tier, label, description, unlocked, isNew, progress: Math.min(100, progress), progressLabel };
  void badgeId;
}

export function evaluateTieredBadges({ sessions, report, userId }: BadgeInput): TieredBadge[] {
  const ended = sessions.filter((s) => s.status === "ended");
  const seen = getTierSeenIds(userId);

  const now = Date.now();
  const ms30d = 30 * 86400000;
  const recent30d = ended.filter((s) => now - new Date(s.started_at).getTime() < ms30d);

  const maxPeak = ended.reduce((max, s) => Math.max(max, s.peak_viewers ?? 0), 0);
  const maxDuration = ended.reduce((max, s) => Math.max(max, s.duration_minutes ?? 0), 0);
  const longStreams3h = ended.filter((s) => (s.duration_minutes ?? 0) >= 180).length;
  const streak = computeStreak(sessions);
  const overall = report?.score.overall ?? 0;

  const build = (
    id: string,
    icon: string,
    label: string,
    tiers: BadgeTier[],
  ): TieredBadge => {
    const currentTier =
      ([...tiers].reverse().find((t) => t.unlocked)?.tier) ?? null;
    const nextTier = tiers.find((t) => !t.unlocked) ?? null;
    return { id, icon, label, tiers, currentTier, nextTier };
  };

  const isNew = (key: string) => !seen.has(key);

  return [
    build("regular", "📅", "Régulier", [
      makeTier("regular", "bronze", "Bronze", "3 streams en 30 jours",
        recent30d.length >= 3, recent30d.length >= 3 && isNew("regular_bronze"),
        (recent30d.length / 3) * 100, `${Math.min(recent30d.length, 3)}/3`),
      makeTier("regular", "silver", "Argent", "8 streams en 30 jours",
        recent30d.length >= 8, recent30d.length >= 8 && isNew("regular_silver"),
        (recent30d.length / 8) * 100, `${Math.min(recent30d.length, 8)}/8`),
      makeTier("regular", "gold", "Or", "12 streams en 30 jours",
        recent30d.length >= 12, recent30d.length >= 12 && isNew("regular_gold"),
        (recent30d.length / 12) * 100, `${Math.min(recent30d.length, 12)}/12`),
    ]),

    build("marathoner", "⏱️", "Marathoner", [
      makeTier("marathoner", "bronze", "Bronze", "1 live ≥ 2h",
        maxDuration >= 120, maxDuration >= 120 && isNew("marathoner_bronze"),
        (maxDuration / 120) * 100, `${(maxDuration / 60).toFixed(1)}h / 2h`),
      makeTier("marathoner", "silver", "Argent", "1 live ≥ 3h",
        maxDuration >= 180, maxDuration >= 180 && isNew("marathoner_silver"),
        (maxDuration / 180) * 100, `${(maxDuration / 60).toFixed(1)}h / 3h`),
      makeTier("marathoner", "gold", "Or", "3 lives ≥ 3h",
        longStreams3h >= 3, longStreams3h >= 3 && isNew("marathoner_gold"),
        (longStreams3h / 3) * 100, `${Math.min(longStreams3h, 3)}/3 lives`),
    ]),

    build("streak", "🔥", "Sur la lancée", [
      makeTier("streak", "bronze", "Bronze", "2 semaines consécutives",
        streak.longestStreak >= 2, streak.longestStreak >= 2 && isNew("streak_bronze"),
        (streak.longestStreak / 2) * 100, `${streak.longestStreak}/2 sem.`),
      makeTier("streak", "silver", "Argent", "4 semaines consécutives",
        streak.longestStreak >= 4, streak.longestStreak >= 4 && isNew("streak_silver"),
        (streak.longestStreak / 4) * 100, `${streak.longestStreak}/4 sem.`),
      makeTier("streak", "gold", "Or", "8 semaines consécutives",
        streak.longestStreak >= 8, streak.longestStreak >= 8 && isNew("streak_gold"),
        (streak.longestStreak / 8) * 100, `${streak.longestStreak}/8 sem.`),
    ]),

    build("popular", "👥", "Populaire", [
      makeTier("popular", "bronze", "Bronze", "20 viewers en peak",
        maxPeak >= 20, maxPeak >= 20 && isNew("popular_bronze"),
        (maxPeak / 20) * 100, `${maxPeak}/20`),
      makeTier("popular", "silver", "Argent", "50 viewers en peak",
        maxPeak >= 50, maxPeak >= 50 && isNew("popular_silver"),
        (maxPeak / 50) * 100, `${maxPeak}/50`),
      makeTier("popular", "gold", "Or", "100 viewers en peak",
        maxPeak >= 100, maxPeak >= 100 && isNew("popular_gold"),
        (maxPeak / 100) * 100, `${maxPeak}/100`),
    ]),

    build("veteran", "💪", "Vétéran", [
      makeTier("veteran", "bronze", "Bronze", "10 lives terminés",
        ended.length >= 10, ended.length >= 10 && isNew("veteran_bronze"),
        (ended.length / 10) * 100, `${Math.min(ended.length, 10)}/10`),
      makeTier("veteran", "silver", "Argent", "30 lives terminés",
        ended.length >= 30, ended.length >= 30 && isNew("veteran_silver"),
        (ended.length / 30) * 100, `${Math.min(ended.length, 30)}/30`),
      makeTier("veteran", "gold", "Or", "60 lives terminés",
        ended.length >= 60, ended.length >= 60 && isNew("veteran_gold"),
        (ended.length / 60) * 100, `${Math.min(ended.length, 60)}/60`),
    ]),

    build("score", "🎯", "StreamScore", [
      makeTier("score", "bronze", "Bronze", "StreamScore ≥ 40",
        overall >= 40, overall >= 40 && isNew("score_bronze"),
        (overall / 40) * 100, `${overall}/40`),
      makeTier("score", "silver", "Argent", "StreamScore ≥ 60",
        overall >= 60, overall >= 60 && isNew("score_silver"),
        (overall / 60) * 100, `${overall}/60`),
      makeTier("score", "gold", "Or", "StreamScore ≥ 80",
        overall >= 80, overall >= 80 && isNew("score_gold"),
        (overall / 80) * 100, `${overall}/80`),
    ]),
  ];
}
