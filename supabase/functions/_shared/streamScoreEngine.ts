// Shared StreamScore engine — pure TypeScript, runs in Deno (Edge Functions)
// AND in the browser (Vite). MUST stay free of DOM, Node, Deno, Supabase
// client, and `import.meta` references.
//
// v3 — maturity-aware scoring. Every sub-score is computed from a raw
// 0..100 signal AND capped by data-availability rules so a single live
// cannot push the overall score above ~30 and individual dimensions can
// never reach 100 without a real activity baseline.

export interface SharedChannelFact {
  key: string;
  value: number | string | boolean | null;
}

export interface SharedScoreBreakdownItem {
  dimension: string;
  score: number;
  weight: number;
  reasons: string[];
  levers: string[];
}

export interface SharedStreamScore {
  overall: number;
  regularity: number;
  structure: number;
  content: number;
  positioning: number;
  momentum: number;
  monetization: number; // kept as field name for back-compat (= Affiliation)
  confidence: number;
  freshness: number;
  breakdown: SharedScoreBreakdownItem[];
}

function getFact(facts: SharedChannelFact[], key: string): number {
  const f = facts.find((f) => f.key === key);
  return typeof f?.value === "number" ? f.value : 0;
}

function getBool(facts: SharedChannelFact[], key: string): boolean {
  const f = facts.find((f) => f.key === key);
  if (typeof f?.value === "boolean") return f.value;
  if (typeof f?.value === "number") return f.value === 1;
  return false;
}

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}

/**
 * Global maturity cap applied to the overall StreamScore.
 * Prevents a single live from pushing the score into "established" range.
 */
export function getMaturityCap(streams30d: number, hours30d: number): number {
  if (streams30d <= 0) return 20;
  if (streams30d === 1) return 30;
  if (streams30d <= 3) return 45;
  if (streams30d >= 4 && hours30d < 4) return 55;
  return 100;
}

