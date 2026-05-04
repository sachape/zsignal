import type { LiveSession, LiveDebrief } from "./liveSessions";
import { formatLiveDuration } from "./liveSessions";

export type PostFormat = "tweet" | "discord" | "tiktok" | "next_live";

export interface GeneratedPost {
  format: PostFormat;
  label: string;
  platformEmoji: string;
  charLimit?: number;
  variants: string[];
}

const GAME_HASHTAGS: Record<string, string> = {
  "Valorant": "#Valorant #FPS #Tactical",
  "League of Legends": "#LeagueOfLegends #LoL #MOBA",
  "Minecraft": "#Minecraft #Gaming #Survie",
  "Fortnite": "#Fortnite #BattleRoyale #Gaming",
  "Apex Legends": "#ApexLegends #FPS #BattleRoyale",
  "Call of Duty": "#CallOfDuty #FPS #Gaming",
  "Overwatch 2": "#Overwatch2 #FPS #Gaming",
  "Counter-Strike 2": "#CS2 #CounterStrike #FPS",
  "Dota 2": "#Dota2 #MOBA #Gaming",
  "Rocket League": "#RocketLeague #Gaming",
  "GTA V": "#GTAV #GTA #Gaming",
  "Just Chatting": "#JustChatting #Twitch #IRL",
  "World of Warcraft": "#WoW #MMORPG #Gaming",
  "Hearthstone": "#Hearthstone #CardGame #Gaming",
  "Teamfight Tactics": "#TFT #TeamfightTactics #Gaming",
};

