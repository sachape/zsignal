import type {
  TwitchProfile,
  CompetitorMatch,
  CompetitorGroup,
  ChannelFact,
} from "@/types/analysis";

/**
 * CompetitorEngine v2 — meaningful similarity, not category neighbors.
 *
 * Old logic relied almost only on shared category + a follower-ratio. That
 * surfaced random "neighbors" (event/restream channels vs solo creators,
 * tournament casts vs ranked grinders, etc.). The new model scores each
 * candidate on multiple weighted dimensions and applies hard exclusions.
 *
 * Dimensions (weights in computeFit):
 *   - language          (hard penalty if mismatch)
 *   - channel type      (solo vs team/media/event)
 *   - content format    (ranked, chill, casting, event, variety, …)
 *   - relative size     (similar band → direct, slightly bigger → catch-up,
 *                         much bigger → inspiration)
 *   - recent activity   (inactive channels are dropped)
 *   - category          (still important, but no longer dominant)
 *   - editorial pattern (repeated keywords in titles)
 *
 * Output is split into 3 explicit groups: direct / catch-up / inspiration,
 * each carrying explicit match_reasons + a confidence_score.
 */

export interface CandidateChannel {
  id: string;
  login: string;
  display_name: string;
  /** Real broadcaster type if known: 'partner' | 'affiliate' | '' */
  broadcaster_type?: string;
  description?: string;
  /** Recent live snapshot (if currently live or seen live recently). */
  is_live?: boolean;
  live_title?: string | null;
  live_viewer_count?: number | null;
  /** Game/category name if known (from live or recent). */
  game_name?: string | null;
  /** Stream language code (e.g. 'fr', 'en'). */
  language?: string | null;
  /** Sample of recent broadcast titles (used for format inference). */
  recent_titles?: string[];
  /** Lifetime view_count from /users (used as a coarse size proxy). */
  view_count?: number;
}

export interface TargetSignal {
  login: string;
  /** Inferred or known language ('fr' by default for our French-first UX). */
  language: string;
  /** Dominant category name (e.g. "Valorant", "Just Chatting"). */
  dominant_category: string | null;
  /** Recent broadcast/clip titles for editorial inference. */
  recent_titles: string[];
  /** Channel type guess for the target. */
  channel_type: ChannelType;
  /** Content format guess for the target. */
  content_format: ContentFormat;
  /** Coarse size signal (followers OR view_count fallback). */
  size_proxy: number;
  /** True when target itself is essentially inactive (no recent VODs/clips). */
  is_inactive?: boolean;
}

type ChannelType = 'solo' | 'team' | 'media' | 'event' | 'hybrid' | 'unknown';
type ContentFormat =
  | 'ranked'
  | 'casting'
  | 'event'
  | 'rebroadcast'
  | 'reaction'
  | 'educational'
  | 'chill'
  | 'variety'
  | 'unknown';
type SizeBand = 'micro' | 'small' | 'medium' | 'large' | 'event-media' | 'unknown';

// ── Inference helpers ──────────────────────────────────────────────────────

const TEAM_TOKENS = [
  "team", "esport", "esports", "gaming", "officiel", "official",
  "tv", "media", "network", "studio", "prod", "agency",
];
const EVENT_TOKENS = [
  "tournament", "tournoi", "cup", "championship", "ligue", "league",
  "ams", "lan", "event", "showmatch", "finals", "grand final",
  "rebroadcast", "rediffusion", "restream",
];
const CASTING_TOKENS = [
  "cast", "caster", "shoutcast", "commentaire", "commentary",
  "analyse", "analysis", "preshow", "post show", "deep dive",
];
const RANKED_TOKENS = [
  "ranked", "classé", "soloq", "solo q", "ladder", "grind",
  "tryhard", "tryharding", "challenger", "radiant", "immortal",
];
const CHILL_TOKENS = [
  "chill", "casual", "détente", "fun", "tranquille", "no stress",
];
const REACTION_TOKENS = [
  "reaction", "reactions", "react", "réagit", "réaction",
];
const EDUCATIONAL_TOKENS = [
  "tuto", "tutorial", "guide", "explication", "comment",
  "learn", "leçon", "cours",
];

