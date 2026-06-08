/**
 * outreach-scraper.ts
 * Fetch Twitch streamers for a game via Clips + VODs + Live Streams
 * and output logins ready to paste into the outreach tool's Manuel tab.
 *
 * Usage:
 *   bun outreach-scraper.ts --game "VALORANT" --lang fr --limit 2000
 *   bun outreach-scraper.ts --game "Just Chatting" --lang all --limit 5000 --days 90
 *
 * Env required (create .env.local next to this file):
 *   TWITCH_CLIENT_ID=xxxxx
 *   TWITCH_CLIENT_SECRET=xxxxx
 */

import { writeFileSync, existsSync } from "fs";
import { resolve } from "path";

// ── Load .env.local ───────────────────────────────────────────────────────────
const envPath = resolve(import.meta.dir, ".env.local");
if (existsSync(envPath)) {
  const content = await Bun.file(envPath).text();
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (key && val) process.env[key] = val;
  }
}

// ── Args ─────────────────────────────────────────────────────────────────────
function arg(name: string, def: string): string {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? process.argv[idx + 1] ?? def : def;
}

const GAME   = arg("game",  "VALORANT");
const LANG   = arg("lang",  "fr");       // "fr" | "en" | "all"
const LIMIT  = parseInt(arg("limit", "2000"));
const DAYS   = parseInt(arg("days",  "30"));
const OUTPUT = arg("output", "logins.txt");

const CLIENT_ID     = process.env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(`
❌  Credentials manquants.

Crée le fichier .env.local à côté de ce script :
  TWITCH_CLIENT_ID=ton_client_id
  TWITCH_CLIENT_SECRET=ton_client_secret

→ Récupère-les sur : https://dev.twitch.tv/console/apps
  (ou dans les secrets de ta Supabase Edge Function)
`);
  process.exit(1);
}

// ── Twitch API helpers ────────────────────────────────────────────────────────
let _token: string | null = null;

async function getToken(): Promise<string> {
  if (_token) return _token;
  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID!,
      client_secret: CLIENT_SECRET!,
      grant_type: "client_credentials",
    }),
  });
  if (!res.ok) throw new Error(`Token failed: ${res.status}`);
  const data = await res.json();
  _token = data.access_token;
  return _token!;
}

