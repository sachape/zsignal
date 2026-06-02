export interface TitleOption {
  text: string;
  score: number;
  tags: string[];
}

interface GameCtx {
  verbs: string[];
  nouns: string[];
  emojis: string[];
  ranks?: string[];
}

const GAME_CTX: Record<string, GameCtx> = {
  "Valorant": {
    verbs: ["Grind", "Climb", "Solo carry", "Tryhard"],
    nouns: ["le ranked", "le climb", "les promos", "les ranks"],
    ranks: ["Gold", "Plat", "Diamond", "Immortal", "Radiant"],
    emojis: ["🎯", "💢", "⚡", "🔫"],
  },
  "League of Legends": {
    verbs: ["Climb", "Carry", "Grind", "Monter"],
    nouns: ["le ranked", "les promos", "le climb", "la remontada"],
    ranks: ["Gold", "Plat", "Diamond", "Master"],
    emojis: ["⚔️", "🏆", "💎", "🔮"],
  },
  "Minecraft": {
    verbs: ["Build", "Survie", "Explore", "Craft"],
    nouns: ["la base", "le projet", "le monde", "le Nether"],
    emojis: ["⛏️", "🌳", "🏗️", "💎"],
  },
  "Fortnite": {
    verbs: ["Grind", "Tryhard", "Win", "Push"],
    nouns: ["les ranked", "les kills", "le grind", "le bot lobby"],
    ranks: ["Bronze", "Silver", "Gold", "Platinum"],
    emojis: ["🏆", "💥", "🎮", "⚡"],
  },
  "Apex Legends": {
    verbs: ["Rank up", "Grind", "Carry", "Push"],
    nouns: ["le ranked", "le grind", "les promos", "le climb"],
    ranks: ["Gold", "Plat", "Diamond", "Master", "Pred"],
    emojis: ["🦅", "💥", "⚡", "🎯"],
  },
  "Call of Duty": {
    verbs: ["Grind", "Tryhard", "Carry"],
    nouns: ["les ranked", "le grind", "les kills", "le clip"],
    emojis: ["🎮", "🔫", "💢", "⚡"],
  },
  "Just Chatting": {
    verbs: ["On discute", "Discussion", "On parle"],
    nouns: ["la communauté", "vos questions", "le vibe", "l'actu"],
    emojis: ["💬", "🎙️", "☕", "🤝"],
  },
  "Counter-Strike 2": {
    verbs: ["Grind", "Tryhard", "Rank up"],
    nouns: ["le ranked", "le climb", "les faceit", "les promos"],
    ranks: ["Silver", "Gold Nova", "MG", "LE", "Global"],
    emojis: ["🎯", "💢", "🔫", "⚡"],
  },
};

const DEFAULT_CTX: GameCtx = {
  verbs: ["Grind", "Live", "Stream"],
  nouns: ["le live", "la session", "le contenu"],
  emojis: ["🎮", "🎯", "⚡", "🔥"],
};

function ctx(game: string): GameCtx {
  return GAME_CTX[game] ?? DEFAULT_CTX;
}

function pick<T>(arr: T[], idx = 0): T {
  return arr[idx % arr.length];
}

function score(text: string): { score: number; tags: string[] } {
  const tags: string[] = [];
  let s = 45;
  const len = text.length;

  if (len >= 32 && len <= 68) { s += 15; tags.push("Longueur optimale"); }
  else if (len < 32) s -= 8;

  if (/\p{Emoji}/u.test(text)) { s += 10; tags.push("Emoji accrocheur"); }
  if (/\d/.test(text)) { s += 8; tags.push("Chiffre concret"); }
  if (text.includes("?")) { s += 7; tags.push("Format question"); }
  if (/rank|climb|grind|carry|solo|tryhard|promo|challenge/i.test(text)) {
    s += 8; tags.push("Intent clair");
  }
  if (/FR\b|français|francais/i.test(text)) { s += 5; tags.push("Audience FR ciblée"); }
  if (/qui est|là\s*\?|avec moi|rejoins|let's go/i.test(text)) {
    s += 6; tags.push("Invite communauté");
  }

  return { score: Math.min(100, Math.max(0, s)), tags };
}

export function generateTitles(game: string, angle?: string | null): TitleOption[] {
  const c = ctx(game);
  const e0 = c.emojis[0];
  const e1 = c.emojis[1] ?? c.emojis[0];
  const v0 = c.verbs[0];
  const n0 = c.nouns[0];
  const n1 = c.nouns[1] ?? c.nouns[0];
  const rank = c.ranks ? pick(c.ranks, 2) : null;
  const angleStr = angle?.trim() || null;
  const isChat = game === "Just Chatting";

  let templates: string[];

  if (isChat) {
    templates = [
      `${e0} Discussion ouverte — ${angleStr ?? "posez vos questions"}`,
      `${e1} On parle de ${angleStr ?? n1} — rejoins la conv`,
      `Just Chatting ${e0} | ${angleStr ?? "bonne ambiance, détente garantie"}`,
      `${e0} Live détendu — ${angleStr ?? "vibe communauté, chat actif"}`,
      `${e1} ${angleStr ?? "L'heure du chat"} — qui est là ce soir ? ${e0}`,
    ];
  } else {
    templates = [
      `${e0} ${v0} ${game}${rank ? ` — push ${rank}` : ""} | ${angleStr ?? n0}`,
      `${game} ${e0} | ${v0} ${n1}${angleStr ? ` — ${angleStr}` : " EN DIRECT"}`,
      `${e1} SOLO ${v0.toUpperCase()}${rank ? ` ${rank}` : ""} ${game} — ${angleStr ?? "qui est là ?"}`,
      `${v0} ${n0} ${e0} — ${game}${angleStr ? ` · ${angleStr}` : " · le grind continue"}`,
      `${game} | ${angleStr ?? n0} — ${e0} ${v0} jusqu'où ?`,
    ];
  }

  return templates
    .map((text) => {
      const { score: s, tags } = score(text);
      return { text, score: s, tags };
    })
    .sort((a, b) => b.score - a.score);
}

export const SUPPORTED_GAMES = Object.keys(GAME_CTX);