function classifyChannelType(opts: {
  display_name: string;
  description?: string;
  recent_titles?: string[];
  broadcaster_type?: string;
}): ChannelType {
  const blob = `${opts.display_name} ${opts.description ?? ""} ${(opts.recent_titles ?? []).join(" ")}`.toLowerCase();
  const eventHits = EVENT_TOKENS.filter((t) => blob.includes(t)).length;
  const teamHits = TEAM_TOKENS.filter((t) => blob.includes(t)).length;
  const castHits = CASTING_TOKENS.filter((t) => blob.includes(t)).length;

  if (eventHits >= 2 || (eventHits >= 1 && castHits >= 1)) return "event";
  if (teamHits >= 2) return "media";
  if (teamHits === 1 && castHits >= 1) return "media";
  if (castHits >= 2) return "media";
  if (teamHits === 1) return "team";
  return "solo";
}

function classifyContentFormat(opts: {
  recent_titles?: string[];
  game_name?: string | null;
  description?: string;
}): ContentFormat {
  const titles = (opts.recent_titles ?? []).join(" ").toLowerCase();
  const blob = `${titles} ${(opts.description ?? "").toLowerCase()}`;
  if (EVENT_TOKENS.some((t) => blob.includes(t))) return "event";
  if (CASTING_TOKENS.some((t) => blob.includes(t))) return "casting";
  if (RANKED_TOKENS.some((t) => blob.includes(t))) return "ranked";
  if (REACTION_TOKENS.some((t) => blob.includes(t))) return "reaction";
  if (EDUCATIONAL_TOKENS.some((t) => blob.includes(t))) return "educational";
  if (CHILL_TOKENS.some((t) => blob.includes(t))) return "chill";
  if (titles && titles.split(" ").length > 4) return "variety";
  return "unknown";
}

function sizeBandFor(value: number, target: number): SizeBand {
  // Use a relative ratio. We treat very large absolute values (event-style
  // millions of views) as a separate "event-media" band regardless of target.
  if (value >= 5_000_000) return "event-media";
  if (target <= 0) {
    if (value < 500) return "micro";
    if (value < 5_000) return "small";
    if (value < 50_000) return "medium";
    return "large";
  }
  const r = value / target;
  if (r < 0.5) return "micro";
  if (r < 2) return "small"; // similar band as target
  if (r < 8) return "medium";
  return "large";
}

// ── Scoring ────────────────────────────────────────────────────────────────

interface FitResult {
  fit_score: number;
  confidence_score: number;
  reasons: string[];
  excluded: boolean;
  channel_type: ChannelType;
  content_format: ContentFormat;
  size_band: SizeBand;
}

