// Twitch Market Aggregate Daily — Phase B (Streamnco Market Index).
//
// - Cron-protected via CRON_SECRET.
// - Aggregates twitch_stream_snapshots for a given UTC date (default: yesterday)
//   and upserts twitch_channel_daily_stats.
// - hours_streamed_estimated and estimated_hours_watched are SNAPSHOT-BASED
//   estimations. They are NOT official Twitch metrics.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Snapshot cron interval, in minutes. Drives hours_streamed_estimated.
// Keep in sync with the actual cron schedule of twitch-market-snapshot.
const SNAPSHOT_INTERVAL_MINUTES = 30;

interface Snapshot {
  broadcaster_id: string;
  broadcaster_login: string;
  game_id: string | null;
  game_name: string | null;
  language: string | null;
  viewer_count: number;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function yesterdayUtcDate(): string {
  const now = new Date();
  const y = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
  return isoDate(y);
}

function validIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(`${s}T00:00:00Z`).getTime());
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const t0 = Date.now();
  const logs: string[] = [];

  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret) return json({ error: "missing_cron_secret_env" }, 500);

  let body: { secret?: string; date?: string } = {};
  try {
    if (req.method === "POST") body = await req.json().catch(() => ({}));
  } catch (_) { /* ignore */ }

  const provided = req.headers.get("x-cron-secret") ?? body.secret ?? "";
  if (provided !== cronSecret) return json({ error: "unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "missing_env" }, 500);

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const targetDate = body.date && validIsoDate(body.date) ? body.date : yesterdayUtcDate();
  const startIso = `${targetDate}T00:00:00.000Z`;
  const endIso = `${targetDate}T23:59:59.999Z`;

  // Track run in monitoring table.
  const { data: runRow } = await admin
    .from("twitch_market_runs")
    .insert({
      run_type: "aggregate_daily",
      status: "running",
      started_at: new Date().toISOString(),
      metadata: { target_date: targetDate, interval_minutes: SNAPSHOT_INTERVAL_MINUTES },
    })
    .select("id")
    .single();
  const runId = (runRow as { id: string } | null)?.id ?? null;

  // Page through snapshots (PostgREST default cap 1000 rows per query).
  const all: Snapshot[] = [];
  const pageSize = 1000;
  let offset = 0;
  while (true) {
    const { data, error } = await admin
      .from("twitch_stream_snapshots")
      .select("broadcaster_id, broadcaster_login, game_id, game_name, language, viewer_count")
      .gte("captured_at", startIso)
      .lte("captured_at", endIso)
      .order("captured_at", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) {
      logs.push(`read_snapshots_failed ${error.message}`);
      break;
    }
    const rows = (data ?? []) as Snapshot[];
    all.push(...rows);
    if (rows.length < pageSize) break;
    offset += pageSize;
  }

  // Group by broadcaster_id.
  interface Acc {
    broadcaster_login: string;
    viewers: number[];
    sumViewers: number;
    gameCounts: Map<string, { count: number; name: string | null }>;
    langCounts: Map<string, number>;
  }
  const groups = new Map<string, Acc>();
  for (const s of all) {
    let acc = groups.get(s.broadcaster_id);
    if (!acc) {
      acc = {
        broadcaster_login: s.broadcaster_login,
        viewers: [],
        sumViewers: 0,
        gameCounts: new Map(),
        langCounts: new Map(),
      };
      groups.set(s.broadcaster_id, acc);
    }
    const v = s.viewer_count ?? 0;
    acc.viewers.push(v);
    acc.sumViewers += v;
    if (s.game_id) {
      const g = acc.gameCounts.get(s.game_id);
      if (g) g.count += 1;
      else acc.gameCounts.set(s.game_id, { count: 1, name: s.game_name ?? null });
    }
    if (s.language) {
      acc.langCounts.set(s.language, (acc.langCounts.get(s.language) ?? 0) + 1);
    }
  }

  const intervalH = SNAPSHOT_INTERVAL_MINUTES / 60;

  const rows: Array<Record<string, unknown>> = [];
  for (const [broadcasterId, acc] of groups) {
    const count = acc.viewers.length;
    if (count === 0) continue;
    const peak = acc.viewers.reduce((a, b) => Math.max(a, b), 0);
    const min = acc.viewers.reduce((a, b) => Math.min(a, b), Number.POSITIVE_INFINITY);
    const avg = acc.sumViewers / count;
    const hoursStreamed = count * intervalH;
    const hoursWatched = acc.sumViewers * intervalH;

    let dominantGameId: string | null = null;
    let dominantGameName: string | null = null;
    let bestGame = 0;
    for (const [gid, info] of acc.gameCounts) {
      if (info.count > bestGame) {
        bestGame = info.count;
        dominantGameId = gid;
        dominantGameName = info.name;
      }
    }
    let dominantLang: string | null = null;
    let bestLang = 0;
    for (const [lg, c] of acc.langCounts) {
      if (c > bestLang) { bestLang = c; dominantLang = lg; }
    }

    rows.push({
      date: targetDate,
      broadcaster_id: broadcasterId,
      broadcaster_login: acc.broadcaster_login,
      dominant_game_id: dominantGameId,
      dominant_game_name: dominantGameName,
      dominant_language: dominantLang,
      avg_viewers: avg,
      peak_viewers: peak,
      min_viewers: min === Number.POSITIVE_INFINITY ? 0 : min,
      hours_streamed_estimated: hoursStreamed,
      estimated_hours_watched: hoursWatched,
      snapshots_count: count,
      updated_at: new Date().toISOString(),
    });
  }

  let upserted = 0;
  if (rows.length > 0) {
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const { error, count } = await admin
        .from("twitch_channel_daily_stats")
        .upsert(chunk, { onConflict: "date,broadcaster_id", count: "exact" });
      if (error) logs.push(`daily_stats_upsert_failed ${error.message}`);
      else upserted += count ?? chunk.length;
    }
  }

  const durationMs = Date.now() - t0;
  const summary = {
    ok: true,
    target_date: targetDate,
    interval_minutes: SNAPSHOT_INTERVAL_MINUTES,
    snapshots_read: all.length,
    channels_aggregated: groups.size,
    daily_stats_upserted: upserted,
    duration_ms: durationMs,
    logs,
  };

  if (runId) {
    await admin
      .from("twitch_market_runs")
      .update({
        finished_at: new Date().toISOString(),
        status: logs.length > 0 ? "completed_with_warnings" : "completed",
        daily_stats_upserted: upserted,
        metadata: { ...summary, run_id: runId },
      })
      .eq("id", runId);
  }

  console.log(JSON.stringify({ event: "twitch_market_aggregate_daily_done", ...summary }));
  return json(summary, 200);
});
