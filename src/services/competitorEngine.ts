import type { TwitchProfile, CompetitorMatch, CompetitorGroup } from "@/types/analysis";
import type { ChannelFact } from "@/types/analysis";

// Mock competitor database — realistic French streamers
const mockCompetitorPool = [
  { login: "streamzilla_fr", display_name: "Streamzilla FR", follower_count: 2400, avg_viewers: 62, categories: ["lol", "val"], style: "competitive" },
  { login: "pixel_warrior", display_name: "Pixel Warrior", follower_count: 1800, avg_viewers: 38, categories: ["val", "mc"], style: "chill" },
  { login: "cozy_elena", display_name: "Cozy_Elena", follower_count: 120, avg_viewers: 8, categories: ["mc", "stardew"], style: "chill" },
  { login: "le_boss_tv", display_name: "Le_Boss_TV", follower_count: 95, avg_viewers: 5, categories: ["lol", "val"], style: "competitive" },
  { login: "galaxie_live", display_name: "Galaxie_Live", follower_count: 350, avg_viewers: 18, categories: ["irl", "lc"], style: "variety" },
  { login: "luna_stream", display_name: "Luna_Stream", follower_count: 5200, avg_viewers: 140, categories: ["lol"], style: "competitive" },
  { login: "nova_plays", display_name: "Nova_Plays", follower_count: 800, avg_viewers: 25, categories: ["val", "apex"], style: "competitive" },
  { login: "chill_max_fr", display_name: "Chill_Max_FR", follower_count: 60, avg_viewers: 4, categories: ["mc", "irl"], style: "chill" },
];

function getFact(facts: ChannelFact[], key: string): number | string {
  const f = facts.find((f) => f.key === key);
  return f?.value ?? 0;
}

function computeSimilarity(
  profile: TwitchProfile,
  comp: typeof mockCompetitorPool[0],
  dominantCat: string
): number {
  let score = 0;
  // Category overlap
  if (comp.categories.includes(dominantCat)) score += 40;
  // Follower proximity (closer = more similar)
  const ratio = Math.min(profile.follower_count, comp.follower_count) / Math.max(profile.follower_count, comp.follower_count, 1);
  score += Math.round(ratio * 30);
  // Viewer proximity
  score += Math.round(Math.min(1, comp.avg_viewers / Math.max(comp.avg_viewers, 1)) * 30);
  return Math.min(100, score);
}

export function findCompetitors(
  profile: TwitchProfile,
  facts: ChannelFact[]
): CompetitorGroup[] {
  const dominantCat = String(getFact(facts, "dominant_category"));
  const followers = profile.follower_count;

  const scored = mockCompetitorPool
    .filter((c) => c.login !== profile.login)
    .map((c) => ({
      ...c,
      similarity: computeSimilarity(profile, c, dominantCat),
    }));

  // Direct: similar size, same category
  const direct = scored
    .filter((c) => c.follower_count >= followers * 0.3 && c.follower_count <= followers * 3 && c.similarity >= 40)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 2);

  // Catch-up: bigger but reachable (3-10x followers)
  const catchUp = scored
    .filter((c) => c.follower_count > followers * 3 && c.follower_count <= followers * 15)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 2);

  // Inspiration: much bigger
  const inspiration = scored
    .filter((c) => c.follower_count > followers * 10)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 1);

  const toMatch = (c: typeof scored[0], group: CompetitorMatch["group"]): CompetitorMatch => ({
    id: `comp-${c.login}`,
    competitor_login: c.login,
    display_name: c.display_name,
    similarity_score: c.similarity,
    follower_count: c.follower_count,
    avg_viewers: c.avg_viewers,
    group,
    match_reasons: [
      c.categories.includes(dominantCat) ? "Même catégorie principale" : "Catégorie similaire",
      `${c.follower_count} followers`,
    ],
    strengths: c.avg_viewers > 10 ? ["Plus de viewers moyens"] : [],
  });

  return [
    { type: "direct", label: "Concurrents directs", matches: direct.map((c) => toMatch(c, "direct")) },
    { type: "catch-up", label: "Streamers à rattraper", matches: catchUp.map((c) => toMatch(c, "catch-up")) },
    { type: "inspiration", label: "Inspirations", matches: inspiration.map((c) => toMatch(c, "inspiration")) },
  ];
}
