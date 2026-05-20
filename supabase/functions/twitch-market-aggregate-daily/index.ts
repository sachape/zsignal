// Twitch Market Aggregate Daily — Phase B (Streamnco Market Index).
//
// - Cron-protected via CRON_SECRET or vault eventsub_cron_secret.
// - Aggregates twitch_stream_snapshots for a given UTC date and upserts
//   twitch_channel_daily_stats.
// - hours_streamed_estimated / estimated_hours_watched / avg_viewers are
//   computed using REAL gaps between distinct captured_at values
//   (captured_at_delta_weighted method). They are NOT official Twitch metrics.

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

// Interval constants — used ONLY as fallback / cap, never as primary multiplier.
const DEFAULT_SNAPSHOT_INTERVAL_MINUTES = Number(
  Deno.env.get("MARKET_DEFAULT_SNAPSHOT_INTERVAL_MINUTES") ?? 30,
);
const MAX_SNAPSHOT_INTERVAL_MINUTES = Number(
  Deno.env.get("MARKET_MAX_SNAPSHOT_INTERVAL_MINUTES") ?? 45,
);

interface Snapshot {
  broadcaster_id: string;
  broadcaster_login: string;
  game_id: string | null;
  game_name: string | null;
  language: string | null;
  viewer_count: number;
  captured_at: string;
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

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const t0 = Date.now();
  const logs: string[] = [];

