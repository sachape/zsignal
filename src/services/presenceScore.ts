import type { ConnectedAccount, PresenceScoreResult } from "@/types/networks";

function isActive(accounts: ConnectedAccount[], platform: string): boolean {
  return accounts.some(
    (a) =>
      a.platform === platform &&
      (a.connection_status === "connected" || a.connection_status === "manual"),
  );
}

function getStatusLabel(score: number): string {
  if (score <= 30) return "Présence faible";
  if (score <= 60) return "Présence partielle";
  if (score <= 80) return "Présence solide";
  return "Présence avancée";
}

function getDiagnosis(score: number): string {
  if (score <= 30)
    return "Ta présence créateur est encore trop dépendante d'une seule plateforme.";
  if (score <= 60)
    return "Ta présence est partielle. Tu as une base, mais ton contenu live est encore peu exploité hors plateforme principale.";
  if (score <= 80)
    return "Ta présence est solide. Le prochain levier est d'améliorer le recyclage contenu et la régularité hors live.";
  return "Ta présence est avancée. Tu peux maintenant piloter ton écosystème comme un vrai média créateur.";
}

// hasTwitch is passed separately since Twitch connection may come from useTwitchConnection
export function computePresenceScore(
  accounts: ConnectedAccount[],
  hasTwitchOAuth = false,
): PresenceScoreResult {
  const tw = hasTwitchOAuth || isActive(accounts, "twitch");
  const yt = isActive(accounts, "youtube");
  const tt = isActive(accounts, "tiktok");
  const ig = isActive(accounts, "instagram");

  // 1. Présence plateformes — 35 pts
  const presencePoints =
    (tw ? 10 : 0) + (yt ? 10 : 0) + (tt ? 8 : 0) + (ig ? 7 : 0);

  // 2. Activité récente — 25 pts (V0: credit for having the platform)
  const activityPoints =
    (tw ? 8 : 0) + (yt ? 7 : 0) + (tt ? 5 : 0) + (ig ? 5 : 0);

  // 3. Diversification — 20 pts
  const count = [tw, yt, tt, ig].filter(Boolean).length;
  const diversificationPoints =
    count === 4 ? 20 : count === 3 ? 15 : count === 2 ? 10 : count === 1 ? 4 : 0;

  // 4. Cohérence de présence — 20 pts
  let consistencyPoints = 0;
  for (const acc of accounts) {
    if (acc.connection_status === "connected" || acc.connection_status === "manual") {
      if (acc.username) consistencyPoints += 3;
      if (acc.profile_url) consistencyPoints += 2;
    }
  }
  if (hasTwitchOAuth) consistencyPoints += 5; // Twitch OAuth implies profile completeness
  consistencyPoints = Math.min(20, consistencyPoints);

  const total = Math.min(
    100,
    presencePoints + activityPoints + diversificationPoints + consistencyPoints,
  );

  return {
    total,
    presencePoints,
    activityPoints,
    diversificationPoints,
    consistencyPoints,
    diagnosis: getDiagnosis(total),
    statusLabel: getStatusLabel(total),
  };
}

export function getPlatformScore(
  platform: string,
  accounts: ConnectedAccount[],
  hasTwitchOAuth = false,
): number {
  if (platform === "twitch" && hasTwitchOAuth) return 85;
  const acc = accounts.find((a) => a.platform === platform);
  if (!acc) return 0;
  const active =
    acc.connection_status === "connected" || acc.connection_status === "manual";
  if (!active) return 0;
  let score = 40;
  if (acc.username) score += 25;
  if (acc.profile_url) score += 20;
  if (acc.connection_status === "connected") score += 15;
  return Math.min(100, score);
}
