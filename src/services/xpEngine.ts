import { supabase } from "@/integrations/supabase/client";

export interface XpLevelData {
  level: 1 | 2 | 3 | 4 | 5;
  label: string;
  icon: string;
  totalXp: number;
  progressToNext: number | null;
  xpToNext: number | null;
  nextLabel: string | null;
}

export interface SeasonData {
  number: number;
  name: string;
  icon: string;
  endDate: Date;
  daysLeft: number;
}

// Single source of truth for XP values — mirrors questEngine quest definitions
export const QUEST_XP_MAP: Record<string, number> = {
  stream_this_week: 50,
  dimension_action: 30,
  watch_competitor: 20,
  post_clip: 25,
  engage_chat: 20,
  stream_punctual: 30,
  share_stream: 20,
  new_format: 35,
  prepare_title: 25,
  long_stream: 40,
  community_post: 20,
  collab_plan: 35,
  review_vod: 25,
  check_stats: 20,
};

const XP_LEVELS = [
  { level: 1 as const, label: "Spark",   icon: "✨", min: 0,    max: 149  },
  { level: 2 as const, label: "Flame",   icon: "🔥", min: 150,  max: 499  },
  { level: 3 as const, label: "Blaze",   icon: "⚡", min: 500,  max: 1199 },
  { level: 4 as const, label: "Inferno", icon: "🌋", min: 1200, max: 2499 },
  { level: 5 as const, label: "Legend",  icon: "🏆", min: 2500, max: 99999 },
];

export function getXpLevel(totalXp: number): XpLevelData {
  const current =
    XP_LEVELS.find((l) => totalXp <= l.max) ?? XP_LEVELS[XP_LEVELS.length - 1];
  const nextIdx = XP_LEVELS.findIndex((l) => l.level === current.level) + 1;
  const next = XP_LEVELS[nextIdx] ?? null;

  let progressToNext: number | null = null;
  let xpToNext: number | null = null;
  if (next) {
    const range = next.min - current.min;
    const progress = totalXp - current.min;
    progressToNext = range > 0 ? Math.min(100, Math.round((progress / range) * 100)) : 100;
    xpToNext = Math.max(0, next.min - totalXp);
  }

  return {
    level: current.level,
    label: current.label,
    icon: current.icon,
    totalXp,
    progressToNext,
    xpToNext,
    nextLabel: next?.label ?? null,
  };
}

export async function loadTotalXp(): Promise<number> {
  try {
    const { data, error } = await supabase
      .from("user_quest_checks")
      .select("quest_id");
    if (error || !data) return 0;
    return data.reduce(
      (sum, row) => sum + (QUEST_XP_MAP[row.quest_id as string] ?? 0),
      0,
    );
  } catch {
    return 0;
  }
}

// Quarterly seasons starting 2026-01-01
const SEASONS = [
  { number: 1, name: "L'Étincelle", icon: "✨", end: new Date("2026-03-31T23:59:59") },
  { number: 2, name: "La Flamme",   icon: "🔥", end: new Date("2026-06-30T23:59:59") },
  { number: 3, name: "L'Orage",     icon: "⚡", end: new Date("2026-09-30T23:59:59") },
  { number: 4, name: "La Légende",  icon: "🏆", end: new Date("2026-12-31T23:59:59") },
];

export function getCurrentSeason(): SeasonData {
  const now = new Date();
  const season = SEASONS.find((s) => now <= s.end) ?? SEASONS[SEASONS.length - 1];
  const daysLeft = Math.max(0, Math.ceil((season.end.getTime() - now.getTime()) / 86400000));
  return {
    number: season.number,
    name: season.name,
    icon: season.icon,
    endDate: season.end,
    daysLeft,
  };
}