  const cronSecret = Deno.env.get("CRON_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "missing_env" }, 500);

  let body: { secret?: string; date?: string } = {};
  try {
    if (req.method === "POST") body = await req.json().catch(() => ({}));
  } catch (_) { /* ignore */ }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const headerSecret = req.headers.get("x-cron-secret") ?? body.secret ?? "";
  const bearer = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  let authorized = false;
  if (cronSecret && headerSecret && headerSecret === cronSecret) authorized = true;
  if (!authorized && bearer) {
    const { data: ok } = await admin.rpc("verify_eventsub_cron_secret", { token: bearer });
    if (ok === true) authorized = true;
  }
  if (!authorized) return json({ error: "unauthorized" }, 401);

  const targetDate = body.date && validIsoDate(body.date) ? body.date : yesterdayUtcDate();
  const startMs = Date.parse(`${targetDate}T00:00:00.000Z`);
  const endMs = Date.parse(`${targetDate}T23:59:59.999Z`);
  const startIso = new Date(startMs).toISOString();
  const endIso = new Date(endMs).toISOString();
  // Hard cap: never extend beyond end of target UTC day.
  const dayEndMs = startMs + 24 * 60 * 60 * 1000;

  // Track run in monitoring table.
  const { data: runRow } = await admin
    .from("twitch_market_runs")
    .insert({
      run_type: "aggregate_daily",
      status: "running",
      started_at: new Date().toISOString(),
      metadata: {
        target_date: targetDate,
        aggregation_method: "captured_at_delta_weighted",
        default_interval_minutes: DEFAULT_SNAPSHOT_INTERVAL_MINUTES,
        max_interval_minutes: MAX_SNAPSHOT_INTERVAL_MINUTES,
      },
    })
    .select("id")
    .single();
  const runId = (runRow as { id: string } | null)?.id ?? null;

  // Page through snapshots.
  const all: Snapshot[] = [];
  const pageSize = 1000;
  let offset = 0;
  while (true) {
    const { data, error } = await admin
      .from("twitch_stream_snapshots")
      .select("broadcaster_id, broadcaster_login, game_id, game_name, language, viewer_count, captured_at")
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

  // Build distinct sorted captured_at timestamps for the day, then compute
  // contribution_minutes per distinct capture using real next-capture delta.
  const distinctTimesSet = new Set<number>();
  for (const s of all) distinctTimesSet.add(Date.parse(s.captured_at));
  const distinctTimes = [...distinctTimesSet].sort((a, b) => a - b);

  const observedIntervalsMin: number[] = [];
  for (let i = 0; i < distinctTimes.length - 1; i++) {
    const deltaMin = (distinctTimes[i + 1] - distinctTimes[i]) / 60000;
    if (deltaMin > 0 && deltaMin <= MAX_SNAPSHOT_INTERVAL_MINUTES) {
      observedIntervalsMin.push(deltaMin);
    }
  }
  const medianInterval = median(observedIntervalsMin);
  const fallbackIntervalMin = medianInterval ?? DEFAULT_SNAPSHOT_INTERVAL_MINUTES;
  const singleCaptureFallback = distinctTimes.length <= 1;

  let cappedIntervalsCount = 0;
  const contributionByTime = new Map<number, number>(); // minutes
  for (let i = 0; i < distinctTimes.length; i++) {
    const t = distinctTimes[i];
    let nextT: number;
    if (i < distinctTimes.length - 1) {
      nextT = distinctTimes[i + 1];
    } else {
      // Last capture: use fallback interval, bounded by end-of-day.
      nextT = t + fallbackIntervalMin * 60000;
    }
    if (nextT > dayEndMs) nextT = dayEndMs;
    let deltaMin = (nextT - t) / 60000;
    if (deltaMin <= 0) deltaMin = Math.min(fallbackIntervalMin, MAX_SNAPSHOT_INTERVAL_MINUTES);
    if (deltaMin > MAX_SNAPSHOT_INTERVAL_MINUTES) {
      cappedIntervalsCount += 1;
      deltaMin = MAX_SNAPSHOT_INTERVAL_MINUTES;
    }
    contributionByTime.set(t, deltaMin);
  }

  // Group by broadcaster, accumulating delta-weighted metrics.
  interface Acc {
    broadcaster_login: string;
    snapshotsCount: number;
    peak: number;
    min: number;
    sumViewers: number;
    sumHours: number;
    sumViewerHours: number;
    gameCounts: Map<string, { count: number; name: string | null }>;
    langCounts: Map<string, number>;
  }
  const groups = new Map<string, Acc>();
  for (const s of all) {
    let acc = groups.get(s.broadcaster_id);
    if (!acc) {
      acc = {
        broadcaster_login: s.broadcaster_login,
        snapshotsCount: 0,
        peak: 0,
        min: Number.POSITIVE_INFINITY,
        sumViewers: 0,
        sumHours: 0,
        sumViewerHours: 0,
        gameCounts: new Map(),
        langCounts: new Map(),
      };
      groups.set(s.broadcaster_id, acc);
    }
    const v = s.viewer_count ?? 0;
    const tMs = Date.parse(s.captured_at);
    const contribMin = contributionByTime.get(tMs) ?? fallbackIntervalMin;
    const contribH = contribMin / 60;

    acc.snapshotsCount += 1;
    acc.sumViewers += v;
    if (v > acc.peak) acc.peak = v;
    if (v < acc.min) acc.min = v;
    acc.sumHours += contribH;
    acc.sumViewerHours += v * contribH;

    if (s.game_id) {
      const g = acc.gameCounts.get(s.game_id);
      if (g) g.count += 1;
      else acc.gameCounts.set(s.game_id, { count: 1, name: s.game_name ?? null });
    }
    if (s.language) {
      acc.langCounts.set(s.language, (acc.langCounts.get(s.language) ?? 0) + 1);
    }
  }

  const rows: Array<Record<string, unknown>> = [];
  // Legacy comparison for logs only.
  let legacySumHoursStreamed = 0;
  let legacySumHoursWatched = 0;
  let newSumHoursStreamed = 0;
  let newSumHoursWatched = 0;
  const legacyIntervalH = DEFAULT_SNAPSHOT_INTERVAL_MINUTES / 60;

  for (const [broadcasterId, acc] of groups) {
    if (acc.snapshotsCount === 0) continue;
    const avg = acc.sumHours > 0
      ? acc.sumViewerHours / acc.sumHours
      : acc.sumViewers / acc.snapshotsCount;

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

    legacySumHoursStreamed += acc.snapshotsCount * legacyIntervalH;
    legacySumHoursWatched += acc.sumViewers * legacyIntervalH;
    newSumHoursStreamed += acc.sumHours;
    newSumHoursWatched += acc.sumViewerHours;

    rows.push({
      date: targetDate,
      broadcaster_id: broadcasterId,
      broadcaster_login: acc.broadcaster_login,
      dominant_game_id: dominantGameId,
      dominant_game_name: dominantGameName,
      dominant_language: dominantLang,
      avg_viewers: avg,
      peak_viewers: acc.peak,
      min_viewers: acc.min === Number.POSITIVE_INFINITY ? 0 : acc.min,
      hours_streamed_estimated: acc.sumHours,
      estimated_hours_watched: acc.sumViewerHours,
      snapshots_count: acc.snapshotsCount,
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
    aggregation_method: "captured_at_delta_weighted",
    default_interval_minutes: DEFAULT_SNAPSHOT_INTERVAL_MINUTES,
    max_interval_minutes: MAX_SNAPSHOT_INTERVAL_MINUTES,
    distinct_capture_times: distinctTimes.length,
    median_observed_interval_minutes: medianInterval,
    capped_intervals_count: cappedIntervalsCount,
    single_capture_fallback_used: singleCaptureFallback,
    snapshots_read: all.length,
    channels_aggregated: groups.size,
    daily_stats_upserted: upserted,
    legacy_vs_new: {
      legacy_hours_streamed_total: legacySumHoursStreamed,
      new_hours_streamed_total: newSumHoursStreamed,
      legacy_hours_watched_total: legacySumHoursWatched,
      new_hours_watched_total: newSumHoursWatched,
    },
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