function getHashtags(game: string | null): string {
  if (!game) return "#Twitch #Gaming #Streamer";
  const known = GAME_HASHTAGS[game];
  if (known) return known;
  const clean = game.replace(/[\s:'"!?]/g, "");
  return `#${clean} #Gaming #Twitch`;
}

function sessionDateLabel(startedAt: string): string {
  const d = new Date(startedAt);
  const diffMs = Date.now() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  const hour = d.getHours();
  const slot = hour >= 18 ? "soir" : hour >= 12 ? "après-midi" : "matin";
  if (diffDays === 0) return `ce ${slot}`;
  if (diffDays === 1) return `hier ${slot}`;
  const day = d.toLocaleDateString("fr-FR", { weekday: "long" });
  return `${day} ${slot}`;
}

/** Returns true if the session ended within the last `maxHours`. */
export function isSessionRecent(
  endedAt: string | null | undefined,
  maxHours = 72,
): boolean {
  if (!endedAt) return false;
  return Date.now() - new Date(endedAt).getTime() < maxHours * 3600000;
}

export function generatePosts(
  session: LiveSession,
  debrief: LiveDebrief | null,
): GeneratedPost[] {
  const game = session.category_name ?? "Gaming";
  const duration = formatLiveDuration(session.duration_minutes);
  const date = sessionDateLabel(session.started_at);
  const peak = session.peak_viewers;
  const hashtags = getHashtags(session.category_name);

  const strength = debrief?.strength?.trim() ?? null;
  const weakness = debrief?.weakness?.trim() ?? null;
  const verdict = debrief?.verdict?.trim() ?? null;
  const priority = debrief?.priority_action
    ?.replace(/^Priorité\s*:\s*/i, "")
    .trim() ?? null;
  const delta = debrief?.comparison_data ?? null;

  const peakDelta = delta?.peak_delta ?? null;
  const durationDelta = delta?.duration_delta_min ?? null;

  const peakStr = peak != null ? `${peak} en peak` : null;
  const verdictShort = verdict ? verdict.split(/[.!?]/)[0].trim() + "." : null;

  const deltaLine =
    peakDelta != null && peakDelta > 0
      ? `+${peakDelta} viewers vs d'habitude`
      : durationDelta != null && durationDelta > 0
        ? `+${Math.round(durationDelta)} min vs d'habitude`
        : null;

  // ─── TWEET (max 280) ─────────────────────────────────────────────────────
  const tweets: string[] = [
    // v1 — metric + strength
    [
      `${duration} sur ${game} ${date}.`,
      peakStr ? `${peakStr}.` : null,
      deltaLine ? `${deltaLine}.` : null,
      strength ? `${strength}.` : verdictShort,
      "🎯",
    ]
      .filter(Boolean)
      .join(" "),

    // v2 — story angle
    [
      `Live ${game} terminé —`,
      `${duration}`,
      peakStr ? `· ${peakStr}` : null,
      verdictShort ? `· ${verdictShort}` : null,
      "Le clip arrive. 🔥",
    ]
      .filter(Boolean)
      .join(" "),

    // v3 — improvement / objective angle
    deltaLine
      ? `${game} ${date} — ${duration}, ${deltaLine}. On monte. 📈`
      : [
          `${game} terminé.`,
          strength ? `${strength}.` : null,
          priority
            ? `Prochain objectif : ${priority.charAt(0).toLowerCase() + priority.slice(1)}.`
            : null,
          "💪",
        ]
          .filter(Boolean)
          .join(" "),
  ];

  // ─── DISCORD ─────────────────────────────────────────────────────────────
  const discords: string[] = [
    // v1 — full structured recap
    [
      `**📺 Recap live — ${date}**`,
      [
        `🎮 ${game}`,
        session.duration_minutes ? `⏱️ ${duration}` : null,
        peak != null ? `👥 ${peak} peak` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      "",
      verdict ?? null,
      "",
      strength ? `**Ce qui a bien marché :** ${strength}` : null,
      weakness ? `**À améliorer :** ${weakness}` : null,
      priority ? `\n**Prochain focus :** ${priority}` : null,
      "",
      "On revient très vite ! 👋",
    ]
      .filter((l) => l !== null)
      .join("\n"),

    // v2 — short & casual
    [
      "**GG chat ! 🎮**",
      `${duration} ensemble sur ${game}${peak != null ? `, ${peak} en peak` : ""}.`,
      "",
      strength ?? verdictShort ?? "Belle session !",
      "",
      "On remet ça bientôt 👋",
    ]
      .filter(Boolean)
      .join("\n"),
  ];

  // ─── TIKTOK / SHORTS ─────────────────────────────────────────────────────
  const tiktoks: string[] = [
    // v1 — strength hook
    [
      strength ? `${strength} 👀` : `${game} ${date} 🎮`,
      "",
      `${game} · ${duration}`,
      "",
      hashtags,
    ]
      .filter(Boolean)
      .join("\n"),

    // v2 — verdict hook
    [
      verdictShort ? `${verdictShort} 🎯` : `Meilleur moment du live 🎮`,
      "",
      `${game} · ${date}`,
      "",
      hashtags,
    ]
      .filter(Boolean)
      .join("\n"),

    // v3 — metric hook
    [
      peakStr ? `${peakStr} ${date} sur ${game} 📈` : `${game} — ${date} 🎮`,
      weakness ? `À améliorer : ${weakness.charAt(0).toLowerCase() + weakness.slice(1)}` : null,
      "",
      hashtags,
    ]
      .filter(Boolean)
      .join("\n"),
  ];

  // ─── ANNONCE PROCHAIN LIVE ───────────────────────────────────────────────
  const nextLives: string[] = [
    `On remet ça bientôt ! ${game} au prochain live. Venez nombreux 👋`,

    [
      `Prochain live ${game} qui arrive.`,
      priority
        ? `Objectif : ${priority.charAt(0).toLowerCase() + priority.slice(1)}.`
        : null,
      "Venez nombreux 💪",
    ]
      .filter(Boolean)
      .join(" "),

    [
      `Suite au prochain live —`,
      `${game}, on pousse encore.`,
      weakness
        ? `Ce qu'on corrige : ${weakness.charAt(0).toLowerCase() + weakness.slice(1)}.`
        : null,
      "À très vite 🔥",
    ]
      .filter(Boolean)
      .join(" "),
  ];

  return [
    {
      format: "tweet",
      label: "Tweet / X",
      platformEmoji: "𝕏",
      charLimit: 280,
      variants: tweets,
    },
    {
      format: "discord",
      label: "Discord",
      platformEmoji: "💬",
      variants: discords,
    },
    {
      format: "tiktok",
      label: "Caption TikTok / Shorts",
      platformEmoji: "🎬",
      variants: tiktoks,
    },
    {
      format: "next_live",
      label: "Annonce prochain live",
      platformEmoji: "📢",
      variants: nextLives,
    },
  ];
}
