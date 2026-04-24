/**
 * Channel stage classification.
 *
 * The result page must adapt to where the channel is in its lifecycle:
 *  - "rookie"     → not yet affiliate, still working towards the first cap
 *  - "affiliate"  → already passed the affiliate threshold, focus on stability
 *  - "partner"    → partner status, focus on fine-grained piloting
 *
 * We never want to show "Progression vers l'affiliation" to an affiliate or
 * partner channel, nor mark unknown statuses as something they aren't.
 */
export type ChannelStage = "rookie" | "affiliate" | "partner";

export interface StageCopy {
  /** Short product label shown in headers/badges (or null = no badge). */
  badgeLabel: string | null;
  badgeVariant: "secondary" | "accent" | "outline";
  /** Title for the stage-specific module that replaces affiliate progress. */
  moduleTitle: string;
  /** Subtext for that module. */
  moduleSubtext: string;
  /** Verdict prefix injected before the blocker phrase. */
  verdictPrefix: string;
}

export const detectChannelStage = (
  broadcasterType: string | null | undefined,
): ChannelStage => {
  const t = (broadcasterType || "").toLowerCase().trim();
  if (t === "partner") return "partner";
  if (t === "affiliate") return "affiliate";
  return "rookie";
};

export const stageCopy = (stage: ChannelStage): StageCopy => {
  switch (stage) {
    case "partner":
      return {
        badgeLabel: "Partenaire",
        badgeVariant: "accent",
        moduleTitle: "Statut partenaire confirmé",
        moduleSubtext:
          "Ton enjeu n'est plus de franchir un seuil, mais de piloter ta performance avec plus de précision.",
        verdictPrefix: "Tu as déjà une base solide.",
      };
    case "affiliate":
      return {
        badgeLabel: "Affilié",
        badgeVariant: "secondary",
        moduleTitle: "Déjà affilié — bravo",
        moduleSubtext:
          "Tu as franchi le premier cap. L'enjeu maintenant est de stabiliser ta progression et de renforcer ce qui fait vraiment grandir ta chaîne.",
        verdictPrefix: "Tu es déjà affilié.",
      };
    default:
      return {
        badgeLabel: null,
        badgeVariant: "outline",
        moduleTitle: "Progression vers l'affiliation",
        moduleSubtext:
          "Voici où tu en es par rapport au premier cap Twitch.",
        verdictPrefix: "",
      };
  }
};