async function helix(path: string): Promise<any> {
  const token = await getToken();
  const res = await fetch(`https://api.twitch.tv/helix/${path}`, {
    headers: {
      "Client-ID": CLIENT_ID!,
      "Authorization": `Bearer ${token}`,
    },
  });
  if (res.status === 429) {
    const resetAt = parseInt(res.headers.get("Ratelimit-Reset") ?? "0") * 1000;
    const wait = Math.max(0, resetAt - Date.now()) + 500;
    console.log(`  ⏳ Rate limited — attente ${(wait / 1000).toFixed(1)}s`);
    await new Promise(r => setTimeout(r, wait));
    return helix(path);
  }
  if (!res.ok) throw new Error(`Helix ${path} → ${res.status}`);
  return res.json();
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ── Resolve game ID ───────────────────────────────────────────────────────────
async function getGameId(name: string): Promise<{ id: string; name: string }> {
  const data = await helix(`games?name=${encodeURIComponent(name)}`);
  const game = data?.data?.[0];
  if (!game) throw new Error(`Jeu introuvable : "${name}"`);
  return { id: game.id, name: game.name };
}

// ── Source 1: Live streams ────────────────────────────────────────────────────
async function fetchLiveStreams(gameId: string, lang: string, maxPages = 10): Promise<Set<string>> {
  const ids = new Set<string>();
  let cursor: string | null = null;
  let page = 0;
  const langParam = lang !== "all" ? `&language=${encodeURIComponent(lang)}` : "";

  process.stdout.write(`  📡 Streams live${lang !== "all" ? ` (${lang})` : ""}`);
  while (page < maxPages) {
    const afterParam = cursor ? `&after=${cursor}` : "";
    const data = await helix(`streams?game_id=${gameId}&first=100${langParam}${afterParam}`);
    const streams = data?.data ?? [];
    for (const s of streams) if (s.user_id) ids.add(s.user_id);
    cursor = data?.pagination?.cursor ?? null;
    process.stdout.write(` ·${streams.length}`);
    page++;
    if (!cursor) break; // continue even if page < 100 — Twitch sometimes returns fewer
    await sleep(200);
  }
  console.log(` → ${ids.size} IDs`);
  return ids;
}

// ── Source 2: Top clips (broad time window) ───────────────────────────────────
async function fetchClips(gameId: string, days: number, maxPages = 20): Promise<Set<string>> {
  const ids = new Set<string>();
  const startedAt = new Date(Date.now() - days * 86400_000).toISOString();
  let cursor: string | null = null;
  let page = 0;

  process.stdout.write(`  🎬 Clips (${days}j)`);
  while (page < maxPages) {
    const afterParam = cursor ? `&after=${cursor}` : "";
    const data = await helix(
      `clips?game_id=${gameId}&first=100&started_at=${encodeURIComponent(startedAt)}${afterParam}`
    );
    const clips = data?.data ?? [];
    for (const c of clips) if (c.broadcaster_id) ids.add(c.broadcaster_id);
    cursor = data?.pagination?.cursor ?? null;
    process.stdout.write(` ·${clips.length}`);
    page++;
    if (!cursor) break; // continue even if page < 100
    await sleep(200);
  }
  console.log(` → ${ids.size} IDs uniques`);
  return ids;
}

// ── Source 3: Filter clip IDs by channel language ────────────────────────────
// /helix/channels returns broadcaster_language even for offline streamers.
// Much more reliable than checking current streams.
async function filterByLanguage(clipIds: Set<string>, liveIds: Set<string>, lang: string): Promise<Set<string>> {
  if (lang === "all") return new Set([...liveIds, ...clipIds]);

  const confirmed = new Set<string>(liveIds); // already language-filtered via streams
  const toCheck = [...clipIds].filter(id => !liveIds.has(id));
  if (!toCheck.length) { console.log(`  🔍 Aucun clip ID à vérifier`); return confirmed; }

  process.stdout.write(`  🔍 Langue via /channels (${toCheck.length} IDs)`);

  // /helix/channels?broadcaster_id=X&broadcaster_id=Y — works offline, returns broadcaster_language
  for (let i = 0; i < toCheck.length; i += 100) {
    const batch = toCheck.slice(i, i + 100);
    const qs = batch.map(id => `broadcaster_id=${id}`).join("&");
    try {
      const data = await helix(`channels?${qs}`);
      const channels = data?.data ?? [];
      for (const ch of channels) {
        if (ch.broadcaster_language === lang) confirmed.add(ch.broadcaster_id);
      }
    } catch { /* ignore */ }
    process.stdout.write(` ·${Math.round(Math.min((i + 100) / toCheck.length, 1) * 100)}%`);
    await sleep(150);
  }
  console.log(` → ${confirmed.size} IDs langue ${lang}`);
  return confirmed;
}

// ── Batch fetch user info (100 per request) ───────────────────────────────────
interface TwitchUser {
  id: string;
  login: string;
  display_name: string;
  broadcaster_type: string;
  description: string;
  language?: string;
}

async function batchFetchUsers(ids: string[]): Promise<TwitchUser[]> {
  const users: TwitchUser[] = [];
  const total = ids.length;
  let done = 0;

  process.stdout.write(`  👤 Enrichissement (${total} IDs)`);
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100);
    const qs = batch.map(id => `id=${id}`).join("&");
    const data = await helix(`users?${qs}`);
    users.push(...(data?.data ?? []));
    done += batch.length;
    process.stdout.write(` ·${Math.round((done / total) * 100)}%`);
    await sleep(150);
  }
  console.log(` → ${users.length} profils`);
  return users;
}

