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

interface RotatingQuestDef {
  id: string;
  icon: string;
  title: string;
  description: string;
  xp: number;
  verifiable?: "long_stream";
}

// 4 rotating groups of 3 quests — one group shown per week, cycles every 4 weeks
const ROTATING_GROUPS: RotatingQuestDef[][] = [
  [
    { id: "watch_competitor", icon: "👀", title: "Observe un concurrent 15 min", description: "Note 1 chose qu'il fait mieux — et comment tu peux l'adapter.", xp: 20 },
    { id: "post_clip",        icon: "🎬", title: "Poste un clip cette semaine", description: "Un clip bien monté = visibilité organique hors live.", xp: 25 },
    { id: "engage_chat",      icon: "💬", title: "Réponds à 10 messages pendant le live", description: "L'engagement communautaire booste ton score de momentum.", xp: 20 },
  ],
  [
    { id: "stream_punctual", icon: "⏰", title: "Stream à l'heure prévue", description: "La ponctualité construit la confiance de ton audience.", xp: 30 },
    { id: "share_stream",    icon: "📣", title: "Partage ton stream sur les réseaux", description: "Annonce ton live au moins 1h avant sur Twitter, Discord ou TikTok.", xp: 20 },
    { id: "new_format",      icon: "🧪", title: "Essaie un nouveau format ou segment", description: "Challenge, Q&A, collab, speedrun — varie pour fidéliser.", xp: 35 },
  ],
  [
    { id: "prepare_title",  icon: "🏷️", title: "Prépare ton titre + miniature avant le live", description: "Un titre optimisé augmente le CTR de ta chaîne.", xp: 25 },
    { id: "long_stream",    icon: "⏱️", title: "Fais un live de 2h ou plus cette semaine", description: "Les streams longs améliorent ton score de momentum.", xp: 40, verifiable: "long_stream" },
    { id: "community_post", icon: "📝", title: "Publie un post communauté Twitch", description: "Tiens ta communauté informée entre les streams.", xp: 20 },
  ],
  [
    { id: "collab_plan",  icon: "🤝", title: "Contacte un streamer pour une collab", description: "Une collab = accès à une audience nouvelle sans publicité.", xp: 35 },
    { id: "review_vod",   icon: "🎥", title: "Reregarde 15 min d'un de tes VODs", description: "Auto-critique : identifie 1 habitude à corriger.", xp: 25 },
    { id: "check_stats",  icon: "📊", title: "Analyse tes stats dans les 24h après un live", description: "Note ce qui a fonctionné et ce que tu ajustes.", xp: 20 },
  ],
];

function getRotationIndex(weekKey: string): number {
  const epochMs = new Date("2026-01-05").getTime();
  const weekMs = new Date(weekKey + "T12:00:00").getTime();
  return Math.floor(Math.max(0, weekMs - epochMs) / (7 * 86400000));
}

export function generateWeeklyQuests(
  sessions: LiveSession[],
  report: AnalysisReport | null,
  manualCompleted: Set<string>,
): WeeklyQuests {
  const weekKey = getWeekKey();
  const streak = computeStreak(sessions);

  // Quest 1 (verifiable): stream N times this week — target scales with regularity score
  const regularity = report?.score.regularity ?? 50;
  const targetStreams = regularity >= 65 ? 3 : 2;
  const done = streak.thisWeekCount;
  const q1: Quest = {
    id: "stream_this_week",
    icon: "📡",
    title: `Faire ${targetStreams} lives cette semaine`,
    description: `${done} live${done !== 1 ? "s" : ""} terminé${done !== 1 ? "s" : ""} sur ${targetStreams} cette semaine.`,
    type: "verifiable",
    progress: Math.min(100, Math.round((done / targetStreams) * 100)),
    progressLabel: `${done}/${targetStreams}`,
    completed: done >= targetStreams,
    xp: 50,
  };

  // Quest 2 (manual): target the weakest dimension — always personalized
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

  // Quests 3-5: rotating pool — changes every week, cycles every 4 weeks
  const rotIdx = getRotationIndex(weekKey);
  const group = ROTATING_GROUPS[rotIdx % 4];

  // Pre-compute this-week session data needed for verifiable rotating quests
  const weekStartMs = new Date(weekKey + "T00:00:00").getTime();
  const weekEndMs = weekStartMs + 7 * 86400000;
  const thisWeekEnded = sessions.filter(
    (s) =>
      s.status === "ended" &&
      new Date(s.started_at).getTime() >= weekStartMs &&
      new Date(s.started_at).getTime() < weekEndMs,
  );
  const longestThisWeek = thisWeekEnded.reduce(
    (max, s) => Math.max(max, s.duration_minutes ?? 0),
    0,
  );

  const rotatingQuests: Quest[] = group.map((def) => {
    if (def.verifiable === "long_stream") {
      const longDone = longestThisWeek >= 120;
      return {
        id: def.id,
        icon: def.icon,
        title: def.title,
        description: def.description,
        type: "verifiable",
        progress: Math.min(100, Math.round((longestThisWeek / 120) * 100)),
        progressLabel: `${(longestThisWeek / 60).toFixed(1)}h / 2h`,
        completed: longDone,
        xp: def.xp,
      };
    }
    const isDone = manualCompleted.has(def.id);
    return {
      id: def.id,
      icon: def.icon,
      title: def.title,
      description: def.description,
      type: "manual",
      progress: isDone ? 100 : 0,
      progressLabel: isDone ? "Fait" : "À faire",
      completed: isDone,
      xp: def.xp,
    };
  });

  const quests = [q1, q2, ...rotatingQuests];
  return {
    weekKey,
    quests,
    allCompleted: quests.every((q) => q.completed),
  };
}
