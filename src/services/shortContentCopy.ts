// Short content copy generator — template-based hooks, captions and
// titles for a single Twitch clip. No LLM, no external API.
//
// Designed to feel natural (not marketing-y) and adapt to:
//   - clip title (cleaned)
//   - game / category
//   - duration
//   - view count level
//   - whether the clip is recent or under-used

import type { ClipInsight, ClipRow } from "@/services/shortContentPlanner";

/** Same mapping as postGenerator.ts to stay consistent. */
const GAME_HASHTAGS: Record<string, string> = {
  Valorant: "#Valorant #FPS #Tactical",
  "League of Legends": "#LeagueOfLegends #LoL #MOBA",
  Minecraft: "#Minecraft #Gaming #Survie",
  Fortnite: "#Fortnite #BattleRoyale #Gaming",
  "Apex Legends": "#ApexLegends #FPS #BattleRoyale",
  "Call of Duty": "#CallOfDuty #FPS #Gaming",
  "Overwatch 2": "#Overwatch2 #FPS #Gaming",
  "Counter-Strike 2": "#CS2 #CounterStrike #FPS",
  "Dota 2": "#Dota2 #MOBA #Gaming",
  "Rocket League": "#RocketLeague #Gaming",
  "GTA V": "#GTAV #GTA #Gaming",
  "Just Chatting": "#JustChatting #Twitch #IRL",
  "World of Warcraft": "#WoW #MMORPG #Gaming",
  Hearthstone: "#Hearthstone #CardGame #Gaming",
  "Teamfight Tactics": "#TFT #TeamfightTactics #Gaming",
};

const SHORTS_TAGS = "#Shorts #fyp #Twitch";
const TIKTOK_TAGS = "#fyp #pourtoi #Twitch";

function getGameHashtags(game: string | null | undefined): string {
  if (!game) return "#Twitch #Gaming #Streamer";
  if (GAME_HASHTAGS[game]) return GAME_HASHTAGS[game];
  // Strip accents/diacritics, then keep only alphanumerics to produce a
  // safe hashtag (e.g. "Pokémon Écarlate" → "#PokemonEcarlate").
  const clean = game
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "");
  if (!clean) return "#Twitch #Gaming #Streamer";
  return `#${clean} #Gaming #Twitch`;
}

/** Strip noisy tokens from a Twitch clip title. */
function cleanTitle(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .replace(/\s+/g, " ")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/\s*\|\s*/g, " — ")
    .trim();
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1).trimEnd();
  return cut.endsWith(".") ? cut : `${cut}…`;
}

function firstSentence(text: string): string {
  const s = text.split(/[.?!]\s+/)[0] ?? text;
  return s.trim();
}

export interface ClipCopyPack {
  hooks: string[];
  caption: string;
  title: string;
  formatRecommendation: string;
  timingRecommendation: string;
  fullPack: string;
}

interface CopyContext {
  cleanedTitle: string;
  game: string | null;
  durationSec: number;
  views: number;
  isRecent: boolean;
  isUnderused: boolean;
  isFeatured: boolean;
}

function buildHooks(ctx: CopyContext): string[] {
  const t = ctx.cleanedTitle;
  const game = ctx.game;
  const hooks: string[] = [];

  // Hook 1 — curiosité directe, ancrée sur le titre si possible.
  if (t) {
    hooks.push(`POV : ${truncate(firstSentence(t).toLowerCase(), 70)}.`);
  } else if (game) {
    hooks.push(`Ce move ${game} mérite clairement un format court.`);
  } else {
    hooks.push("Ce qui s'est passé en stream, je m'y attendais pas.");
  }

  // Hook 2 — contexte (featured / underused / vues / durée), enrichi par le jeu.
  if (ctx.isFeatured) {
    hooks.push(
      game
        ? `Le clip ${game} que Twitch a décidé de mettre en avant 👇`
        : "Le clip que Twitch a décidé de mettre en avant 👇",
    );
  } else if (ctx.isUnderused) {
    hooks.push(
      game
        ? `Personne n'a vu ce moment ${game} — alors je le remets ici.`
        : "Personne n'a vu ce moment — alors je le remets ici.",
    );
  } else if (ctx.views >= 500) {
    hooks.push(`${ctx.views} personnes l'ont vu sur Twitch. Voilà pourquoi.`);
  } else if (ctx.durationSec > 0 && ctx.durationSec <= 30) {
    hooks.push(
      game
        ? `Séquence ${game} courte, lisible, faite pour le vertical.`
        : "Regarde jusqu'au bout, ça part vite.",
    );
  } else if (game) {
    hooks.push(`Un moment ${game} court, parfait à recycler en short.`);
  } else {
    hooks.push("Petit moment de stream qui mérite mieux qu'un VOD oublié.");
  }

  // Hook 3 — appel à interaction, adapté au type de catégorie.
  if (game && game !== "Just Chatting") {
    hooks.push(`Tu joues à ${game} ? Dis-moi ce que t'aurais fait à ma place.`);
  } else if (game === "Just Chatting") {
    hooks.push("Tu réagirais comment, toi ? Dis-le en commentaire.");
  } else {
    hooks.push("Tu réagirais comment, toi ?");
  }

  return hooks.slice(0, 3);
}

