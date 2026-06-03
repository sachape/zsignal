import type { ConnectedAccount, Recommendation, Platform } from "@/types/networks";

function isActive(accounts: ConnectedAccount[], platform: Platform): boolean {
  return accounts.some(
    (a) =>
      a.platform === platform &&
      (a.connection_status === "connected" || a.connection_status === "manual"),
  );
}

export function computeRecommendations(
  accounts: ConnectedAccount[],
  hasTwitchOAuth = false,
): Recommendation[] {
  const recs: Recommendation[] = [];

  const tw = hasTwitchOAuth || isActive(accounts, "twitch");
  const yt = isActive(accounts, "youtube");
  const tt = isActive(accounts, "tiktok");
  const ig = isActive(accounts, "instagram");
  const allPresent = tw && yt && tt && ig;

  if (!yt) {
    recs.push({
      title: "Connecte YouTube",
      description:
        "Connecte YouTube pour mesurer si tes lives se transforment en contenu découvrable.",
      impact: "high",
      platform: "youtube",
      actionLabel: "Connecter YouTube",
    });
  }

  if (!tt) {
    recs.push({
      title: "Ajoute TikTok",
      description: "Ajoute TikTok pour suivre ton canal d'acquisition court format.",
      impact: "high",
      platform: "tiktok",
      actionLabel: "Ajouter TikTok",
    });
  }

  if (!ig) {
    recs.push({
      title: "Ajoute Instagram",
      description:
        "Ajoute Instagram pour suivre ta vitrine créateur et ta présence communautaire.",
      impact: "medium",
      platform: "instagram",
      actionLabel: "Ajouter Instagram",
    });
  }

  if (tw && !yt && !tt) {
    recs.push({
      title: "Transforme tes lives en contenu",
      description:
        "Ton live est actif, mais ton contenu ne vit pas assez après le stream. Priorité : créer un relais YouTube Shorts ou TikTok.",
      impact: "high",
      platform: "all",
      actionLabel: "Voir les options",
    });
  }

  if (allPresent) {
    recs.push({
      title: "Analyse tes performances cross-plateforme",
      description:
        "Toutes tes plateformes sont présentes. Analyse maintenant quelle plateforme transforme le mieux ton contenu en croissance.",
      impact: "medium",
      platform: "all",
      actionLabel: "Analyser",
    });
  }

  return recs.slice(0, 5);
}

export function computeDiagnostic(
  accounts: ConnectedAccount[],
  hasTwitchOAuth = false,
): {
  strongPoint: string;
  weakPoint: string;
  priorityPlatform: Platform | null;
  mainRisk: string;
  mainOpportunity: string;
} {
  const tw = hasTwitchOAuth || accounts.some((a) => a.platform === "twitch" && (a.connection_status === "connected" || a.connection_status === "manual"));
  const yt = accounts.some((a) => a.platform === "youtube" && (a.connection_status === "connected" || a.connection_status === "manual"));
  const tt = accounts.some((a) => a.platform === "tiktok" && (a.connection_status === "connected" || a.connection_status === "manual"));
  const ig = accounts.some((a) => a.platform === "instagram" && (a.connection_status === "connected" || a.connection_status === "manual"));

  const count = [tw, yt, tt, ig].filter(Boolean).length;

  const strongPoint = tw
    ? "Twitch est actif — ton live est ton socle créateur."
    : count > 0
      ? "Tu as déjà une présence sur plusieurs plateformes."
      : "Aucune plateforme connectée pour l'instant.";

  const weakPoint = !yt && !tt
    ? "Aucun canal de recyclage vidéo (YouTube, TikTok) — ton contenu live disparaît sans laisser de trace."
    : !yt
      ? "YouTube absent — tes lives ne sont pas transformés en contenu référençable."
      : !tt
        ? "TikTok absent — tu manques le canal d'acquisition court format."
        : count < 3
          ? "Présence encore limitée — potentiel non exploité sur certains réseaux."
          : "Ecosystème quasi-complet. Optimise maintenant l'utilisation de chaque canal.";

  const priorityPlatform: Platform | null = !yt
    ? "youtube"
    : !tt
      ? "tiktok"
      : !ig
        ? "instagram"
        : null;

  const mainRisk =
    count <= 1
      ? "Dépendance totale à une seule plateforme — vulnérable aux changements d'algorithme."
      : count === 2
        ? "Présence trop concentrée — une panne ou démonétisation t'affecterait fortement."
        : "Risque faible — continue à diversifier et à mesurer tes performances.";

  const mainOpportunity = !yt
    ? "Publier tes meilleurs moments live en Shorts YouTube peut multiplier ta découvrabilité."
    : !tt
      ? "TikTok est le canal le plus efficace pour l'acquisition organique en 2026."
      : !ig
        ? "Instagram renforce ta vitrine créateur et ta crédibilité auprès des marques."
        : "Piloter la cohérence de ta bio et de tes visuels sur toutes les plateformes.";

  return { strongPoint, weakPoint, priorityPlatform, mainRisk, mainOpportunity };
}
