// Post-live Brief generator — deterministic (no AI), based on session inputs.
// Goal: turn a finished live into an actionable content recycling plan.
// No video processing, no auto-posting, no downloads.

import type { LiveSetupInput, GeneratedMetadata } from "@/services/liveSetupGenerator";
import type { LivePreset } from "@/services/obsPresets";

export type ContentPlatform =
  | "youtube_shorts"
  | "tiktok"
  | "instagram"
  | "community"
  | "twitch_clip";

export type ContentPriority = "low" | "medium" | "high";

export interface ContentIdea {
  id: string;
  platform: ContentPlatform;
  priority: ContentPriority;
  title: string;
  format: string;
  duration?: string;
  reason: string;
}

export interface RecyclingStep {
  day: string;
  action: string;
}

export interface PostLiveBriefSummary {
  platforms_used: string[];
  twitch_title: string | null;
  youtube_created: boolean;
  youtube_watch_url: string | null;
  main_angle: string;
  game_category: string | null;
  objective: string | null;
}

export interface PostLiveBrief {
  generated_at: string;
  summary: PostLiveBriefSummary;
  content_ideas: ContentIdea[];
  content_opportunities: string[];
  recommended_actions: string[];
  recycling_plan: RecyclingStep[];
}

export const PLATFORM_LABEL: Record<ContentPlatform, string> = {
  youtube_shorts: "YouTube Shorts",
  tiktok: "TikTok",
  instagram: "Instagram",
  community: "Post communautaire",
  twitch_clip: "Clip Twitch",
};

export const PRIORITY_LABEL: Record<ContentPriority, string> = {
  high: "Élevée",
  medium: "Moyenne",
  low: "Faible",
};

interface GenerateBriefArgs {
  input: LiveSetupInput;
  metadata: GeneratedMetadata;
  preset: LivePreset | null;
  twitchPushed: boolean;
  twitchTitle?: string | null;
  youtubeCreated: boolean;
  youtubeWatchUrl?: string | null;
}

function shortHook(input: LiveSetupInput): string {
  if (input.objective) return input.objective;
  if (input.titleRaw) return input.titleRaw;
  if (input.gameCategory) return input.gameCategory;
  return "ton live";
}

function pickMoments(preset: LivePreset | null): string[] {
  if (preset && preset.momentsToPlan.length > 0) return preset.momentsToPlan;
  return [
    "Meilleur moment du live",
    "Réaction marquante",
    "Conclusion / verdict",
  ];
}

function pickClips(preset: LivePreset | null): string[] {
  if (preset && preset.clipRecommendations.length > 0) return preset.clipRecommendations;
  return ["Meilleur moment", "Punchline ou réaction forte"];
}