export function computeStreamScore(facts: SharedChannelFact[]): SharedStreamScore {
  const streams30d = getFact(facts, "streams_30d");
  const streams7d = getFact(facts, "streams_7d");
  const consistency = getFact(facts, "posting_consistency_score");
  const avgDuration = getFact(facts, "avg_duration_minutes");
  const clips30d = getFact(facts, "clips_30d");
  const exportedClips30d = getFact(facts, "exported_clips_30d");
  const catSwitchRate = getFact(facts, "category_switch_rate");
  const avgViewers = getFact(facts, "live_avg_viewers")
    || getFact(facts, "avg_viewers")
    || getFact(facts, "avg_vod_views_30d");
  const followers = getFact(facts, "follower_count");
  const followersAvailable = getFact(facts, "followers_available") === 1;
  const totalHours = getFact(facts, "total_hours_30d");
  const uniqueDays = getFact(facts, "unique_stream_days_30d");
  const connectedSocialCount = getFact(facts, "connected_social_accounts_count");
  const hasDescription = getBool(facts, "has_description")
    || getFact(facts, "has_description") === 1;
  const hasAvatar = getBool(facts, "has_avatar")
    || getFact(facts, "has_avatar") === 1;
  const dominantCategory = facts.find((f) => f.key === "dominant_category");
  const hasDominantCategory = !!(dominantCategory
    && typeof dominantCategory.value === "string"
    && dominantCategory.value.trim().length > 0);

  // ---------- Regularity (weight 25%) ----------
  const sessionsProgress = Math.min(streams30d / 8, 1);
  const daysProgress = Math.min(uniqueDays / 8, 1);
  const hoursProgress = Math.min(totalHours / 20, 1);
  const durationProgress = Math.min(avgDuration / 120, 1);
  const regularityRaw = clamp(
    100 * (sessionsProgress * 0.35 + daysProgress * 0.35 + hoursProgress * 0.20 + durationProgress * 0.10),
  );
  let regularityCap = 100;
  if (streams30d <= 0) regularityCap = 0;
  else if (streams30d === 1) regularityCap = 20;
  else if (streams30d <= 3) regularityCap = 40;
  if (uniqueDays < 4) regularityCap = Math.min(regularityCap, 55);
  if (totalHours < 4) regularityCap = Math.min(regularityCap, 55);
  const regularity = Math.min(regularityRaw, regularityCap);

  const regularity_reasons: string[] = [];
  const regularity_levers: string[] = [];
  if (streams30d === 0) {
    regularity_reasons.push("Aucun live détecté ces 30 derniers jours");
    regularity_levers.push("Planifie un premier live pour relancer la dynamique");
  } else if (streams30d === 1) {
    regularity_reasons.push("Premier live détecté — encore trop tôt pour confirmer");
    regularity_levers.push("Enchaîne 2 à 3 lives cette semaine pour stabiliser ta régularité");
  } else if (streams30d < 8) {
    regularity_reasons.push(`${streams30d} lives sur 30 jours — base à consolider`);
    regularity_levers.push("Vise au moins 3 lives par semaine");
  }
  if (uniqueDays >= 2 && consistency < 50) {
    regularity_reasons.push("Planning encore irrégulier");
    regularity_levers.push("Fixe des jours et horaires récurrents");
  }

  // ---------- Structure (weight 15%) ----------
  // Without granular profile signals, we approximate with the fields we have:
  // category consistency, planning consistency, average duration, identity
  // (avatar), bio (description). Title/promise is left as a neutral 0.6
  // baseline to avoid fake-zeroing when titles aren't analyzed.
  const identityProgress = hasAvatar ? 1 : 0.5;
  const titleProgress = 0.6;
  const categoryProgress = clamp(100 - catSwitchRate) / 100;
  const planningProgress = consistency / 100;
  const setupProgress = hasDescription ? 1 : 0.4;
  const structureRaw = clamp(
    100 * (
      identityProgress * 0.20 +
      titleProgress * 0.20 +
      categoryProgress * 0.20 +
      planningProgress * 0.20 +
      setupProgress * 0.20
    ),
  );
  let structureCap = 100;
  if (streams30d === 0) structureCap = 50;
  else if (streams30d === 1) structureCap = 60;
  if (!hasDescription) structureCap = Math.min(structureCap, 65);
  if (uniqueDays < 2) structureCap = Math.min(structureCap, 70);
  if (clips30d === 0 && streams30d < 4) structureCap = Math.min(structureCap, 80);
  const structure = Math.min(structureRaw, structureCap);

  const structure_reasons: string[] = [];
  const structure_levers: string[] = [];
  if (!hasDescription) {
    structure_reasons.push("Bio de chaîne à compléter");
    structure_levers.push("Ajoute une bio claire qui explique ce que tu streames");
  }
  if (avgDuration > 0 && avgDuration < 120) {
    structure_reasons.push(`Durée moyenne de ${Math.round(avgDuration)} min — court pour fidéliser`);
    structure_levers.push("Vise des sessions de 2h minimum");
  }

  // ---------- Content (weight 25%) ----------
  const clipsPerStream = streams30d > 0 ? clips30d / streams30d : 0;
  const clipsProgress = Math.min(clips30d / 12, 1);
  const clipsPerStreamProgress = Math.min(clipsPerStream / 1, 1);
  const exportsProgress = Math.min(exportedClips30d / 8, 1);
  const distributionProgress = connectedSocialCount >= 1 ? 1 : 0;
  let contentRaw = clamp(
    100 * (
      clipsProgress * 0.50 +
      clipsPerStreamProgress * 0.25 +
      exportsProgress * 0.15 +
      distributionProgress * 0.10
    ),
  );
  if (clips30d === 0 && exportedClips30d === 0) contentRaw = 0;
  let contentCap = 100;
  if (streams30d === 0) contentCap = 10;
  else if (streams30d === 1) contentCap = 35;
  if (streams30d > 0 && clips30d < streams30d) contentCap = Math.min(contentCap, 60);
  if (distributionProgress === 0) contentCap = Math.min(contentCap, 85);
  const content = Math.min(contentRaw, contentCap);

  const content_reasons: string[] = [];
  const content_levers: string[] = [];
  if (clips30d === 0) {
    content_reasons.push("Aucun clip publié sur les 30 derniers jours");
    content_levers.push("Transforme ton dernier live en au moins 1 clip publiable");
  } else if (clips30d < 3) {
    content_reasons.push(`${clips30d} clip(s) sur 30 jours — à amplifier`);
    content_levers.push("Crée au moins 1 clip publiable par live");
  }
  if (distributionProgress === 0) {
    content_levers.push("Connecte un réseau social pour diffuser tes clips");
  }

  // ---------- Positioning (weight 15%) ----------
  const categoryConsistencyPct = clamp(100 - catSwitchRate);
  const themeClarityPct = hasDominantCategory ? 80 : 30;
  const formatRepetitionPct = clamp(consistency * 0.8 + (streams30d >= 4 ? 20 : 0));
  const positioningRaw = clamp(
    categoryConsistencyPct * 0.45 +
    themeClarityPct * 0.30 +
    formatRepetitionPct * 0.25,
  );
  let positioningCap = 100;
  if (streams30d === 0) positioningCap = 30;
  else if (streams30d === 1) positioningCap = 50;
  else if (streams30d <= 3) positioningCap = 70;
  if (!hasDescription) positioningCap = Math.min(positioningCap, 60);
  if (!hasDominantCategory) positioningCap = Math.min(positioningCap, 60);
  const positioning = Math.min(positioningRaw, positioningCap);

  const positioning_reasons: string[] = [];
  const positioning_levers: string[] = [];
  if (streams30d <= 1) {
    positioning_reasons.push("Ton positionnement commence à se dessiner");
    positioning_levers.push("Confirme ta ligne éditoriale sur plusieurs lives");
  } else if (catSwitchRate > 50) {
    positioning_reasons.push("Tu changes de catégorie trop souvent");
    positioning_levers.push("Stabilise ta catégorie principale 2 à 3 semaines");
  }

  // ---------- Momentum (weight 10%) ----------
  const recentActivityPct = streams7d >= 3 ? 100 : streams7d >= 2 ? 70 : streams7d >= 1 ? 40 : 0;
  const recencyPct = streams7d >= 1 ? 100 : 0;
  const clipsRecentPct = clips30d > 0 ? Math.min(clips30d / 3, 1) * 100 : 0;
  const momentumRaw = clamp(
    recentActivityPct * 0.55 + recencyPct * 0.30 + clipsRecentPct * 0.15,
  );
  let momentumCap = 100;
  if (streams30d === 0) momentumCap = 10;
  else if (streams30d === 1) momentumCap = 45;
  else if (streams30d <= 3) momentumCap = 65;
  if (clips30d === 0) momentumCap = Math.min(momentumCap, 70);
  const momentum = Math.min(momentumRaw, momentumCap);

  const momentum_reasons: string[] = [];
  const momentum_levers: string[] = [];
  if (streams7d === 0 && streams30d > 0) {
    momentum_reasons.push("Pas de live cette semaine");
    momentum_levers.push("Reprends le rythme dès cette semaine");
  } else if (streams30d === 1) {
    momentum_reasons.push("Bon signal de reprise — à confirmer");
    momentum_levers.push("Enchaîne avec un second live dans les 3 prochains jours");
  }

  // ---------- Affiliation / Potentiel monétisation (weight 10%) ----------
  // Tracks progression toward Twitch Affiliate, not actual revenue.
  const followersProgress = followersAvailable ? Math.min(followers / 25, 1) : 0;
  const affHoursProgress = Math.min(totalHours / 4, 1);
  const affDaysProgress = Math.min(uniqueDays / 4, 1);
  const viewersBase = Math.min(avgViewers / 3, 1);
  const viewerDaysConfidence = Math.min(uniqueDays / 4, 1);
  const viewersProgress = viewersBase * viewerDaysConfidence;
  const affiliationRaw = clamp(
    100 * (
      followersProgress * 0.25 +
      affHoursProgress * 0.25 +
      affDaysProgress * 0.25 +
      viewersProgress * 0.25
    ),
  );
  let affiliationCap = 100;
  if (streams30d === 1) affiliationCap = 49;
  if (uniqueDays < 4) affiliationCap = Math.min(affiliationCap, 49);
  if (totalHours < 4) affiliationCap = Math.min(affiliationCap, 49);
  if (followersAvailable && followers < 25) affiliationCap = Math.min(affiliationCap, 75);
  // We can't reliably detect Affiliate/Partner status here; cap at 85 by
  // default to avoid claiming a 100 status we cannot verify.
  affiliationCap = Math.min(affiliationCap, 85);
  if (!followersAvailable) affiliationCap = Math.min(affiliationCap, 60);
  const monetization = Math.min(affiliationRaw, affiliationCap);

  const monetization_reasons: string[] = [];
  const monetization_levers: string[] = [];
  if (followersAvailable && followers < 25) {
    monetization_reasons.push(`${followers}/25 followers pour l'affiliation`);
    monetization_levers.push("Partage ton lien de chaîne sur tes réseaux sociaux");
  }
  if (totalHours < 4) {
    monetization_reasons.push("Il manque encore des heures streamées pour l'affiliation");
  }
  if (uniqueDays < 4) {
    monetization_reasons.push("Il manque encore des jours de stream pour valider l'affiliation");
    monetization_levers.push("Planifie au moins 3 autres lives cette semaine");
  }
  if (!followersAvailable) {
    monetization_reasons.push("Followers non disponibles");
    monetization_levers.push("Reconnecte Twitch avec la permission followers");
  }

  // ---------- Weighted overall + maturity cap ----------
  const overallRaw = clamp(
    regularity * 0.25 +
    content * 0.25 +
    structure * 0.15 +
    positioning * 0.15 +
    momentum * 0.10 +
    monetization * 0.10,
  );
  const maturityCap = getMaturityCap(streams30d, totalHours);
  const overall = Math.min(overallRaw, maturityCap);

  // ---------- Confidence / freshness ----------
  const dataDensity =
    Math.min(streams30d / 8, 1) * 0.5 +
    Math.min(clips30d / 3, 1) * 0.3 +
    (followersAvailable ? 0.2 : 0);
  const confidence = clamp(dataDensity * 100);
  const freshness = clamp(streams7d >= 3 ? 100 : streams7d >= 1 ? 60 : 20);

  const breakdown: SharedScoreBreakdownItem[] = [
    { dimension: "Régularité", score: regularity, weight: 0.25, reasons: regularity_reasons, levers: regularity_levers },
    { dimension: "Contenu", score: content, weight: 0.25, reasons: content_reasons, levers: content_levers },
    { dimension: "Structure", score: structure, weight: 0.15, reasons: structure_reasons, levers: structure_levers },
    { dimension: "Positionnement", score: positioning, weight: 0.15, reasons: positioning_reasons, levers: positioning_levers },
    { dimension: "Momentum", score: momentum, weight: 0.10, reasons: momentum_reasons, levers: momentum_levers },
    { dimension: "Affiliation", score: monetization, weight: 0.10, reasons: monetization_reasons, levers: monetization_levers },
  ];

  return {
    overall,
    regularity,
    structure,
    content,
    positioning,
    momentum,
    monetization,
    confidence,
    freshness,
    breakdown,
  };
}

