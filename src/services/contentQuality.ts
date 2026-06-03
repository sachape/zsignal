// Content quality engine — deterministic templates (no LLM) for V3.5.
// Generates title variants, description variants, hashtag sets and an
// opportunity score for a Content Queue item. Honest, never invents facts.

import type { ContentIdea, ContentPlatform, ContentPriority } from "@/services/postLiveBrief";

export type VariantStyle = "curiosity" | "performance" | "community" | "simple";

export interface TitleVariant {
  style: VariantStyle;
  label: string; // FR label
  value: string;
}

export interface DescriptionVariant {
  style: "short" | "optimized";
  label: string;
  value: string;
}

export interface HashtagVariant {
  style: "default" | "discovery" | "niche";
  label: string;
  tags: string[];
}

export interface OpportunityScore {
  score: number; // 0-100
  label: "À publier vite" | "Bon potentiel" | "À retravailler" | "Idée secondaire" | "Prêt à publier";
  reason: string;
}

const GAME_TAG_MAP: Record<string, string[]> = {
  "Valorant": ["valorant", "valorantfr", "fps"],
  "League of Legends": ["lolfr", "leagueoflegends", "moba"],
  "Minecraft": ["minecraft", "minecraftfr"],
  "Fortnite": ["fortnitefr", "fortnite"],
  "Apex Legends": ["apexfr", "apexlegends"],
  "Just Chatting": ["justchatting", "irl"],
  "Counter-Strike 2": ["cs2", "counterstrike"],
};

function gameTags(game: string | null | undefined): string[] {
  if (!game) return [];
  if (GAME_TAG_MAP[game]) return GAME_TAG_MAP[game];
  const clean = game
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  return clean ? [clean] : [];
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return `${s.slice(0, n - 1).trimEnd()}…`;
}

function cleanBase(title: string): string {
  return title.replace(/\s+/g, " ").trim();
}

// ── Titles ──────────────────────────────────────────────────────────────────

export function generateTitleVariants(args: {
  baseTitle: string;
  platform: ContentPlatform;
  gameCategory?: string | null;
  mainAngle?: string | null;
}): TitleVariant[] {
  const base = cleanBase(args.baseTitle);
  const game = args.gameCategory?.trim() || null;
  const angle = args.mainAngle?.trim() || base;
  const p = args.platform;

  // Max length per platform.
  const max = p === "youtube_shorts" ? 80 : p === "tiktok" ? 90 : p === "instagram" ? 90 : 80;

  const curiosity =
    p === "tiktok"
      ? `POV : ${angle.toLowerCase()}`
      : p === "youtube_shorts"
        ? `J'ai tenté ${angle.toLowerCase()}…`
        : p === "instagram"
          ? `Un moment que je voulais garder : ${angle}`
          : `Ce moment méritait clairement un clip`;

  const performance =
    p === "twitch_clip"
      ? `${base} — le moment clé`
      : game
        ? `Le moment ${game} qui a tout changé`
        : `Le moment qui a tout changé`;

  const community =
    p === "tiktok"
      ? "Le chat m'a forcé à faire ça…"
      : p === "instagram"
        ? "Le moment dont on m'a le plus parlé"
        : "Réagis si t'aurais fait pareil";

  const simple = base;

  const variants: TitleVariant[] = [
    { style: "curiosity",   label: "Curiosity",   value: truncate(curiosity, max) },
    { style: "performance", label: "Performance", value: truncate(performance, max) },
    { style: "community",   label: "Communauté",  value: truncate(community, max) },
    { style: "simple",      label: "Simple",      value: truncate(simple, max) },
  ];
  // De-dup (rare).
  const seen = new Set<string>();
  return variants.filter(v => {
    const k = v.value.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });
}

// ── Descriptions ────────────────────────────────────────────────────────────

export function generateDescriptionVariants(args: {
  baseTitle: string;
  platform: ContentPlatform;
  gameCategory?: string | null;
  reason?: string | null;
}): DescriptionVariant[] {
  const base = cleanBase(args.baseTitle);
  const game = args.gameCategory?.trim() || null;
  const reason = args.reason?.trim();
  const p = args.platform;

  const hook = p === "tiktok"
    ? "Un moment court mais marquant du dernier live."
    : `Un des moments forts du live${game ? ` sur ${game}` : ""}.`;

  const context = reason
    ? truncate(reason, 140)
    : p === "youtube_shorts"
      ? "Court, lisible, et facile à comprendre même hors contexte."
      : "Le genre de séquence qui mérite mieux qu'une VOD oubliée.";

  const cta = p === "youtube_shorts"
    ? "Abonne-toi pour les meilleurs moments du stream."
    : p === "instagram"
      ? "Suis-moi pour la suite du live."
      : "Dis-moi en commentaire ce que t'aurais fait à ma place.";

  const short = `${hook}\n${context}`;
  const optimized = `${hook}\n${context}\n${cta}`;

  return [
    { style: "short",     label: "Courte",    value: short },
    { style: "optimized", label: "Optimisée", value: optimized },
  ];
}

// ── Hashtags ────────────────────────────────────────────────────────────────

const FR_GAMING_BASE = ["twitchfr", "streamerfr", "gamingfr"];

