import type { LiveSession } from "./liveSessions";
import type { AnalysisReport } from "@/types/analysis";
import { computeStreak } from "./streakEngine";
import { supabase } from "@/integrations/supabase/client";

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: "verifiable" | "manual";
  progress: number; // 0-100
  progressLabel: string;
  completed: boolean;
  xp: number;
  icon: string;
}

export interface WeeklyQuests {
  weekKey: string; // "2026-04-27" — ISO date of Monday
  quests: Quest[];
  allCompleted: boolean;
}

export function getWeekKey(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
}

/**
 * Load checked quest ids for the current authenticated user and given week.
 * Returns an empty Set if the read fails (e.g. offline) so the UI never crashes.
 */
export async function loadQuestChecks(weekKey: string): Promise<Set<string>> {
  try {
    const { data, error } = await supabase
      .from("user_quest_checks")
      .select("quest_id")
      .eq("week_key", weekKey);
    if (error) {
      console.warn("[questEngine] loadQuestChecks failed", error.message);
      return new Set();
    }
    return new Set((data ?? []).map((r) => r.quest_id as string));
  } catch (e) {
    console.warn("[questEngine] loadQuestChecks exception", e);
    return new Set();
  }
}

/**
 * Toggle a manual quest check in the database. Returns the new checked state.
 */
export async function toggleManualQuest(
  userId: string,
  weekKey: string,
  questId: string,
  currentlyChecked: boolean,
): Promise<boolean> {
  try {
    if (currentlyChecked) {
      const { error } = await supabase
        .from("user_quest_checks")
        .delete()
        .eq("user_id", userId)
        .eq("week_key", weekKey)
        .eq("quest_id", questId);
      if (error) {
        console.warn("[questEngine] uncheck failed", error.message);
        return true;
      }
      return false;
    }
    const { error } = await supabase
      .from("user_quest_checks")
      .upsert(
        { user_id: userId, week_key: weekKey, quest_id: questId },
        { onConflict: "user_id,week_key,quest_id", ignoreDuplicates: true },
      );
    if (error) {
      console.warn("[questEngine] check failed", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn("[questEngine] toggleManualQuest exception", e);
    return currentlyChecked;
  }
}

// Dimension names match `score.breakdown[].dimension` (French, as returned by the engine)
const DIMENSION_QUESTS: Record<
  string,
  { title: string; description: string; icon: string }
> = {
  régularité: {
    icon: "📅",
    title: "Annonce ton prochain live",
    description: "Poste sur tes réseaux ou Discord pour prévenir ta communauté.",
  },
  contenu: {
    icon: "🎮",
    title: "Varie ton angle de contenu",
    description: "Teste un format différent : top gameplay, commentary, chill stream.",
  },
  structure: {
    icon: "🎬",
    title: "Prépare une intro mémorable",
    description: "Planifie les 3 premières minutes de ton prochain live à l'avance.",
  },
  positionnement: {
    icon: "🏷️",
    title: "Peaufine ton branding",
    description: "Mets à jour ton titre, tes panneaux ou ta description de chaîne.",
  },
  momentum: {
    icon: "💬",
    title: "Engage ta communauté",
    description: "Interagis avec 5 membres hors live (Discord, Twitter, TikTok).",
  },
  monétisation: {
    icon: "💰",
    title: "Configure tes outils",
    description: "Vérifie que tes panneaux, alertes et commandes chat sont à jour.",
  },
};

const DEFAULT_QUEST = {
  icon: "⚡",
  title: "Lance-toi sur le prochain live",
  description: "Streaming régulier — c'est la base de tout le reste.",
};

export function generateWeeklyQuests(
  sessions: LiveSession[],
  report: AnalysisReport | null,
  manualCompleted: Set<string>,
): WeeklyQuests {
  const weekKey = getWeekKey();
  const streak = computeStreak(sessions);

  // Quest 1 (verifiable): stream N times this week
  const regularity = report?.score.regularity ?? 50;
  const targetStreams = regularity >= 65 ? 3 : 2;
  const done = streak.thisWeekCount;
  const q1Progress = Math.min(100, Math.round((done / targetStreams) * 100));
  const q1: Quest = {
    id: "stream_this_week",
    icon: "📡",
    title: `Faire ${targetStreams} lives cette semaine`,
    description: `${done} live${done !== 1 ? "s" : ""} terminé${done !== 1 ? "s" : ""} sur ${targetStreams} cette semaine.`,
    type: "verifiable",
    progress: q1Progress,
    progressLabel: `${done}/${targetStreams}`,
    completed: done >= targetStreams,
    xp: 50,
  };

  // Quest 2 (manual): target the weakest dimension
  let weakestDim = "";
  if (report?.score.breakdown?.length) {
    const worst = [...report.score.breakdown].sort((a, b) => a.score - b.score)[0];
    weakestDim = worst?.dimension?.toLowerCase() ?? "";
  }
  const dimQuest = DIMENSION_QUESTS[weakestDim] ?? DEFAULT_QUEST;
  const q2Done = manualCompleted.has("dimension_action");
  const q2: Quest = {
    id: "dimension_action",
    icon: dimQuest.icon,
    title: dimQuest.title,
    description: dimQuest.description,
    type: "manual",
    progress: q2Done ? 100 : 0,
    progressLabel: q2Done ? "Fait" : "À faire",
    completed: q2Done,
    xp: 30,
  };

  // Quest 3 (manual): observation / community
  const q3Done = manualCompleted.has("watch_competitor");
  const q3: Quest = {
    id: "watch_competitor",
    icon: "👀",
    title: "Observe un concurrent 15 min",
    description: "Note 1 chose qu'il fait mieux — et comment tu peux l'adapter.",
    type: "manual",
    progress: q3Done ? 100 : 0,
    progressLabel: q3Done ? "Fait" : "À faire",
    completed: q3Done,
    xp: 20,
  };

  const quests = [q1, q2, q3];
  return {
    weekKey,
    quests,
    allCompleted: quests.every((q) => q.completed),
  };
}
