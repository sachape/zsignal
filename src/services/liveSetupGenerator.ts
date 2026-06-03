// Live Setup metadata generator — pure, deterministic, no analytics invented.
// Builds platform-specific titles/descriptions from the user's own inputs only.

import type { Platform } from "@/types/networks";

export type LiveTone = "chill" | "competitive" | "educational" | "entertainment";
export type LiveTargetPlatform = Platform | "kick";

export interface LiveSetupInput {
  titleRaw: string;
  gameCategory: string;
  objective: string;
  tone: LiveTone | "";
  language: string;
  targetAudience: string;
  platforms: LiveTargetPlatform[];
  scheduledAt?: string | null;
}

export interface GeneratedMetadata {
  twitch: { title: string; category: string };
  youtube: { title: string; description: string; tags: string[] };
  kick: { title: string };
  socialSummary: string;
}

const TONE_LABEL: Record<LiveTone, string> = {
  chill: "Chill",
  competitive: "Compétitif",
  educational: "Éducatif",
  entertainment: "Divertissement",
};

function clip(s: string, max: number): string {
  if (!s) return "";
  const t = s.trim();
  return t.length <= max ? t : t.slice(0, max - 1).trimEnd() + "…";
}

function buildBaseTitle(input: LiveSetupInput): string {
  const base = input.titleRaw.trim();
  if (base) return base;
  const parts: string[] = [];
  if (input.gameCategory) parts.push(input.gameCategory);
  if (input.objective) parts.push(input.objective);
  return parts.join(" — ") || "Nouveau live";
}

export function generateMetadata(input: LiveSetupInput): GeneratedMetadata {
  const base = buildBaseTitle(input);
  const toneLabel = input.tone ? TONE_LABEL[input.tone as LiveTone] : "";

  // Twitch — title 140 max
  const twitchSuffix = toneLabel ? ` | ${toneLabel}` : "";
  const twitchTitle = clip(`${base}${twitchSuffix}`, 140);

  // YouTube — title 100 max, description longer
  const ytTitleSuffix = input.gameCategory && !base.toLowerCase().includes(input.gameCategory.toLowerCase())
    ? ` - ${input.gameCategory}`
    : "";
  const youtubeTitle = clip(`${base}${ytTitleSuffix}`, 100);

  const descLines: string[] = [base];
  if (input.objective) descLines.push("", `🎯 Objectif : ${input.objective}`);
  if (input.gameCategory) descLines.push(`🎮 Catégorie : ${input.gameCategory}`);
  if (toneLabel) descLines.push(`🎙️ Ambiance : ${toneLabel}`);
  if (input.targetAudience) descLines.push(`👥 Pour : ${input.targetAudience}`);
  if (input.scheduledAt) {
    try {
      const d = new Date(input.scheduledAt);
      descLines.push(`📅 ${d.toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" })}`);
    } catch { /* noop */ }
  }
  descLines.push("", "─────────", "Abonne-toi pour suivre les prochains lives.");
  const youtubeDescription = descLines.join("\n");

  // Tags — derived only from user input
  const tagPool = new Set<string>();
  if (input.gameCategory) {
    input.gameCategory.split(/[\s,]+/).filter(Boolean).forEach((t) => tagPool.add(t.toLowerCase()));
    tagPool.add(input.gameCategory.toLowerCase());
  }
  if (toneLabel) tagPool.add(toneLabel.toLowerCase());
  tagPool.add("live");
  tagPool.add("stream");
  if (input.language) tagPool.add(input.language.toLowerCase());
  const youtubeTags = Array.from(tagPool).slice(0, 12);

  // Kick — mirrors Twitch for now
  const kickTitle = clip(`${base}${twitchSuffix}`, 140);

  // Social short summary
  const summaryBits: string[] = [`🔴 LIVE : ${base}`];
  if (input.gameCategory) summaryBits.push(`sur ${input.gameCategory}`);
  if (input.scheduledAt) {
    try {
      const d = new Date(input.scheduledAt);
      summaryBits.push(`— ${d.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}`);
    } catch { /* noop */ }
  }
  const socialSummary = clip(summaryBits.join(" ") + " — viens checker 👀", 280);

  return {
    twitch: { title: twitchTitle, category: input.gameCategory || "" },
    youtube: { title: youtubeTitle, description: youtubeDescription, tags: youtubeTags },
    kick: { title: kickTitle },
    socialSummary,
  };
}

export const DEFAULT_CHECKLIST_ITEMS: { id: string; label: string }[] = [
  { id: "title", label: "Titre vérifié" },
  { id: "category", label: "Catégorie vérifiée" },
  { id: "yt_desc", label: "Description YouTube prête" },
  { id: "thumbnail", label: "Miniature prête" },
  { id: "obs", label: "OBS ouvert" },
  { id: "mic", label: "Micro testé" },
  { id: "scene", label: "Scène OBS vérifiée" },
  { id: "rec", label: "Enregistrement local activé si souhaité" },
  { id: "clips", label: "Plan de clips prévu" },
];