export function generatePostLiveBrief(args: GenerateBriefArgs): PostLiveBrief {
  const { input, metadata, preset, twitchPushed, twitchTitle, youtubeCreated, youtubeWatchUrl } = args;

  const angle = shortHook(input);
  const moments = pickMoments(preset);
  const clips = pickClips(preset);
  const cat = input.gameCategory?.trim() || null;
  const platforms = input.platforms ?? [];

  // Build content ideas (3 Shorts, 3 TikTok, 2 Insta, 1 community, 1 clip).
  const ideas: ContentIdea[] = [];

  // 3 YouTube Shorts.
  ideas.push({
    id: "yt_short_1",
    platform: "youtube_shorts",
    priority: "high",
    title: `${moments[0]} — ${angle}`,
    format: "Short vertical, hook < 2s, sous-titres",
    duration: "30–45 s",
    reason: "Le meilleur moment fonctionne mieux en Short qu'en VOD complète.",
  });
  ideas.push({
    id: "yt_short_2",
    platform: "youtube_shorts",
    priority: "medium",
    title: `${moments[1] ?? "Moment fort"} — ${cat ?? "live"}`,
    format: "Short vertical, voix off ou commentaire posé",
    duration: "20–40 s",
    reason: "Donne un deuxième angle pour ne pas saturer une seule idée.",
  });
  ideas.push({
    id: "yt_short_3",
    platform: "youtube_shorts",
    priority: "low",
    title: `${moments[2] ?? "Conclusion"} — récap`,
    format: "Short récap, texte à l'écran",
    duration: "20–30 s",
    reason: "Recyclage longue traîne pour ceux qui ratent les premiers Shorts.",
  });

  // 3 TikTok.
  ideas.push({
    id: "tt_1",
    platform: "tiktok",
    priority: "high",
    title: `${clips[0]} ${cat ? `· ${cat}` : ""}`.trim(),
    format: "Hook texte plein écran, coupe sèche",
    duration: "15–30 s",
    reason: "TikTok valorise le hook immédiat sur le meilleur moment.",
  });
  ideas.push({
    id: "tt_2",
    platform: "tiktok",
    priority: "medium",
    title: `POV : ${angle}`,
    format: "Format POV, narration courte",
    duration: "20–40 s",
    reason: "Un angle POV personnalise et te démarque du contenu brut.",
  });
  ideas.push({
    id: "tt_3",
    platform: "tiktok",
    priority: "low",
    title: `3 choses à savoir sur ${cat ?? "ce live"}`,
    format: "Liste rapide à l'écran",
    duration: "20–35 s",
    reason: "Format liste = forte rétention, idéal pour recycler 48h après.",
  });

  // 2 Instagram.
  ideas.push({
    id: "ig_1",
    platform: "instagram",
    priority: "medium",
    title: `Reel — ${moments[0]}`,
    format: "Reel vertical, musique tendance",
    duration: "20–40 s",
    reason: "Reels = portée organique + cible communauté existante.",
  });
  ideas.push({
    id: "ig_2",
    platform: "instagram",
    priority: "low",
    title: `Story récap : ${angle}`,
    format: "Story avec sticker question",
    duration: "5–15 s",
    reason: "Story = retention immédiate, faible coût de production.",
  });

  // 1 community post.
  ideas.push({
    id: "comm_1",
    platform: "community",
    priority: "medium",
    title: `Merci pour ${angle} 🙌`,
    format: "Post communautaire (YouTube/Discord), photo + 2 lignes",
    reason: "Renforce la rétention chez ceux qui étaient présents au live.",
  });

  // 1 Twitch clip suggestion.
  ideas.push({
    id: "clip_1",
    platform: "twitch_clip",
    priority: "high",
    title: `${clips[0]} — clip officiel`,
    format: "Clip Twitch 30 s, titre punché",
    duration: "20–40 s",
    reason: "Le clip nourrit la découverte sur Twitch et alimente les Shorts.",
  });

  const opportunities = [
    `Réutiliser ${moments[0]} en Short et TikTok dans les 24 h`,
    `Capitaliser sur ${cat ?? "ta catégorie"} tant que tu es chaud`,
    youtubeCreated
      ? "Mettre le live YouTube en public quand la VOD est prête"
      : "Penser à uploader la VOD sur YouTube si pertinent",
  ];

  const actions: string[] = [];
  if (twitchPushed) actions.push(`Vérifier les clips Twitch créés pendant « ${twitchTitle ?? metadata.twitch.title} »`);
  else actions.push("Ouvrir Twitch et créer 2–3 clips sur les meilleurs moments");
  if (youtubeCreated) actions.push("Finaliser la description, les chapitres et la miniature YouTube");
  else actions.push("Décider si la VOD mérite un upload YouTube dédié");
  actions.push("Sélectionner 3 moments forts à découper avant J+1");
  actions.push("Publier au moins 1 Short et 1 TikTok dans les 48 h");

  const recyclingPlan: RecyclingStep[] = [
    { day: "J+0", action: "Extraire 2 à 3 moments forts depuis Twitch / OBS local rec" },
    { day: "J+1", action: "Publier 1 Short YouTube basé sur le meilleur moment" },
    { day: "J+1", action: "Publier 1 TikTok avec hook texte plein écran" },
    { day: "J+2", action: "Relayer un Reel ou Story Instagram + post communautaire" },
    { day: "J+2", action: "Analyser les performances (Shorts/TikTok) et noter ce qui marche" },
  ];

  return {
    generated_at: new Date().toISOString(),
    summary: {
      platforms_used: platforms,
      twitch_title: twitchPushed ? (twitchTitle ?? metadata.twitch.title ?? null) : null,
      youtube_created: youtubeCreated,
      youtube_watch_url: youtubeWatchUrl ?? null,
      main_angle: angle,
      game_category: cat,
      objective: input.objective || null,
    },
    content_ideas: ideas,
    content_opportunities: opportunities,
    recommended_actions: actions,
    recycling_plan: recyclingPlan,
  };
}
