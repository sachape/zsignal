// Streamnco — Twitch URL detection helper.
// Supports:
//   - VOD:  https://www.twitch.tv/videos/123456789
//   - VOD:  https://twitch.tv/videos/123456789
//   - Clip: https://clips.twitch.tv/<slug>
//   - Clip: https://(www.)twitch.tv/<channel>/clip/<slug>?...
// Query params (?filter=…&range=…) and trailing slashes are ignored.

export type TwitchUrlKind = "twitch_vod" | "twitch_clip";

export interface TwitchUrlInfo {
  kind: TwitchUrlKind | null;
  normalizedUrl: string | null;
  clipSlug?: string;
  vodId?: string;
}

export function detectTwitchUrl(raw: string): TwitchUrlInfo {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return { kind: null, normalizedUrl: null };

  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    return { kind: null, normalizedUrl: null };
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") {
    return { kind: null, normalizedUrl: null };
  }

  const host = u.hostname.replace(/^www\./, "");

  // clips.twitch.tv/<slug>
  if (host === "clips.twitch.tv") {
    const slug = u.pathname.replace(/^\//, "").split("/")[0];
    if (slug && /^[A-Za-z0-9_-]+$/.test(slug)) {
      return {
        kind: "twitch_clip",
        normalizedUrl: `https://clips.twitch.tv/${slug}`,
        clipSlug: slug,
      };
    }
    return { kind: null, normalizedUrl: null };
  }

  if (host === "twitch.tv" || host === "m.twitch.tv") {
    // /videos/<id>
    const vodMatch = u.pathname.match(/^\/videos\/(\d+)/);
    if (vodMatch) {
      return {
        kind: "twitch_vod",
        normalizedUrl: `https://www.twitch.tv/videos/${vodMatch[1]}`,
        vodId: vodMatch[1],
      };
    }
    // /<channel>/clip/<slug>
    const clipMatch = u.pathname.match(/^\/[^/]+\/clip\/([A-Za-z0-9_-]+)/);
    if (clipMatch) {
      return {
        kind: "twitch_clip",
        normalizedUrl: `https://clips.twitch.tv/${clipMatch[1]}`,
        clipSlug: clipMatch[1],
      };
    }
  }

  return { kind: null, normalizedUrl: null };
}

export function isTwitchClipUrl(raw: string): boolean {
  return detectTwitchUrl(raw).kind === "twitch_clip";
}

export function isTwitchVodUrl(raw: string): boolean {
  return detectTwitchUrl(raw).kind === "twitch_vod";
}