function buildCaption(ctx: CopyContext): string {
  const t = ctx.cleanedTitle;
  const tags = `${getGameHashtags(ctx.game)} ${TIKTOK_TAGS}`.trim();
  const opener = t
    ? truncate(firstSentence(t), 100)
    : ctx.game
      ? `Clip ${ctx.game} qui valait le coup d'être gardé.`
      : "Un moment de stream à ne pas perdre.";

  const middle = ctx.isUnderused
    ? "Pas beaucoup vu sur Twitch, mais je le trouve trop bon pour le laisser de côté."
    : ctx.isFeatured
      ? "Twitch l'a mis en avant — autant qu'il vive aussi en court."
      : "Petit extrait de mon dernier live.";

  return `${opener}\n\n${middle}\n\n${tags}`;
}

function buildTitle(ctx: CopyContext): string {
  const t = ctx.cleanedTitle;
  if (t) return truncate(t.length <= 60 ? t : firstSentence(t), 60);
  if (ctx.game) return truncate(`Moment ${ctx.game} de mon dernier live`, 60);
  return "Le moment du stream qui valait le clip";
}

function buildFormatReco(ctx: CopyContext): string {
  if (ctx.durationSec > 0 && ctx.durationSec <= 30) {
    return "Format ultra-court (≤ 30 s), vertical 9:16, hook dans les 2 premières secondes.";
  }
  if (ctx.durationSec > 60) {
    return "Recoupe en 30-45 s, vertical 9:16, garde uniquement le pic d'action.";
  }
  return "Format vertical 9:16, 30-45 s, garde le hook au début et coupe net.";
}

function buildTimingReco(ctx: CopyContext): string {
  if (ctx.isUnderused || ctx.isRecent) {
    return "Publie aujourd'hui ou demain, en fin d'après-midi (17h-19h).";
  }
  return "Publie en soirée (20h-22h), une seule plateforme à la fois.";
}

function buildPack(opts: {
  hooks: string[];
  caption: string;
  title: string;
  format: string;
  timing: string;
  url: string | null;
}): string {
  const lines = [
    "🎬 PACK CONTENU COURT",
    "",
    "📝 TITRE",
    opts.title,
    "",
    "🎯 HOOKS (3 variantes)",
    ...opts.hooks.map((h, i) => `${i + 1}. ${h}`),
    "",
    "📱 CAPTION TIKTOK / REELS / SHORTS",
    opts.caption,
    "",
    "🎞 FORMAT",
    opts.format,
    "",
    "⏰ TIMING",
    opts.timing,
  ];
  if (opts.url) {
    lines.push("", "🔗 SOURCE", opts.url);
  }
  return lines.join("\n");
}

function buildContext(
  clip: ClipRow,
  insight?: ClipInsight,
  gameName?: string | null,
): CopyContext {
  return {
    cleanedTitle: cleanTitle(clip.title),
    game: gameName && gameName.trim() !== "" ? gameName.trim() : null,
    durationSec: insight?.durationSec ?? Math.max(0, clip.duration ?? 0),
    views: Math.max(0, clip.view_count ?? 0),
    isRecent: (insight?.ageDays ?? 999) <= 7,
    isUnderused: insight?.isUnderused === true,
    isFeatured: clip.is_featured === true,
  };
}

/** Generate the full copy pack for one clip. */
export function generateClipCopy(
  clip: ClipRow,
  insight?: ClipInsight,
  gameName?: string | null,
): ClipCopyPack {
  const ctx = buildContext(clip, insight, gameName);
  const hooks = buildHooks(ctx);
  const caption = buildCaption(ctx);
  const title = buildTitle(ctx);
  const formatRecommendation = buildFormatReco(ctx);
  const timingRecommendation = buildTimingReco(ctx);
  const fullPack = buildPack({
    hooks,
    caption,
    title,
    format: formatRecommendation,
    timing: timingRecommendation,
    url: clip.url,
  });

  void SHORTS_TAGS; // reserved for future Shorts-specific caption variant
  return {
    hooks,
    caption,
    title,
    formatRecommendation,
    timingRecommendation,
    fullPack,
  };
}