export function computeScoreConfidence(facts: SharedChannelFact[]): number {
  return computeStreamScore(facts).confidence;
}

export function computeScoreFreshness(facts: SharedChannelFact[]): number {
  return computeStreamScore(facts).freshness;
}

export function computeSignalQuality(facts: SharedChannelFact[]): "high" | "medium" | "low" {
  const s = computeStreamScore(facts);
  const blended = Math.round(s.confidence * 0.6 + s.freshness * 0.4);
  if (blended >= 70) return "high";
  if (blended >= 35) return "medium";
  return "low";
}

/** Back-compat — older shared callers imported this helper. */
export function videosViewWeight(streams30d: number): number {
  if (streams30d >= 12) return 0.25;
  if (streams30d >= 6) return 0.15;
  if (streams30d >= 3) return 0.1;
  return 0;
}

export function normalizeChannelFacts(raw: unknown): SharedChannelFact[] {
  if (!Array.isArray(raw)) return [];
  const out: SharedChannelFact[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const key = (r as { key?: unknown }).key;
    const value = (r as { value?: unknown }).value;
    if (typeof key !== "string") continue;
    if (
      value === null ||
      typeof value === "number" ||
      typeof value === "string" ||
      typeof value === "boolean"
    ) {
      out.push({ key, value: (value ?? null) as string | number | boolean | null });
    }
  }
  return out;
}