function computeFit(target: TargetSignal, cand: CandidateChannel): FitResult {
  const reasons: string[] = [];
  let fit = 0;
  let confidence = 40; // baseline

  // Hard exclusion: language mismatch (only if both known and different).
  const candLang = (cand.language ?? "").toLowerCase();
  if (candLang && target.language && candLang !== target.language) {
    return {
      fit_score: 0,
      confidence_score: 80,
      reasons: [`Langue différente (${candLang})`],
      excluded: true,
      channel_type: "unknown",
      content_format: "unknown",
      size_band: "unknown",
    };
  }
  if (candLang === target.language) {
    fit += 18;
    confidence += 10;
    reasons.push("Même langue");
  }

  // Channel type: hard penalty if solo vs event/media mismatch.
  const candType = classifyChannelType({
    display_name: cand.display_name,
    description: cand.description,
    recent_titles: cand.recent_titles,
    broadcaster_type: cand.broadcaster_type,
  });
  if (target.channel_type === "solo" && (candType === "event" || candType === "media")) {
    return {
      fit_score: 0,
      confidence_score: 70,
      reasons: ["Type de chaîne différent (event/média vs créateur solo)"],
      excluded: true,
      channel_type: candType,
      content_format: "unknown",
      size_band: "unknown",
    };
  }
  if (candType === target.channel_type) {
    fit += 14;
    confidence += 5;
    reasons.push("Même type de chaîne");
  }

  // Content format
  const candFormat = classifyContentFormat({
    recent_titles: cand.recent_titles,
    game_name: cand.game_name,
    description: cand.description,
  });
  if (candFormat !== "unknown") confidence += 5;
  if (candFormat === target.content_format && candFormat !== "unknown") {
    fit += 18;
    reasons.push(`Format similaire (${candFormat})`);
  } else if (
    candFormat !== "unknown" &&
    target.content_format !== "unknown" &&
    candFormat !== target.content_format
  ) {
    // soft penalty rather than hard exclusion
    fit -= 6;
  }

  // Category match (still useful, but capped at 18 instead of 40).
  if (
    cand.game_name &&
    target.dominant_category &&
    cand.game_name.toLowerCase() === target.dominant_category.toLowerCase()
  ) {
    fit += 18;
    confidence += 10;
    reasons.push("Même catégorie principale");
  }

  // Size band — derive from a coarse proxy: live viewers if live, else view_count.
  const candProxy = cand.is_live
    ? Math.max(cand.live_viewer_count ?? 0, 0) * 50 // amplify to match view_count scale
    : Math.max(cand.view_count ?? 0, 0);
  const band = sizeBandFor(candProxy, target.size_proxy);
  if (band === "small") {
    fit += 14;
    reasons.push("Taille proche");
  } else if (band === "medium") {
    fit += 6;
    reasons.push("Légèrement plus avancé");
  } else if (band === "large") {
    fit += 2;
  } else if (band === "micro") {
    fit += 4;
  }

  // Activity bonus
  if (cand.is_live) {
    fit += 6;
    confidence += 5;
    reasons.push("Actif récemment");
  }

  // Editorial overlap — shared keywords in recent titles
  if (target.recent_titles.length && (cand.recent_titles ?? []).length) {
    const targetTokens = new Set(
      target.recent_titles
        .join(" ")
        .toLowerCase()
        .split(/[^a-z0-9àâçéèêëîïôûùüÿñ]+/i)
        .filter((w) => w.length >= 4),
    );
    const candTokens = (cand.recent_titles ?? [])
      .join(" ")
      .toLowerCase()
      .split(/[^a-z0-9àâçéèêëîïôûùüÿñ]+/i)
      .filter((w) => w.length >= 4);
    const overlap = candTokens.filter((w) => targetTokens.has(w)).length;
    if (overlap >= 3) {
      fit += 8;
      confidence += 5;
      reasons.push("Créneau éditorial voisin");
    }
  }

  return {
    fit_score: Math.max(0, Math.min(100, Math.round(fit))),
    confidence_score: Math.max(0, Math.min(100, confidence)),
    reasons,
    excluded: false,
    channel_type: candType,
    content_format: candFormat,
    size_band: band,
  };
}

// ── Public API used by the teaser/public flow (real Twitch candidates) ─────

export interface BuildCompetitorGroupsOpts {
  target: TargetSignal;
  candidates: CandidateChannel[];
  /** Teaser mode is more conservative: prefer 1 strong over 3 weak. */
  teaser?: boolean;
}

/**
 * Pairwise fit evaluation — used by the streamer profile page so that the
 * pairwise comparison and the global Competitors page use the EXACT same
 * scoring logic. Avoids the contradiction where a profile is labeled
 * "concurrent direct" individually but is missing from the Competitors page.
 */
export interface PairwiseFit {
  relation: 'direct' | 'catch-up' | 'inspiration' | 'none';
  fit_score: number;
  confidence_score: number;
  size_band: SizeBand;
  channel_type: ChannelType;
  content_format: ContentFormat;
  reasons: string[];
  excluded: boolean;
  is_potential: boolean;
}

