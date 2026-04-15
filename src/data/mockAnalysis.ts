import type { AnalysisReport } from "@/types/analysis";

export const mockAnalysisReport: AnalysisReport = {
  job_id: "mock-job-001",
  channel_summary: {
    channel_name: "ta_chaîne",
    display_name: "Ta Chaîne",
    category: "Variété",
    avg_viewers: 45,
    broadcaster_type: "affiliate",
    follower_count: 1200,
  },
  score: {
    overall_score: 62,
    regularity: 71,
    engagement: 78,
    growth: 55,
    discoverability: 48,
    content_quality: 65,
    community: 72,
    monetization_readiness: 40,
    affiliate_progress: 88,
  },
  affiliate_progress: {
    avg_viewers: { current: 2.8, target: 3 },
    stream_days: { current: 6, target: 7 },
    unique_chatters: { current: 42, target: 50 },
  },
  competitors: [
    {
      id: "comp-1",
      competitor_login: "streamzilla_fr",
      display_name: "Streamzilla FR",
      similarity_score: 87,
      follower_count: 2400,
      avg_viewers: 62,
    },
    {
      id: "comp-2",
      competitor_login: "pixel_warrior",
      display_name: "Pixel Warrior",
      similarity_score: 74,
      follower_count: 1800,
      avg_viewers: 38,
    },
  ],
  recommendations: [
    {
      id: "rec-1",
      priority: 1,
      title: "Stabilise ton planning",
      description:
        "Streame au moins 5 jours cette semaine, idéalement aux mêmes horaires. La régularité est le levier de croissance n°1.",
      category: "regularity",
      is_locked: false,
    },
    {
      id: "rec-2",
      priority: 2,
      title: "Optimise tes titres",
      description:
        "Utilise des titres avec mots-clés et crochets. Ex : [FR] Ranked Climb → Diamant",
      category: "discoverability",
      is_locked: true,
    },
    {
      id: "rec-3",
      priority: 3,
      title: "Raid un streamer similaire",
      description:
        "Après chaque stream, raid l'un de tes meilleurs matchs pour créer un effet réseau.",
      category: "community",
      is_locked: true,
    },
  ],
  weak_point: {
    label: "Régularité de stream",
    description:
      "Tu as streamé 4 jours sur 7 la semaine dernière. Un planning irrégulier réduit ta visibilité jusqu'à 35%.",
  },
};
