/**
 * Twitch URL detection — shared between landing flows and the VOD import page.
 * Supports both Twitch VODs and Twitch Clips (clips.twitch.tv + per-channel
 * /clip/ shorthand).
 */
export type TwitchUrlKind = "twitch_vod" | "twitch_clip";

export interface TwitchUrlInfo {
  kind: TwitchUrlKind;
  url: string;          // normalized canonical URL
  videoId?: string;     // for VODs
  slug?: string;        // for Clips
  channel?: string;     // for /<channel>/clip/<slug>
}

/**
 * Returns null when the URL is not a recognised Twitch VOD/Clip link.
 * Accepts both desktop and mobile shares.
 */
export function detectTwitchUrl(raw: string): TwitchUrlInfo | null {
  if (!raw) return null;
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const host = u.hostname.replace(/^www\./, "").replace(/^m\./, "");

  // clips.twitch.tv/<slug>
  if (host === "clips.twitch.tv") {
    const slug = u.pathname.replace(/^\//, "").split("/")[0];
    if (!slug || !/^[A-Za-z0-9_-]{4,}$/.test(slug)) return null;
    return {
      kind: "twitch_clip",
      url: `https://clips.twitch.tv/${slug}`,
      slug,
    };
  }

  // twitch.tv/<channel>/clip/<slug> or twitch.tv/videos/<id>
  if (host === "twitch.tv") {
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts[0] === "videos" && /^\d+$/.test(parts[1] ?? "")) {
      return {
        kind: "twitch_vod",
        url: `https://www.twitch.tv/videos/${parts[1]}`,
        videoId: parts[1],
      };
    }
    if (parts[1] === "clip" && parts[2] && /^[A-Za-z0-9_-]{4,}$/.test(parts[2])) {
      return {
        kind: "twitch_clip",
        url: `https://clips.twitch.tv/${parts[2]}`,
        slug: parts[2],
        channel: parts[0],
      };
    }
  }

  return null;
}
