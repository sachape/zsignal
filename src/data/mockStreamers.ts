import type { MockStreamerData } from "@/types/analysis";

// Helper: generate dates relative to now
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

/**
 * Profile 1: Petit_Loup_TV
 * Small streamer struggling with consistency.
 * Irregular schedule, few clips, far from affiliate.
 */
export const petitLoup: MockStreamerData = {
  profile: {
    id: "mock-p1",
    user_id: "mock-user-1",
    twitch_user_id: "111111",
    login: "petit_loup_tv",
    display_name: "Petit_Loup_TV",
    description: "Petit stream entre potes, on chill.",
    profile_image_url: "",
    view_count: 320,
    follower_count: 38,
    broadcaster_type: "",
    created_at_twitch: "2024-06-15T00:00:00Z",
    fetched_at: daysAgo(0),
  },
  videos: [
    { id: "v1-1", twitch_video_id: "tv1001", title: "Valorant ranked chill", view_count: 8, duration: "1h45m", created_at: daysAgo(2), stream_id: "s1", language: "fr", type: "archive" },
    { id: "v1-2", twitch_video_id: "tv1002", title: "Fortnite avec les gars", view_count: 5, duration: "2h10m", created_at: daysAgo(8), stream_id: "s2", language: "fr", type: "archive" },
    { id: "v1-3", twitch_video_id: "tv1003", title: "Minecraft relax", view_count: 3, duration: "0h55m", created_at: daysAgo(15), stream_id: "s3", language: "fr", type: "archive" },
    { id: "v1-4", twitch_video_id: "tv1004", title: "Valorant tryhard", view_count: 6, duration: "1h20m", created_at: daysAgo(22), stream_id: "s4", language: "fr", type: "archive" },
  ],
  clips: [
    { id: "c1-1", twitch_clip_id: "cl1001", title: "Clutch 1v3", view_count: 15, creator_name: "buddy1", created_at: daysAgo(3), duration: 28, game_id: "val" },
  ],
};

/**
 * Profile 2: NexaGaming
 * Close to affiliate. Decent regularity but needs viewer push.
 */
export const nexaGaming: MockStreamerData = {
  profile: {
    id: "mock-p2",
    user_id: "mock-user-2",
    twitch_user_id: "222222",
    login: "nexagaming",
    display_name: "NexaGaming",
    description: "Streamer FR League of Legends & co. Road to affiliate !",
    profile_image_url: "",
    view_count: 2800,
    follower_count: 46,
    broadcaster_type: "",
    created_at_twitch: "2024-01-10T00:00:00Z",
    fetched_at: daysAgo(0),
  },
  videos: [
    { id: "v2-1", twitch_video_id: "tv2001", title: "[FR] LoL Ranked Gold → Plat", view_count: 22, duration: "3h15m", created_at: daysAgo(1), stream_id: "s21", language: "fr", type: "archive" },
    { id: "v2-2", twitch_video_id: "tv2002", title: "[FR] LoL Ranked grind", view_count: 18, duration: "2h50m", created_at: daysAgo(3), stream_id: "s22", language: "fr", type: "archive" },
    { id: "v2-3", twitch_video_id: "tv2003", title: "[FR] LoL Clash avec l'équipe", view_count: 35, duration: "4h05m", created_at: daysAgo(5), stream_id: "s23", language: "fr", type: "archive" },
    { id: "v2-4", twitch_video_id: "tv2004", title: "[FR] LoL Ranked", view_count: 20, duration: "3h00m", created_at: daysAgo(7), stream_id: "s24", language: "fr", type: "archive" },
    { id: "v2-5", twitch_video_id: "tv2005", title: "[FR] LoL ARAM fun", view_count: 15, duration: "2h20m", created_at: daysAgo(9), stream_id: "s25", language: "fr", type: "archive" },
    { id: "v2-6", twitch_video_id: "tv2006", title: "[FR] LoL Ranked", view_count: 19, duration: "3h30m", created_at: daysAgo(12), stream_id: "s26", language: "fr", type: "archive" },
    { id: "v2-7", twitch_video_id: "tv2007", title: "[FR] LoL Duo ranked", view_count: 25, duration: "3h10m", created_at: daysAgo(14), stream_id: "s27", language: "fr", type: "archive" },
    { id: "v2-8", twitch_video_id: "tv2008", title: "[FR] LoL Ranked", view_count: 17, duration: "2h45m", created_at: daysAgo(17), stream_id: "s28", language: "fr", type: "archive" },
    { id: "v2-9", twitch_video_id: "tv2009", title: "[FR] LoL Ranked Gold", view_count: 21, duration: "3h00m", created_at: daysAgo(20), stream_id: "s29", language: "fr", type: "archive" },
    { id: "v2-10", twitch_video_id: "tv2010", title: "[FR] LoL chill", view_count: 14, duration: "2h30m", created_at: daysAgo(23), stream_id: "s210", language: "fr", type: "archive" },
    { id: "v2-11", twitch_video_id: "tv2011", title: "[FR] LoL Ranked", view_count: 16, duration: "2h55m", created_at: daysAgo(26), stream_id: "s211", language: "fr", type: "archive" },
    { id: "v2-12", twitch_video_id: "tv2012", title: "[FR] LoL Ranked smurf", view_count: 12, duration: "2h00m", created_at: daysAgo(29), stream_id: "s212", language: "fr", type: "archive" },
  ],
  clips: [
    { id: "c2-1", twitch_clip_id: "cl2001", title: "Pentakill Jinx", view_count: 120, creator_name: "fan1", created_at: daysAgo(4), duration: 30, game_id: "lol" },
    { id: "c2-2", twitch_clip_id: "cl2002", title: "Baron steal", view_count: 85, creator_name: "fan2", created_at: daysAgo(10), duration: 25, game_id: "lol" },
    { id: "c2-3", twitch_clip_id: "cl2003", title: "Outplay 1v2", view_count: 45, creator_name: "nexagaming", created_at: daysAgo(18), duration: 20, game_id: "lol" },
  ],
};