export function evaluatePairwiseFit(
  target: TargetSignal,
  candidate: CandidateChannel,
): PairwiseFit {
  const fit = computeFit(target, candidate);
  if (fit.excluded) {
    return {
      relation: 'none',
      fit_score: 0,
      confidence_score: fit.confidence_score,
      size_band: fit.size_band,
      channel_type: fit.channel_type,
      content_format: fit.content_format,
      reasons: fit.reasons,
      excluded: true,
      is_potential: false,
    };
  }
  let relation: PairwiseFit['relation'] = 'none';
  if (fit.size_band === 'small' || fit.size_band === 'micro') relation = 'direct';
  else if (fit.size_band === 'medium') relation = 'catch-up';
  else if (fit.size_band === 'large' || fit.size_band === 'event-media') relation = 'inspiration';

  let isPotential = false;
  // Promotion: a medium candidate with strong fit becomes "direct potentiel".
  if (relation === 'catch-up' && fit.fit_score >= 50) {
    relation = 'direct';
    isPotential = true;
  }
  if (relation === 'direct' && fit.confidence_score < 60) {
    isPotential = true;
  }
  return {
    relation,
    fit_score: fit.fit_score,
    confidence_score: fit.confidence_score,
    size_band: fit.size_band,
    channel_type: fit.channel_type,
    content_format: fit.content_format,
    reasons: fit.reasons,
    excluded: false,
    is_potential: isPotential,
  };
}

interface CompetitorPoolDebugItem {
  login: string;
  stage: 'excluded' | 'low-confidence';
  reason: string;
}

export interface CompetitorPoolDebug {
  total_candidates: number;
  direct_confirmed: number;
  direct_potential: number;
  catch_up: number;
  inspiration: number;
  filtered_out: CompetitorPoolDebugItem[];
}

function scoreCompetitorPool(opts: BuildCompetitorGroupsOpts): {
  groups: CompetitorGroup[];
  debug: CompetitorPoolDebug;
} {
  const { target, candidates, teaser } = opts;
  const pool = candidates.filter(
    (c) => c.login.toLowerCase() !== target.login.toLowerCase(),
  );
  const scored = pool.map((cand) => ({ cand, fit: computeFit(target, cand) }));
  const excluded = scored.filter((x) => x.fit.excluded);
  const nonExcluded = scored.filter((x) => !x.fit.excluded);

  // Confidence threshold: stricter in teaser mode, broader in connected mode
  // so credible profiles aren't discarded too early. Pairwise comparison on
  // the streamer profile page uses the same engine — keep this consistent.
  const minConfidence = teaser ? 55 : 35;
  const lowConfidence = nonExcluded.filter(
    (x) => x.fit.confidence_score < minConfidence,
  );
  const usable = nonExcluded.filter((x) => x.fit.confidence_score >= minConfidence);

  // Bucket. Medium-band candidates with a strong fit are promoted as "direct
  // potentiel" so the global page can surface profiles that pairwise
  // comparison would also flag as direct.
  const direct: typeof usable = [];
  const directPotential: typeof usable = [];
  const catchUp: typeof usable = [];
  const inspiration: typeof usable = [];
  for (const x of usable) {
    if (x.fit.size_band === "small" || x.fit.size_band === "micro") {
      direct.push(x);
    } else if (x.fit.size_band === "medium") {
      if (x.fit.fit_score >= 50) directPotential.push(x);
      else catchUp.push(x);
    } else if (x.fit.size_band === "large" || x.fit.size_band === "event-media") {
      inspiration.push(x);
    }
  }

  const sortFit = (arr: typeof usable) =>
    arr.sort(
      (a, b) =>
        b.fit.fit_score - a.fit.fit_score ||
        b.fit.confidence_score - a.fit.confidence_score,
    );
  sortFit(direct);
  sortFit(directPotential);
  sortFit(catchUp);
  sortFit(inspiration);

  const directLimit = teaser ? 1 : 3;
  const directPotentialLimit = teaser ? 1 : 3;
  const catchUpLimit = teaser ? 1 : 3;
  const inspirationLimit = teaser ? 1 : 2;

  const toMatch = (
    x: { cand: CandidateChannel; fit: FitResult },
    group: CompetitorMatch["group"],
    forcePotential = false,
  ): CompetitorMatch => ({
    id: `comp-${x.cand.login}`,
    competitor_login: x.cand.login,
    display_name: x.cand.display_name,
    similarity_score: x.fit.fit_score,
    follower_count: 0,
    avg_viewers: x.cand.is_live ? (x.cand.live_viewer_count ?? 0) : 0,
    group,
    match_reasons: x.fit.reasons.slice(0, 3),
    strengths:
      x.fit.size_band === "medium" || x.fit.size_band === "large"
        ? ["Légèrement plus avancée"]
        : [],
    fit_score: x.fit.fit_score,
    confidence_score: x.fit.confidence_score,
    channel_type: x.fit.channel_type,
    content_format: x.fit.content_format,
    size_band: x.fit.size_band,
    is_potential:
      forcePotential || (group === "direct" && x.fit.confidence_score < 60),
  });

  const groups: CompetitorGroup[] = [];
  const directConfirmed = direct
    .slice(0, directLimit)
    .map((x) => toMatch(x, "direct"));
  const directPotentialPicks = directPotential
    .slice(0, directPotentialLimit)
    .map((x) => toMatch(x, "direct", true));
  const allDirect = [...directConfirmed, ...directPotentialPicks];
  const catchUpPicks = catchUp
    .slice(0, catchUpLimit)
    .map((x) => toMatch(x, "catch-up"));
  const inspirationPicks = inspiration
    .slice(0, inspirationLimit)
    .map((x) => toMatch(x, "inspiration"));

  if (allDirect.length) {
    groups.push({ type: "direct", label: "Concurrents directs", matches: allDirect });
  }
  if (catchUpPicks.length) {
    groups.push({ type: "catch-up", label: "Chaînes à rattraper", matches: catchUpPicks });
  }
  if (inspirationPicks.length) {
    groups.push({ type: "inspiration", label: "Inspirations", matches: inspirationPicks });
  }

  return {
    groups,
    debug: {
      total_candidates: pool.length,
      direct_confirmed: directConfirmed.length,
      direct_potential: directPotentialPicks.length,
      catch_up: catchUpPicks.length,
      inspiration: inspirationPicks.length,
      filtered_out: [
        ...excluded.map((x) => ({
          login: x.cand.login,
          stage: 'excluded' as const,
          reason: x.fit.reasons[0] ?? 'Exclu par le benchmark',
        })),
        ...lowConfidence.map((x) => ({
          login: x.cand.login,
          stage: 'low-confidence' as const,
          reason:
            x.fit.reasons[0] ??
            `Confiance insuffisante (${x.fit.confidence_score}/${minConfidence})`,
        })),
      ],
    },
  };
}