export function generateHashtagVariants(args: {
  platform: ContentPlatform;
  gameCategory?: string | null;
}): HashtagVariant[] {
  const gTags = gameTags(args.gameCategory);
  const p = args.platform;

  if (p === "youtube_shorts") {
    const def = uniq(["shorts", ...gTags.slice(0, 2), "twitchfr", "gamingfr"]).slice(0, 6);
    const discovery = uniq(["shorts", "fyp", ...gTags.slice(0, 1), "twitchfr", "streamerfr"]).slice(0, 6);
    return [
      { style: "default",   label: "Standard",   tags: def },
      { style: "discovery", label: "Découverte", tags: discovery },
    ];
  }
  if (p === "tiktok") {
    const def = uniq([...gTags.slice(0, 2), "twitchfr", "streamerfr", "gamingfr", "pourtoi"]).slice(0, 8);
    const niche = uniq([...gTags, "twitchfr", "streamerfr"]).slice(0, 6);
    return [
      { style: "default", label: "Standard", tags: def },
      { style: "niche",   label: "Niche",    tags: niche },
    ];
  }
  if (p === "instagram") {
    const def = uniq([...gTags.slice(0, 2), ...FR_GAMING_BASE, "reelsfrance", "creatorfr"]).slice(0, 10);
    return [{ style: "default", label: "Standard", tags: def }];
  }
  if (p === "twitch_clip") {
    return [{ style: "default", label: "Standard", tags: uniq([...gTags, "twitch", "twitchfr"]).slice(0, 5) }];
  }
  return [{ style: "default", label: "Standard", tags: uniq([...gTags, "stream"]).slice(0, 4) }];
}

function uniq(arr: string[]): string[] {
  const seen = new Set<string>(); const out: string[] = [];
  for (const t of arr) {
    const k = t.toLowerCase().replace(/^#/, "");
    if (k && !seen.has(k)) { seen.add(k); out.push(k); }
  }
  return out;
}

// ── Opportunity score ──────────────────────────────────────────────────────

export interface OpportunityInput {
  platform: ContentPlatform;
  priority: ContentPriority;
  hasTitle: boolean;
  hasDescription: boolean;
  hasHashtags: boolean;
  hasGeneratedClip: boolean;
  hasSource: boolean;
  liveAgeHours?: number | null;
}

export function computeOpportunityScore(i: OpportunityInput): OpportunityScore {
  let score = 0;
  const reasons: string[] = [];

  // Platform potential (short video > community).
  const platformWeight: Record<ContentPlatform, number> = {
    youtube_shorts: 25, tiktok: 22, instagram: 18, twitch_clip: 15, community: 10,
  };
  score += platformWeight[i.platform];

  // Priority signal coming from brief.
  score += i.priority === "high" ? 20 : i.priority === "medium" ? 12 : 6;

  // Preparation quality.
  if (i.hasTitle) score += 10;
  if (i.hasDescription) score += 8;
  if (i.hasHashtags) score += 7;
  if (i.hasGeneratedClip) { score += 15; reasons.push("clip prêt"); }
  else if (i.hasSource)    { score += 6; reasons.push("source identifiée"); }

  // Freshness (live recent → urgent).
  if (typeof i.liveAgeHours === "number") {
    if (i.liveAgeHours <= 24)  { score += 10; reasons.push("live de moins de 24h"); }
    else if (i.liveAgeHours <= 72) { score += 5; }
    else if (i.liveAgeHours > 168) { score -= 10; reasons.push("live ancien"); }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let label: OpportunityScore["label"];
  if (i.hasGeneratedClip && i.hasTitle && i.hasDescription) label = "Prêt à publier";
  else if (score >= 75) label = "À publier vite";
  else if (score >= 55) label = "Bon potentiel";
  else if (score >= 35) label = "À retravailler";
  else label = "Idée secondaire";

  const reason = reasons.length > 0
    ? `${label} · ${reasons.join(", ")}`
    : `${label} · basé sur la préparation éditoriale.`;

  return { score, label, reason };
}

// ── Convenience: build full quality pack for an idea coming from the brief ──

export interface QualityPack {
  title_variants: TitleVariant[];
  selected_title_variant: VariantStyle;
  description_variants: DescriptionVariant[];
  selected_description_variant: "short" | "optimized";
  hashtag_variants: HashtagVariant[];
  selected_hashtags: string[];
  opportunity_score: number;
  opportunity_label: string;
  opportunity_reason: string;
  title: string;
  description: string;
  hashtags: string[];
}

export function buildQualityPackForIdea(args: {
  idea: ContentIdea;
  gameCategory?: string | null;
  mainAngle?: string | null;
  liveAgeHours?: number | null;
}): QualityPack {
  const { idea } = args;
  const titles = generateTitleVariants({
    baseTitle: idea.title,
    platform: idea.platform,
    gameCategory: args.gameCategory,
    mainAngle: args.mainAngle,
  });
  const descs = generateDescriptionVariants({
    baseTitle: idea.title,
    platform: idea.platform,
    gameCategory: args.gameCategory,
    reason: idea.reason,
  });
  const tags = generateHashtagVariants({
    platform: idea.platform,
    gameCategory: args.gameCategory,
  });

  const chosenTitle = titles[0]?.value ?? idea.title;
  const chosenDesc = descs[0]?.value ?? "";
  const chosenTags = tags[0]?.tags ?? [];

  const score = computeOpportunityScore({
    platform: idea.platform,
    priority: idea.priority,
    hasTitle: !!chosenTitle,
    hasDescription: !!chosenDesc,
    hasHashtags: chosenTags.length > 0,
    hasGeneratedClip: false,
    hasSource: false,
    liveAgeHours: args.liveAgeHours,
  });

  return {
    title_variants: titles,
    selected_title_variant: titles[0]?.style ?? "simple",
    description_variants: descs,
    selected_description_variant: descs[0]?.style ?? "short",
    hashtag_variants: tags,
    selected_hashtags: chosenTags,
    opportunity_score: score.score,
    opportunity_label: score.label,
    opportunity_reason: score.reason,
    title: chosenTitle,
    description: chosenDesc,
    hashtags: chosenTags,
  };
}