/**
 * Profile 3: PixelCraft_FR
 * Good content quality, decent production, but weak positioning.
 * Switches categories too often, no clear identity.
 */
export const pixelCraft: MockStreamerData = {
  profile: {
    id: "mock-p3",
    user_id: "mock-user-3",
    twitch_user_id: "333333",
    login: "pixelcraft_fr",
    display_name: "PixelCraft_FR",
    description: "Création de contenu gaming & lifestyle. On explore tout !",
    profile_image_url: "",
    view_count: 4500,
    follower_count: 85,
    broadcaster_type: "affiliate",
    created_at_twitch: "2023-09-01T00:00:00Z",
    fetched_at: daysAgo(0),
  },
  videos: [
    { id: "v3-1", twitch_video_id: "tv3001", title: "Stardew Valley détente", view_count: 30, duration: "2h30m", created_at: daysAgo(1), stream_id: "s31", language: "fr", type: "archive" },
    { id: "v3-2", twitch_video_id: "tv3002", title: "Lethal Company terreur", view_count: 42, duration: "3h10m", created_at: daysAgo(3), stream_id: "s32", language: "fr", type: "archive" },
    { id: "v3-3", twitch_video_id: "tv3003", title: "IRL cuisine + chat", view_count: 55, duration: "2h00m", created_at: daysAgo(5), stream_id: "s33", language: "fr", type: "archive" },
    { id: "v3-4", twitch_video_id: "tv3004", title: "Valorant ranked", view_count: 25, duration: "3h45m", created_at: daysAgo(7), stream_id: "s34", language: "fr", type: "archive" },
    { id: "v3-5", twitch_video_id: "tv3005", title: "Palworld découverte", view_count: 60, duration: "4h00m", created_at: daysAgo(9), stream_id: "s35", language: "fr", type: "archive" },
    { id: "v3-6", twitch_video_id: "tv3006", title: "Just Chatting chill", view_count: 38, duration: "1h45m", created_at: daysAgo(12), stream_id: "s36", language: "fr", type: "archive" },
    { id: "v3-7", twitch_video_id: "tv3007", title: "Minecraft build challenge", view_count: 28, duration: "3h20m", created_at: daysAgo(15), stream_id: "s37", language: "fr", type: "archive" },
    { id: "v3-8", twitch_video_id: "tv3008", title: "Apex Legends ranked", view_count: 20, duration: "2h50m", created_at: daysAgo(18), stream_id: "s38", language: "fr", type: "archive" },
  ],
  clips: [
    { id: "c3-1", twitch_clip_id: "cl3001", title: "Réaction épique Lethal Company", view_count: 250, creator_name: "viewer42", created_at: daysAgo(4), duration: 30, game_id: "lc" },
    { id: "c3-2", twitch_clip_id: "cl3002", title: "Build incroyable Minecraft", view_count: 180, creator_name: "pixelcraft_fr", created_at: daysAgo(16), duration: 45, game_id: "mc" },
    { id: "c3-3", twitch_clip_id: "cl3003", title: "Ace clutch Valorant", view_count: 95, creator_name: "fan99", created_at: daysAgo(8), duration: 22, game_id: "val" },
    { id: "c3-4", twitch_clip_id: "cl3004", title: "Moment IRL hilarant", view_count: 310, creator_name: "viewer7", created_at: daysAgo(6), duration: 18, game_id: "irl" },
  ],
};

export const allMockStreamers = {
  petit_loup_tv: petitLoup,
  nexagaming: nexaGaming,
  pixelcraft_fr: pixelCraft,
} as const;

export type MockStreamerKey = keyof typeof allMockStreamers;
