export interface TitleOption {
  text: string;
  score: number;
  tags: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function score(text: string): { score: number; tags: string[] } {
  const tags: string[] = [];
  let s = 45;
  const len = text.length;
  if (len >= 32 && len <= 68)       { s += 15; tags.push("Longueur optimale"); }
  else if (len < 25)                  s -= 10;
  else if (len > 80)                  s -= 8;
  if (/\p{Emoji}/u.test(text))      { s += 10; tags.push("Emoji accrocheur"); }
  if (/\d/.test(text))              { s += 8;  tags.push("Chiffre concret"); }
  if (text.includes("?"))           { s += 7;  tags.push("Format question"); }
  if (/rank|climb|grind|carry|solo|tryhard|promo|challenge|push/i.test(text)) {
    s += 8; tags.push("Intent clair");
  }
  if (/FR\b|français|francais/i.test(text)) { s += 5; tags.push("Audience FR ciblée"); }
  if (/qui est|là\s*\?|avec moi|rejoins|let['']s go|chat/i.test(text)) {
    s += 6; tags.push("Invite communauté");
  }
  if (/!/.test(text))               { s += 3;  tags.push("Ton dynamique"); }
  return { score: Math.min(100, Math.max(0, s)), tags };
}

// ── Game contexts ─────────────────────────────────────────────────────────────

interface GameCtx {
  ranks?: string[];
  modes?: string[];
  phrases: string[][];   // each inner array = one template slot, picked randomly
  emojis: string[];
}

const GAME_CTX: Record<string, GameCtx> = {
  "Valorant": {
    ranks:   ["Gold", "Platine", "Diamond", "Immortal", "Radiant"],
    modes:   ["ranked", "Spike Rush", "Deathmatch", "Premier"],
    emojis:  ["🎯", "💢", "⚡", "🔫", "🏆", "💥", "🎮"],
    phrases: [
      ["Grind", "Climb", "Solo carry", "Tryhard", "Push", "Montée", "Ranked"],
      ["le ranked", "les promos", "le climb", "la montée", "les parties", "le grind"],
      ["session", "live", "run", "partie", "matchs"],
      ["sans tilt", "max focus", "no chill", "clutch or kick", "let's go"],
    ],
  },
  "League of Legends": {
    ranks:   ["Gold", "Platine", "Diamant", "Master", "Challenger"],
    modes:   ["ranked", "ARAM", "flex", "Solo/Duo"],
    emojis:  ["⚔️", "🏆", "💎", "🔮", "⚡", "🎯", "🌀"],
    phrases: [
      ["Climb", "Carry", "Grind", "Monter", "Tryhard", "Push", "Farm"],
      ["le ranked", "les promos", "le climb", "la remontada", "le flex", "Solo/Duo"],
      ["session", "live", "run", "game"],
      ["sans tilt", "max focus", "jusqu'où ?", "on est chauds", "duo ou solo ?"],
    ],
  },
  "Counter-Strike 2": {
    ranks:   ["Silver", "Gold Nova", "MG", "LE", "Supreme", "Global"],
    modes:   ["ranked", "Faceit", "Premier", "DM"],
    emojis:  ["🎯", "💢", "🔫", "⚡", "💥", "🏆", "😤"],
    phrases: [
      ["Grind", "Tryhard", "Rank up", "Push", "Ranked", "Faceit"],
      ["le ranked", "le climb", "les Faceit", "les promos", "la montée"],
      ["session", "live", "run", "matchs"],
      ["max focus", "no warmup", "clutch time", "let's grind", "sans lag"],
    ],
  },
  "Fortnite": {
    ranks:   ["Bronze", "Silver", "Gold", "Platinum", "Elite", "Champion"],
    modes:   ["ranked", "solos", "duos", "squad", "ZB"],
    emojis:  ["🏆", "💥", "🎮", "⚡", "🔥", "🎯", "💫"],
    phrases: [
      ["Grind", "Tryhard", "Win streak", "Push", "Ranked", "FNCS prep"],
      ["les ranked", "les kills", "le grind", "le ranked", "les élims"],
      ["session", "live", "run", "game"],
      ["bot lobby interdit", "no chill", "full tryhard", "let's win", "on est chauds"],
    ],
  },
  "Apex Legends": {
    ranks:   ["Gold", "Platine", "Diamant", "Master", "Predator"],
    modes:   ["ranked", "pubs", "mixtape", "solos"],
    emojis:  ["🦅", "💥", "⚡", "🎯", "🔥", "🏆", "💀"],
    phrases: [
      ["Rank up", "Grind", "Carry", "Push", "Ranked", "Climb"],
      ["le ranked", "le grind", "les promos", "le climb", "le split"],
      ["session", "live", "run", "game"],
      ["no respawn", "full aggro", "max focus", "on grind", "hard diff"],
    ],
  },
  "Call of Duty": {
    ranks:   ["Bronze", "Silver", "Gold", "Platinum", "Crimson"],
    modes:   ["ranked", "WZ", "Multiplayer", "DMZ"],
    emojis:  ["🔫", "💥", "⚡", "🎮", "🏆", "💢", "😤"],
    phrases: [
      ["Grind", "Tryhard", "Carry", "Ranked", "Warzone"],
      ["les ranked", "le grind", "les kills", "le clip", "le warzone"],
      ["session", "live", "run", "game"],
      ["no cheaters", "full tryhard", "max K/D", "let's clip", "hard diff"],
    ],
  },
  "Minecraft": {
    modes:   ["survie", "créatif", "skyblock", "SMP", "serveur"],
    emojis:  ["⛏️", "🌳", "🏗️", "💎", "🔥", "🗺️", "🐉"],
    phrases: [
      ["Build", "Survie", "Explore", "Craft", "Farm", "SMP", "Projet"],
      ["la base", "le projet", "le monde", "le Nether", "la tour", "la farm", "le portail"],
      ["session", "live", "jour", "partie"],
      ["avec vous", "en chill", "no limit", "on vise loin", "qui rejoint ?"],
    ],
  },
  "Just Chatting": {
    emojis:  ["💬", "🎙️", "☕", "🤝", "🔥", "😂", "👀"],
    phrases: [
      ["Discussion", "On parle", "Live détendu", "Chat ouvert", "Q&A", "Vibe"],
      ["la communauté", "vos questions", "le vibe", "l'actu", "tout et rien", "votre avis"],
      ["session", "live", "soir", "moment"],
      ["chat actif", "rejoins-nous", "qui est là ?", "détente garantie", "micro ouvert"],
    ],
  },
  "Grand Theft Auto V": {
    modes:   ["RP", "Online", "FiveM", "missions"],
    emojis:  ["🚗", "💰", "🔫", "🌆", "🏆", "💸", "🎮"],
    phrases: [
      ["GTA RP", "GTA Online", "FiveM", "Missions", "Grind", "Roleplay"],
      ["les missions", "le grind", "les braquages", "le RP", "Los Santos", "la caisse"],
      ["session", "live", "run", "nuit"],
      ["avec le chat", "full roleplay", "on fait les fous", "no cheat", "let's go"],
    ],
  },
  "Rocket League": {
    ranks:   ["Gold", "Platinum", "Diamond", "Champion", "Grand Champion", "SSL"],
    modes:   ["ranked", "1v1", "2v2", "3v3"],
    emojis:  ["🚀", "⚽", "🏆", "💥", "⚡", "🎯", "🔥"],
    phrases: [
      ["Rank up", "Grind", "Climb", "Ranked", "Push", "Mécas"],
      ["le ranked", "les promos", "les mécas", "le 1v1", "le 2v2"],
      ["session", "live", "run", "game"],
      ["aérial practice", "no miss", "max mécas", "full sweat", "let's rank"],
    ],
  },
  "FIFA": {
    ranks:   ["Elite", "Top 100", "Weekend League", "FUT Champs"],
    modes:   ["FUT", "Weekend League", "Rivals", "Draft"],
    emojis:  ["⚽", "🏆", "🎯", "💰", "🔥", "🃏", "⚡"],
    phrases: [
      ["FUT Champs", "Weekend League", "Draft", "Rivals", "Squad Building"],
      ["les packs", "le trade", "les rewards", "le FUT", "les matchs"],
      ["session", "live", "run", "matchs"],
      ["full sweat", "pack opening", "squad goals", "win streak", "no pause"],
    ],
  },
  "Hearthstone": {
    ranks:   ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Legend"],
    modes:   ["ranked", "Arena", "Battlegrounds", "Draft"],
    emojis:  ["🃏", "⚡", "🔮", "🏆", "🎯", "💥", "🌀"],
    phrases: [
      ["Ranked", "Climb", "Legend push", "Arena", "Battlegrounds"],
      ["le ranked", "les promos", "la Legend", "l'Arena", "le BG"],
      ["session", "live", "run", "game"],
      ["new deck", "meta check", "full tryhard", "let's climb", "luck allowed"],
    ],
  },
  "Dead by Daylight": {
    modes:   ["killer", "survivor", "solo", "SWF"],
    emojis:  ["🔪", "😱", "🩸", "💀", "🪝", "🔦", "😈"],
    phrases: [
      ["Killer grind", "Survivor run", "Solo queue", "SWF", "Rank up"],
      ["les ranked", "les survivors", "les gens", "les parties", "le grind"],
      ["session", "live", "run", "game"],
      ["no mercy", "full hook", "GG only", "sweaty survivors", "let's crawl"],
    ],
  },
  "Rust": {
    modes:   ["solo", "duo", "trio", "zerg", "wipe"],
    emojis:  ["🔨", "💀", "🏚️", "⚒️", "🔫", "🌑", "🐻"],
    phrases: [
      ["Solo Rust", "Wipe day", "Base build", "Raid", "Grind", "Survie"],
      ["la base", "les ressources", "le raid", "le wipe", "le loot"],
      ["session", "live", "jour", "wipe"],
      ["solo vs all", "no mercy", "full grind", "on survit", "qui raiderait ?"],
    ],
  },
  "Teamfight Tactics": {
    ranks:   ["Or", "Platine", "Diamant", "Master", "Challenger"],
    modes:   ["ranked", "double up", "hyper roll"],
    emojis:  ["♟️", "💎", "🏆", "⚡", "🃏", "🔮", "🎯"],
    phrases: [
      ["Ranked", "Climb", "Grind", "TFT ranked", "Hyper roll"],
      ["le ranked", "les promos", "la montée", "le comp", "le set"],
      ["session", "live", "run", "game"],
      ["new meta", "full tryhard", "let's augment", "on test le comp", "max focus"],
    ],
  },
};

const DEFAULT_CTX: GameCtx = {
  emojis:  ["🎮", "🎯", "⚡", "🔥", "🏆", "💥"],
  phrases: [
    ["Live", "Stream", "Grind", "Session", "Ranked"],
    ["le live", "la session", "le contenu", "le grind"],
    ["session", "live", "run"],
    ["avec le chat", "no chill", "let's go", "bonne ambiance"],
  ],
};

// ── Template builder ──────────────────────────────────────────────────────────

function buildTemplates(game: string, angle: string | null): string[] {
  const c = GAME_CTX[game] ?? DEFAULT_CTX;
  const e = () => rand(c.emojis);
  const p = (i: number) => rand(c.phrases[i] ?? DEFAULT_CTX.phrases[i] ?? [""]);
  const rank = c.ranks ? rand(c.ranks) : null;
  const mode = c.modes ? rand(c.modes) : null;
  const a = angle?.trim() || null;
  const isChat = game === "Just Chatting";

  if (isChat) {
    return [
      `${e()} Discussion ouverte — ${a ?? "posez vos questions"}`,
      `${e()} On parle de ${a ?? p(1)} — rejoins la conv`,
      `Just Chatting ${e()} | ${a ?? "bonne ambiance, détente garantie"}`,
      `${e()} Live détendu — ${a ?? "vibe communauté, chat actif"}`,
      `${e()} ${a ?? "L'heure du chat"} — qui est là ce soir ? ${e()}`,
      `${e()} Q&A ouvert ${e()} — ${a ?? "toutes les questions bienvenues"}`,
      `${e()} Mic ouvert — ${a ?? p(1)}, chat actif`,
      `Just Chatting avec vous ${e()} | ${a ?? "on parle de tout"}`,
      `${e()} ${a ?? "Chill stream"} — détente et bonne humeur`,
      `${e()} Live communauté — ${a ?? "on refait le monde ensemble"}`,
    ];
  }

  const base = a ? ` — ${a}` : "";
  const rankStr = rank ? ` ${rank}` : "";
  const modeStr = mode ? ` ${mode}` : "";

  return [
    // Classic ranked push
    `${e()} ${p(0)} ${game}${rank ? ` — push ${rank}` : ""} | ${a ?? p(1)}`,
    `${game} ${e()} | ${p(0)} ${p(1)}${a ? ` — ${a}` : " EN DIRECT"}`,
    `${e()} SOLO ${p(0).toUpperCase()}${rankStr} ${game}${a ? ` — ${a}` : " — qui est là ?"}`,
    `${p(0)} ${p(1)} ${e()} — ${game}${a ? ` · ${a}` : " · le grind continue"}`,
    `${game} | ${a ?? p(1)} — ${e()} ${p(0)} jusqu'où ?`,
    // Question hooks
    `On monte${rankStr} aujourd'hui ? ${e()} ${game}${base}`,
    `${e()} Jusqu'où ce soir sur ${game}${rankStr} ? ${a ? `| ${a}` : p(3)}`,
    `${game} — ${p(2)} ${p(3)} ${e()}${base}`,
    // Energy titles
    `${e()} ${p(0).toUpperCase()} ${p(0).toUpperCase()} ${game} — ${a ?? p(3)} !`,
    `${game} ${e()} ${p(0)} — ${a ?? p(3)} !`,
    // Context-rich
    rank ? `${e()} Road to ${rank} sur ${game} — ${a ?? p(3)}` : `${e()} Road to top sur ${game} — ${a ?? p(3)}`,
    mode ? `${e()} ${mode} ${game} — ${a ?? p(3)} ${e()}` : `${e()} ${game} — ${a ?? p(3)} ${e()}`,
    // Social hooks
    `${game} avec le chat ${e()} — ${a ?? p(1)} · rejoins la session`,
    `${e()} ${game}${rankStr} — ${a ?? p(3)} · chat actif`,
    // Minimal + punch
    `${game} ${e()} | ${a ?? `${p(0)} ${p(1)}`}`,
    `${e()} ${a ?? `${p(0)} ${p(1)}`} | ${game}`,
    // Number hook (if rank or mode)
    rank ? `${e()} ${game} | ${a ?? `${p(0)} depuis ${rank}`} — no pause` : `${e()} ${game} | ${a ?? p(3)} — no pause`,
    // Chill angle
    `${game} session chill ${e()} — ${a ?? `${p(1)}, venez`}`,
  ];
}

// ── Public API ────────────────────────────────────────────────────────────────

export function generateTitles(game: string, angle?: string | null, count = 8): TitleOption[] {
  const pool = buildTemplates(game, angle ?? null);
  // Shuffle for true randomness on each call
  const shuffled = shuffle(pool);

  return shuffled
    .slice(0, Math.min(count + 4, shuffled.length))
    .map((text) => {
      const { score: s, tags } = score(text);
      return { text, score: s, tags };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, count);
}

export const SUPPORTED_GAMES = Object.keys(GAME_CTX);
