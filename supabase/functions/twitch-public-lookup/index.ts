// Twitch public channel lookup (no user OAuth required).
// Uses an App Access Token (client_credentials) to query Helix:
//   1. GET /users?login=...        (exact match)
//   2. GET /search/channels?query  (fallback fuzzy)
//
// Returns a normalized channel identity for the public teaser flow.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeLogin(raw: string): string | null {
  if (!raw) return null;
  let v = raw.trim().toLowerCase();
  if (!v) return null;
  if (v.startsWith("@")) v = v.slice(1);
  if (v.includes("twitch.tv") || v.startsWith("http")) {
    try {
      const withProto = v.startsWith("http") ? v : `https://${v}`;
      const url = new URL(withProto);
      const seg = url.pathname.split("/").filter(Boolean);
      if (seg.length > 0) v = seg[0];
    } catch {
      const idx = v.indexOf("twitch.tv/");
      if (idx >= 0) v = v.slice(idx + "twitch.tv/".length).split("/")[0];
    }
  }
  v = v.split("?")[0].split("#")[0].trim();
  return /^[a-z0-9_]{3,25}$/.test(v) ? v : null;
}

// Tiny in-memory app access token cache (per isolate).
let cachedAppToken: { token: string; expiresAt: number } | null = null;

async function getAppAccessToken(
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const now = Date.now();
  if (cachedAppToken && cachedAppToken.expiresAt - 60_000 > now) {
    return cachedAppToken.token;
  }
  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Twitch app token failed: ${res.status} ${txt}`);
  }
  const data = await res.json();
  cachedAppToken = {
    token: data.access_token,
    expiresAt: now + (data.expires_in ?? 3600) * 1000,
  };
  return cachedAppToken.token;
}

interface HelixUser {
  id: string;
  login: string;
  display_name: string;
  description?: string;
  profile_image_url?: string;
  broadcaster_type?: string;
  view_count?: number;
  created_at?: string;
}

interface HelixSearchChannel {
  id: string;
  broadcaster_login: string;
  display_name: string;
  thumbnail_url?: string;
  is_live?: boolean;
  game_name?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const clientId = Deno.env.get("TWITCH_CLIENT_ID");
    const clientSecret = Deno.env.get("TWITCH_CLIENT_SECRET");
    if (!clientId || !clientSecret) {
      return json({ error: "Twitch credentials not configured." }, 500);
    }

    let body: { input?: string } = {};
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body." }, 400);
    }
    const rawInput = (body.input ?? "").toString();
    const login = normalizeLogin(rawInput);
    if (!login) {
      return json({
        success: false,
        reason: "invalid_input",
        raw_input: rawInput,
      });
    }

    const token = await getAppAccessToken(clientId, clientSecret);
    const helixHeaders = {
      "Client-ID": clientId,
      Authorization: `Bearer ${token}`,
    };

    // 1) Exact match via /users?login=
    const usersRes = await fetch(
      `https://api.twitch.tv/helix/users?login=${encodeURIComponent(login)}`,
      { headers: helixHeaders },
    );
    if (usersRes.ok) {
      const usersJson = await usersRes.json();
      const u: HelixUser | undefined = usersJson?.data?.[0];
      if (u) {
        return json({
          success: true,
          source: "exact_get_users",
          login: u.login,
          channel: {
            id: u.id,
            login: u.login,
            display_name: u.display_name,
            description: u.description ?? "",
            profile_image_url: u.profile_image_url ?? "",
            broadcaster_type: u.broadcaster_type ?? "",
            view_count: u.view_count ?? 0,
            created_at: u.created_at ?? null,
          },
        });
      }
    } else {
      console.warn("get_users failed", usersRes.status, await usersRes.text());
    }

    // 2) Fallback: search channels (fuzzy), pick best login match
    const searchRes = await fetch(
      `https://api.twitch.tv/helix/search/channels?query=${encodeURIComponent(login)}&first=20`,
      { headers: helixHeaders },
    );
    if (searchRes.ok) {
      const searchJson = await searchRes.json();
      const results: HelixSearchChannel[] = searchJson?.data ?? [];
      const exact = results.find(
        (c) => c.broadcaster_login?.toLowerCase() === login,
      );
      const pick = exact ?? null;
      if (pick) {
        // Re-query /users by id to get full profile fields.
        const u2 = await fetch(
          `https://api.twitch.tv/helix/users?id=${encodeURIComponent(pick.id)}`,
          { headers: helixHeaders },
        );
        let full: HelixUser | undefined;
        if (u2.ok) {
          const j = await u2.json();
          full = j?.data?.[0];
        }
        return json({
          success: true,
          source: "search_channels",
          login: pick.broadcaster_login,
          channel: {
            id: pick.id,
            login: pick.broadcaster_login,
            display_name: pick.display_name,
            description: full?.description ?? "",
            profile_image_url:
              full?.profile_image_url ?? pick.thumbnail_url ?? "",
            broadcaster_type: full?.broadcaster_type ?? "",
            view_count: full?.view_count ?? 0,
            created_at: full?.created_at ?? null,
          },
        });
      }
    } else {
      console.warn(
        "search_channels failed",
        searchRes.status,
        await searchRes.text(),
      );
    }

    return json({
      success: false,
      reason: "not_found",
      searched_login: login,
    });
  } catch (e) {
    console.error("twitch-public-lookup error", e);
    return json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      500,
    );
  }
});
