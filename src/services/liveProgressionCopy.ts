/**
 * User-facing microcopy for live activity progression.
 *
 * We deliberately avoid any technical terminology ("signal", "confidence",
 * "snapshots", "fallback", "partial data"). The wording is always positive
 * and oriented toward the next step the streamer can take.
 *
 * Source of truth for the count is `live_sessions` (merged with VOD), not
 * the raw Twitch VOD archive — see factsEngine.streams_30d.
 */

export interface LiveProgressionCopy {
  /** Short headline shown in banners / focus cards. */
  headline: string;
  /** One-sentence helper, oriented toward the next action. */
  helper: string;
  /** Friendly label for the audience metric (avg viewers) when missing. */
  audienceFallback: string;
}

export function getLiveProgressionCopy(
  streams30d: number,
  hasAvgViewers: boolean,
): LiveProgressionCopy {
  if (streams30d <= 0) {
    return {
      headline: "Lance ton premier live pour débloquer ton analyse.",
      helper:
        "Streamnco a besoin d'une session pour commencer à mesurer ta progression.",
      audienceFallback: "Les tendances d'audience apparaîtront après ton premier live.",
    };
  }

  if (streams30d === 1) {
    return {
      headline: "1 live détecté. Continue sur ta lancée.",
      helper:
        "Vise 3 lives par semaine pour stabiliser ton rythme et obtenir des tendances plus fiables.",
      audienceFallback: "Les tendances d'audience se préciseront après tes prochains lives.",
    };
  }

  if (streams30d < 8) {
    return {
      headline: `${streams30d} lives sur 30 jours. Tu es en train de poser ton rythme.`,
      helper:
        "Garde le cap : la régularité est ton levier principal à ce stade.",
      audienceFallback: hasAvgViewers
        ? ""
        : "Continue à streamer pour préciser tes tendances d'audience.",
    };
  }

  return {
    headline: `${streams30d} lives sur 30 jours.`,
    helper: "Ton rythme est solide. On peut optimiser le format et l'audience.",
    audienceFallback: hasAvgViewers ? "" : "Pas encore assez de recul pour analyser l'audience.",
  };
}
