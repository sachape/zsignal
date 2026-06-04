// Twitch VOD helpers — shared between live-detect (inline) and
// twitch-fetch-last-vod (HTTP retry endpoint).

// deno-lint-ignore no-explicit-any
type AdminClient = any;

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getTwitchAppToken(
  clientId: string,
  clientSecret: string,
): Promise<string | null> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt - 60_000 > now) return cachedToken.token;
  try {
    const res = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials",
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    cachedToken = { token: data.access_token, expiresAt: now + (data.expires_in ?? 3600) * 1000 };
    return cachedToken.token;
  } catch {
    return null;
  }
}

interface HelixVideo {
  id: string;
  user_id: string;
  url: string;
  title: string;
  created_at: string;
  duration: string;
  thumbnail_url: string;
}

/**
 * Find the archive VOD whose started_at is closest to the session's started_at
 * (±10 min) and attach its URL to every clip candidate of the session.
 */
export async function attachVodToSession(
  admin: AdminClient,
  sessionId: string,
  twitchHeaders: Record<string, string>,
): Promise<{ vod_url: string | null; reason: string }> {
  const { data: session } = await admin
    .from("live_sessions")
    .select("id, started_at, platform_user_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session?.platform_user_id) return { vod_url: null, reason: "no_session" };

  try {
    const res = await fetch(
      `https://api.twitch.tv/helix/videos?user_id=${encodeURIComponent(session.platform_user_id)}&type=archive&first=5`,
      { headers: twitchHeaders },
    );
    if (!res.ok) return { vod_url: null, reason: `helix_${res.status}` };
    const data = await res.json();
    const videos = (data?.data ?? []) as HelixVideo[];
    if (videos.length === 0) return { vod_url: null, reason: "no_vods" };

    const sessionStart = new Date(session.started_at).getTime();
    let best: HelixVideo | null = null;
    let bestDelta = Infinity;
    for (const v of videos) {
      const t = new Date(v.created_at).getTime();
      const delta = Math.abs(t - sessionStart);
      if (delta < bestDelta) {
        bestDelta = delta;
        best = v;
      }
    }
    if (!best || bestDelta > 10 * 60 * 1000) {
      return { vod_url: null, reason: "no_match" };
    }

    await admin
      .from("creator_content_items")
      .update({ source_video_url: best.url })
      .eq("live_session_id", sessionId)
      .is("source_video_url", null);

    return { vod_url: best.url, reason: "matched" };
  } catch (err) {
    console.error("[twitchVod] helix error", err);
    return { vod_url: null, reason: "fetch_error" };
  }
}