// ── Filter by language ────────────────────────────────────────────────────────
// Note: Twitch /helix/users doesn't return a language field.
// We fetch the stream language via /helix/streams for live users,
// and fall back to bio keyword detection for offline users.
// When lang="all", no filtering is applied.
function scoreFrench(desc: string): boolean {
  if (!desc) return false;
  const lower = desc.toLowerCase();
  const strong = ["🇫🇷", "français", "francais", "streamer fr", "stream fr", " fr ", "(fr)", "[fr]", "fr🎮", "🎮fr", "je stream", "j'stream", "je suis", "ma chaîne", "chaque semaine", "tous les jours", "chaque jour", "gaming fr", "stream francais"];
  if (strong.some(s => lower.includes(s))) return true;
  // French sentence structure: needs 4+ common french words
  const medium = [" je ", " et ", " sur ", " avec ", " pour ", " mon ", " ma ", " les ", " des ", " une ", " ce ", " qui ", " pas ", " mais ", " aussi ", " dans "];
  return medium.filter(w => lower.includes(w)).length >= 4;
}

function matchesLanguage(user: TwitchUser, lang: string): boolean {
  if (lang === "all") return true;
  if (lang === "fr") return scoreFrench(user.description);
  return true;
}

// ── Main ─────────────────────────────────────────────────────────────────────
console.log(`\n🎯 Outreach Scraper — ${GAME} | lang:${LANG} | limit:${LIMIT} | days:${DAYS}\n`);

// 1. Resolve game
process.stdout.write(`🔍 Résolution du jeu "${GAME}"… `);
const game = await getGameId(GAME);
console.log(`✅ ${game.name} (id: ${game.id})\n`);

// 2. Fetch from all sources in sequence (to respect rate limits)
console.log("📦 Collecte des IDs :");
const liveIds  = await fetchLiveStreams(game.id, LANG, 10);
const clipIds  = await fetchClips(game.id, DAYS, 20);

// 3. Filter clip IDs by language (streams API supports language filter)
const langFilteredIds = await filterByLanguage(clipIds, liveIds, LANG);

// 4. Merge all IDs
const allIds = new Set([...liveIds, ...langFilteredIds]);
console.log(`\n✅ ${allIds.size} IDs uniques collectés`);

// 4. Batch fetch user profiles
const idsArray = [...allIds];
console.log(`\n📋 Enrichissement des profils :`);
const users = await batchFetchUsers(idsArray);

// 5. No additional bio filter needed — language already filtered via Twitch API
const filtered = users;

console.log(`\n🌍 Après filtre langue (${LANG}) : ${filtered.length} streamers`);

// 6. Deduplicate + sort by broadcaster_type (partners first, then affiliates, then none)
const typeOrder: Record<string, number> = { partner: 0, affiliate: 1, "": 2 };
const sorted = filtered
  .filter((u, i, arr) => arr.findIndex(x => x.login === u.login) === i)
  .sort((a, b) => (typeOrder[a.broadcaster_type] ?? 2) - (typeOrder[b.broadcaster_type] ?? 2));

// 7. Apply limit
const final = sorted.slice(0, LIMIT);

// 8. Output logins.txt
const logins = final.map(u => u.login).join("\n");
writeFileSync(OUTPUT, logins, "utf-8");

// 9. Summary
const partners  = final.filter(u => u.broadcaster_type === "partner").length;
const affiliates= final.filter(u => u.broadcaster_type === "affiliate").length;
const none      = final.filter(u => !u.broadcaster_type).length;

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅  ${final.length} streamers exportés → ${OUTPUT}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🏆 Partenaires  : ${partners}
  ⭐ Affiliés     : ${affiliates}
  🌱 Non affiliés : ${none}
  🌍 Langue       : ${LANG}
  📅 Fenêtre clips: ${DAYS} jours

→ Copie le contenu de ${OUTPUT} dans l'onglet Manuel
  de l'outil outreach pour les analyser.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