export function buildCompetitorGroups(
  opts: BuildCompetitorGroupsOpts,
): CompetitorGroup[] {
  return scoreCompetitorPool(opts).groups;
}

export function inspectCompetitorPool(
  opts: BuildCompetitorGroupsOpts,
): CompetitorPoolDebug {
  return scoreCompetitorPool(opts).debug;
}


// ── Legacy wrapper used by the connected/full flow ─────────────────────────

function getFact(facts: ChannelFact[], key: string): number | string {
  const f = facts.find((f) => f.key === key);
  return f?.value ?? 0;
}

/**
 * Legacy entry point used by reportAssembler when no teaserOverrides.competitor_groups
 * are provided (i.e. the connected/full flow). For now, we keep an empty
 * pool here — a future iteration will plug real per-user candidates from
 * Get Streams + Search Channels into buildCompetitorGroups. Returning empty
 * groups is honest: the legacy mock pool was misleading and is removed.
 */
export function findCompetitors(
  profile: TwitchProfile,
  facts: ChannelFact[],
): CompetitorGroup[] {
  // Build a target signal from facts so the connected flow can be wired
  // to real candidates later.
  const dominantCat = String(getFact(facts, "dominant_category") || "");
  const target: TargetSignal = {
    login: profile.login,
    language: "fr",
    dominant_category: dominantCat || null,
    recent_titles: [],
    channel_type: "solo",
    content_format: "unknown",
    size_proxy: profile.follower_count || profile.view_count || 0,
  };
  // No real candidate pool in this flow yet — return empty groups rather
  // than fake neighbors.
  return buildCompetitorGroups({ target, candidates: [], teaser: false });
}
