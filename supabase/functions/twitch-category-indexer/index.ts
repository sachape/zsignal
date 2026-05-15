// Twitch category indexer (cron-protected, server-side only).
//
// Discovers public channels in selected Twitch categories and upserts them into
// public.channel_stream_scores so the StreamScore leaderboard has durable
// non-exhaustive coverage even when channels go offline.
//
// - Auth: requires CRON_SECRET via header `x-cron-secret` or body { secret }.
// - Sources: Twitch Helix /games (resolve), /streams (live discovery), /users (enrichment).
// - Persists: NO user_id, NO tokens, NO raw payloads, NO headers.
// - Score: conservative public-only StreamScore (Score Live formula), capped 0..100.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface CategoryReq { name: string; language?: string }
interface HelixStream {
  id: string; user_id: string; user_login: string; user_name: string;
  game_id: string; game_name: string; title: string;
  viewer_count: number; started_at: string; language: string;
}
interface HelixUser {
  id: string; login: string; display_name: string;
  profile_image_url?: string; broadcaster_type?: string; view_count?: number;
}

let cachedToken: { token: string; expiresAt: number } | null = null;
async function getAppToken(clientId: string, clientSecret: string): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt - 60_000 > now) return cachedToken.token;
  const r = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: "client_credentials" }),
  });
  if (!r.ok) throw new Error(`twitch_token_failed:${r.status}`);
  const d = await r.json();
  cachedToken = { token: d.access_token, expiresAt: now + (d.expires_in ?? 3600) * 1000 };
  return cachedToken.token;
}

/** Conservative public StreamScore (0..100), no private data. */
function computePublicScore(c: {
  viewer_count: number;
  broadcaster_type: string;
  view_count: number;
  started_at: string;
}): number {
  const v = c.viewer_count ?? 0;
  const liveScore = Math.min(60, Math.log10(v + 1) * 18);
  const statusScore = c.broadcaster_type === "partner" ? 20 : c.broadcaster_type === "affiliate" ? 12 : 0;
  const reachScore = Math.min(15, Math.log10((c.view_count ?? 0) + 1) * 2.5);
  let uptimeScore = 0;
  if (c.started_at) {
    const hours = (Date.now() - new Date(c.started_at).getTime()) / 3_600_000;
    uptimeScore = Math.min(5, hours);
  }
  return Math.max(0, Math.min(100, Math.round(liveScore + statusScore + reachScore + uptimeScore)));
}

function levelFromViewers(v: number): "low" | "medium" | "high" {
  if (v >= 200) return "high";
  if (v >= 30) return "medium";
  return "low";
}

async function helix<T>(url: string, headers: HeadersInit): Promise<T> {
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error(`helix_${r.status}`);
  return (await r.json()) as T;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, reason: "method_not_allowed" }, 405);

  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret) return json({ success: false, reason: "cron_secret_missing" }, 500);

  let body: { secret?: string; categories?: CategoryReq[]; limit?: number } = {};
  try { body = await req.json(); } catch { /* tolerate empty */ }

  const provided = req.headers.get("x-cron-secret") ?? body.secret ?? "";
  if (provided !== cronSecret) return json({ success: false, reason: "unauthorized" }, 401);

  const clientId = Deno.env.get("TWITCH_CLIENT_ID");
  const clientSecret = Deno.env.get("TWITCH_CLIENT_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!clientId || !clientSecret || !supabaseUrl || !serviceKey) {
    return json({ success: false, reason: "config_missing" }, 500);
  }

  const categories: CategoryReq[] = (body.categories && body.categories.length > 0)
    ? body.categories
    : [{ name: "Just Chatting", language: "fr" }, { name: "VALORANT", language: "fr" }];

  const perCategoryLimit = Math.min(Math.max(body.limit ?? 60, 1), 100);

  const token = await getAppToken(clientId, clientSecret);
  const helixHeaders: HeadersInit = {
    "Client-ID": clientId,
    Authorization: `Bearer ${token}`,
  };

  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const nowIso = new Date().toISOString();
  const summary: Array<{ category: string; language: string; resolved: boolean; live: number; upserted: number; error?: string }> = [];

  for (const cat of categories) {
    const lang = (cat.language || "all").toLowerCase();
    const entry = { category: cat.name, language: lang, resolved: false, live: 0, upserted: 0 } as typeof summary[number];
    try {
      const gj = await helix<{ data: { id: string; name: string }[] }>(
        `https://api.twitch.tv/helix/games?name=${encodeURIComponent(cat.name)}`,
        helixHeaders,
      );
      const game = gj.data?.[0];
      if (!game) { summary.push({ ...entry, error: "category_not_found" }); continue; }
      entry.resolved = true;

      const langParam = lang !== "all" ? `&language=${encodeURIComponent(lang)}` : "";
      const sj = await helix<{ data: HelixStream[] }>(
        `https://api.twitch.tv/helix/streams?game_id=${game.id}&first=${perCategoryLimit}${langParam}`,
        helixHeaders,
      );
      const streams = sj.data ?? [];
      entry.live = streams.length;
      if (streams.length === 0) { summary.push(entry); continue; }

      // Batch /users for broadcaster_type + avatar (max 100 ids per call)
      const userMap = new Map<string, HelixUser>();
      for (let i = 0; i < streams.length; i += 100) {
        const ids = streams.slice(i, i + 100).map((s) => `id=${s.user_id}`).join("&");
        const uj = await helix<{ data: HelixUser[] }>(
          `https://api.twitch.tv/helix/users?${ids}`,
          helixHeaders,
        );
        (uj.data ?? []).forEach((u) => userMap.set(u.id, u));
      }

      // Upsert one by one to respect the existing composite unique index
      // (platform, platform_user_id, game_name, COALESCE(language, '')).
      for (const s of streams) {
        const u = userMap.get(s.user_id);
        const broadcasterType = (u?.broadcaster_type ?? "") || "";
        const score = computePublicScore({
          viewer_count: s.viewer_count,
          broadcaster_type: broadcasterType,
          view_count: u?.view_count ?? 0,
          started_at: s.started_at,
        });
        const sigQual = levelFromViewers(s.viewer_count);
        // Confidence: lower because this is public-only signal.
        const confidence: "low" | "medium" | "high" =
          sigQual === "high" ? "medium" : "low";

        const row = {
          platform: "twitch",
          platform_user_id: s.user_id,
          login: s.user_login || u?.login || s.user_name?.toLowerCase() || s.user_id,
          display_name: s.user_name || u?.display_name || s.user_login || s.user_id,
          profile_image_url: u?.profile_image_url ?? null,
          broadcaster_type: broadcasterType,
          game_id: game.id,
          game_name: game.name,
          language: s.language ?? "",
          stream_score: score,
          confidence,
          signal_quality: sigQual,
          is_live: true,
          live_viewer_count: s.viewer_count,
          live_updated_at: nowIso,
          last_seen_live_at: nowIso,
          last_seen_in_category_at: nowIso,
          score_updated_at: nowIso,
          updated_at: nowIso,
          discovery_source: "twitch_category_indexer",
        };

        const { error: upErr } = await db
          .from("channel_stream_scores")
          .upsert(row, {
            onConflict: "platform,platform_user_id,game_name,language",
            ignoreDuplicates: false,
          });
        if (!upErr) entry.upserted += 1;
      }
      summary.push(entry);
    } catch (e) {
      summary.push({ ...entry, error: String((e as Error).message ?? e) });
    }
  }

  return json({ success: true, indexed_at: nowIso, summary });
});
