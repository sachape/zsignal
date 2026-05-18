// Weekly action outcomes evaluator (MVP).
//
// Observational only — never claims causality.
// Scope (3 signal families):
//  - consistency  → live_sessions
//  - content      → twitch_clip_snapshots
//  - positioning  → channel_update_history
//
// Reads `weekly_action_items` where status='done' and supported action_key,
// upserts one row per (weekly_action_item_id, signal_kind) into
// `weekly_action_outcomes`. Never mutates `weekly_action_items` and never
// touches `live_debriefs`, `weekly_quests`, `recommendations`, OAuth or
// EventSub tables. No raw Twitch payloads, no tokens, no actor hashes.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

type Admin = ReturnType<typeof createClient>;

interface ActionRow {
  id: string;
  user_id: string;
  action_key: string;
  status: string;
  created_at: string;
  completed_at: string | null;
}

const SUPPORTED: Record<
  string,
  {
    signal_kind: "live_sessions" | "twitch_clips" | "channel_update_stability";
    dimension: "regularity" | "content" | "positioning";
  }
> = {
  consistency_schedule_next_live: { signal_kind: "live_sessions", dimension: "regularity" },
  consistency_protect_streak: { signal_kind: "live_sessions", dimension: "regularity" },
  score_focus_regularite: { signal_kind: "live_sessions", dimension: "regularity" },
  content_create_clips_from_last_live: { signal_kind: "twitch_clips", dimension: "content" },
  score_focus_content: { signal_kind: "twitch_clips", dimension: "content" },
  positioning_stabilize_title_category: {
    signal_kind: "channel_update_stability",
    dimension: "positioning",
  },
  score_focus_positioning: {
    signal_kind: "channel_update_stability",
    dimension: "positioning",
  },
};

const MIN_WINDOW_MS = 24 * 3600 * 1000;
const MAX_WINDOW_MS = 7 * 24 * 3600 * 1000;
const MIN_LIVE_DURATION = 20;

interface OutcomeUpsert {
  weekly_action_item_id: string;
  user_id: string;
  action_key: string;
  signal_kind: string;
  dimension: string | null;
  window_start: string;
  window_end: string;
  outcome_status: string;
  before_value: number | null;
  after_value: number | null;
  delta: number | null;
  confidence: string;
  note: string;
  evidence: Record<string, unknown>;
  evaluated_at: string;
}

async function getBroadcasterId(
  admin: Admin,
  userId: string,
): Promise<string | null> {
  const { data } = await admin
    .from("connected_accounts")
    .select("platform_user_id")
    .eq("user_id", userId)
    .eq("platform", "twitch")
    .maybeSingle();
  return (data?.platform_user_id as string | undefined) ?? null;
}

function buildWindow(item: ActionRow): { start: Date; end: Date } {
  const start = new Date(item.completed_at ?? item.created_at);
  const end = new Date(
    Math.min(Date.now(), start.getTime() + MAX_WINDOW_MS),
  );
  return { start, end };
}

function tooEarly(item: ActionRow, sk: string, dim: string | null, w: { start: Date; end: Date }): OutcomeUpsert {
  const ageMin = Math.max(0, Math.floor((w.end.getTime() - w.start.getTime()) / 60000));
  return {
    weekly_action_item_id: item.id,
    user_id: item.user_id,
    action_key: item.action_key,
    signal_kind: sk,
    dimension: dim,
    window_start: w.start.toISOString(),
    window_end: w.end.toISOString(),
    outcome_status: "too_early",
    before_value: null,
    after_value: null,
    delta: null,
    confidence: "low",
    note: "Pas encore assez de recul pour mesurer un signal après cette action.",
    evidence: {
      supported_action_key: item.action_key,
      window_start: w.start.toISOString(),
      window_end: w.end.toISOString(),
      window_age_minutes: ageMin,
      evaluated_by: "weekly-actions-evaluate",
    },
    evaluated_at: new Date().toISOString(),
  };
}

async function evalConsistency(
  admin: Admin,
  item: ActionRow,
  w: { start: Date; end: Date },
): Promise<OutcomeUpsert> {
  const dim = SUPPORTED[item.action_key].dimension;
  const sk = "live_sessions";

  const broadcaster = await getBroadcasterId(admin, item.user_id);

  // Current window: ended live_sessions with duration >= 20
  const { data: current } = await admin
    .from("live_sessions")
    .select("id, duration_minutes, ended_at")
    .eq("user_id", item.user_id)
    .eq("status", "ended")
    .gte("ended_at", w.start.toISOString())
    .lte("ended_at", w.end.toISOString());
  const currentValid =
    (current ?? []).filter(
      (r: { duration_minutes: number | null }) =>
        (r.duration_minutes ?? 0) >= MIN_LIVE_DURATION,
    ).length;

  // Prior equal-length window baseline
  const windowMs = w.end.getTime() - w.start.getTime();
  const priorStart = new Date(w.start.getTime() - windowMs);
  const { data: prior } = await admin
    .from("live_sessions")
    .select("id, duration_minutes, ended_at")
    .eq("user_id", item.user_id)
    .eq("status", "ended")
    .gte("ended_at", priorStart.toISOString())
    .lt("ended_at", w.start.toISOString());
  const priorValid =
    (prior ?? []).filter(
      (r: { duration_minutes: number | null }) =>
        (r.duration_minutes ?? 0) >= MIN_LIVE_DURATION,
    ).length;

  let outcome_status: string;
  let note: string;
  let confidence: string = priorValid > 0 ? "medium" : "low";

  if (broadcaster === null && current === null) {
    outcome_status = "inconclusive";
    note = "Pas encore assez de signal pour conclure.";
    confidence = "low";
  } else if (currentValid >= 1) {
    outcome_status = "improved";
    note =
      "Signal positif observé après l'action : un live valide a eu lieu après la complétion.";
    confidence = priorValid > 0 ? "medium" : "low";
  } else {
    outcome_status = "flat";
    note = "Pas encore assez de signal pour conclure.";
  }

  const delta = currentValid - priorValid;
  return {
    weekly_action_item_id: item.id,
    user_id: item.user_id,
    action_key: item.action_key,
    signal_kind: sk,
    dimension: dim,
    window_start: w.start.toISOString(),
    window_end: w.end.toISOString(),
    outcome_status,
    before_value: priorValid,
    after_value: currentValid,
    delta,
    confidence,
    note,
    evidence: {
      supported_action_key: item.action_key,
      window_start: w.start.toISOString(),
      window_end: w.end.toISOString(),
      baseline_count: priorValid,
      current_count: currentValid,
      delta,
      evaluated_by: "weekly-actions-evaluate",
    },
    evaluated_at: new Date().toISOString(),
  };
}

async function evalContent(
  admin: Admin,
  item: ActionRow,
  w: { start: Date; end: Date },
): Promise<OutcomeUpsert> {
  const dim = SUPPORTED[item.action_key].dimension;
  const sk = "twitch_clips";
  const broadcaster = await getBroadcasterId(admin, item.user_id);

  if (!broadcaster) {
    return {
      weekly_action_item_id: item.id,
      user_id: item.user_id,
      action_key: item.action_key,
      signal_kind: sk,
      dimension: dim,
      window_start: w.start.toISOString(),
      window_end: w.end.toISOString(),
      outcome_status: "inconclusive",
      before_value: null,
      after_value: null,
      delta: null,
      confidence: "low",
      note: "Pas encore assez de signal pour conclure.",
      evidence: {
        supported_action_key: item.action_key,
        window_start: w.start.toISOString(),
        window_end: w.end.toISOString(),
        reason: "no_broadcaster",
        evaluated_by: "weekly-actions-evaluate",
      },
      evaluated_at: new Date().toISOString(),
    };
  }

  const { count: newCount } = await admin
    .from("twitch_clip_snapshots")
    .select("*", { count: "exact", head: true })
    .eq("user_id", item.user_id)
    .gt("clip_created_at", w.start.toISOString())
    .lte("clip_created_at", w.end.toISOString());
  const after_value = newCount ?? 0;

  // Confidence: medium if any clips ingested in last 30d (data is fresh)
  const thirty = new Date(Date.now() - 30 * 86400000).toISOString();
  const { count: freshCount } = await admin
    .from("twitch_clip_snapshots")
    .select("*", { count: "exact", head: true })
    .eq("user_id", item.user_id)
    .gte("fetched_at", thirty);
  const confidence = (freshCount ?? 0) > 0 ? "medium" : "low";

  let outcome_status: string;
  let note: string;
  if (after_value >= 2) {
    outcome_status = "improved";
    note = `Signal positif observé après l'action : ${after_value} nouveaux clips ont été détectés.`;
  } else {
    outcome_status = "flat";
    note = "Pas encore assez de signal pour conclure.";
  }

  return {
    weekly_action_item_id: item.id,
    user_id: item.user_id,
    action_key: item.action_key,
    signal_kind: sk,
    dimension: dim,
    window_start: w.start.toISOString(),
    window_end: w.end.toISOString(),
    outcome_status,
    before_value: 0,
    after_value,
    delta: after_value,
    confidence,
    note,
    evidence: {
      supported_action_key: item.action_key,
      window_start: w.start.toISOString(),
      window_end: w.end.toISOString(),
      current_count: after_value,
      baseline_count: 0,
      delta: after_value,
      evaluated_by: "weekly-actions-evaluate",
    },
    evaluated_at: new Date().toISOString(),
  };
}

async function evalPositioning(
  admin: Admin,
  item: ActionRow,
  w: { start: Date; end: Date },
): Promise<OutcomeUpsert> {
  const dim = SUPPORTED[item.action_key].dimension;
  const sk = "channel_update_stability";
  const broadcaster = await getBroadcasterId(admin, item.user_id);
  const ts = new Date().toISOString();

  if (!broadcaster) {
    return {
      weekly_action_item_id: item.id,
      user_id: item.user_id,
      action_key: item.action_key,
      signal_kind: sk,
      dimension: dim,
      window_start: w.start.toISOString(),
      window_end: w.end.toISOString(),
      outcome_status: "inconclusive",
      before_value: null,
      after_value: null,
      delta: null,
      confidence: "low",
      note: "Pas encore assez de signal pour conclure.",
      evidence: {
        supported_action_key: item.action_key,
        window_start: w.start.toISOString(),
        window_end: w.end.toISOString(),
        reason: "no_broadcaster",
        evaluated_by: "weekly-actions-evaluate",
      },
      evaluated_at: ts,
    };
  }

  const windowMs = w.end.getTime() - w.start.getTime();
  const priorStart = new Date(w.start.getTime() - windowMs);

  const { count: currentCount } = await admin
    .from("channel_update_history")
    .select("*", { count: "exact", head: true })
    .eq("broadcaster_user_id", broadcaster)
    .gte("changed_at", w.start.toISOString())
    .lte("changed_at", w.end.toISOString());

  const { count: priorCount } = await admin
    .from("channel_update_history")
    .select("*", { count: "exact", head: true })
    .eq("broadcaster_user_id", broadcaster)
    .gte("changed_at", priorStart.toISOString())
    .lt("changed_at", w.start.toISOString());

  const { count: endedLives } = await admin
    .from("live_sessions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", item.user_id)
    .eq("status", "ended")
    .gte("ended_at", w.start.toISOString())
    .lte("ended_at", w.end.toISOString());

  const current = currentCount ?? 0;
  const baseline = priorCount ?? 0;
  const lives = endedLives ?? 0;
  const delta = current - baseline;
  const confidence: string = baseline >= 2 ? "medium" : "low";

  let outcome_status: string;
  let note: string;

  if (lives < 1 || (baseline === 0 && current === 0)) {
    outcome_status = "inconclusive";
    note = "Pas encore assez de signal pour conclure.";
  } else if (current < baseline && current <= Math.floor(baseline / 2)) {
    outcome_status = "improved";
    note =
      "Signal positif observé après l'action : moins de changements de titre/catégorie ont été détectés.";
  } else if (delta >= 2) {
    outcome_status = "worse";
    note = "Pas encore assez de signal pour conclure.";
  } else {
    outcome_status = "flat";
    note = "Pas encore assez de signal pour conclure.";
  }

  return {
    weekly_action_item_id: item.id,
    user_id: item.user_id,
    action_key: item.action_key,
    signal_kind: sk,
    dimension: dim,
    window_start: w.start.toISOString(),
    window_end: w.end.toISOString(),
    outcome_status,
    before_value: baseline,
    after_value: current,
    delta,
    confidence,
    note,
    evidence: {
      supported_action_key: item.action_key,
      window_start: w.start.toISOString(),
      window_end: w.end.toISOString(),
      baseline_count: baseline,
      current_count: current,
      delta,
      ended_lives_in_window: lives,
      evaluated_by: "weekly-actions-evaluate",
    },
    evaluated_at: ts,
  };
}

async function upsert(admin: Admin, row: OutcomeUpsert): Promise<void> {
  await admin
    .from("weekly_action_outcomes")
    .upsert(row as unknown as never, {
      onConflict: "weekly_action_item_id,signal_kind",
    });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, supabaseServiceKey);

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";
  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { data: ok } = await admin.rpc("verify_eventsub_cron_secret", { token });
  if (ok !== true) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supportedKeys = Object.keys(SUPPORTED);
    const { data } = await admin
      .from("weekly_action_items")
      .select("id, user_id, action_key, status, created_at, completed_at")
      .eq("status", "done")
      .in("action_key", supportedKeys);

    const items = (data ?? []) as ActionRow[];
    console.log(
      JSON.stringify({
        event: "outcome_evaluation_started",
        candidates: items.length,
      }),
    );

    let evaluated = 0;
    let skipped = 0;
    const errors: { id: string; error: string }[] = [];

    for (const item of items) {
      try {
        const cfg = SUPPORTED[item.action_key];
        if (!cfg) {
          skipped++;
          console.log(
            JSON.stringify({
              event: "outcome_skipped_unsupported",
              action_key: item.action_key,
            }),
          );
          continue;
        }

        const w = buildWindow(item);
        const windowMs = w.end.getTime() - w.start.getTime();

        let row: OutcomeUpsert;
        if (windowMs < MIN_WINDOW_MS) {
          row = tooEarly(item, cfg.signal_kind, cfg.dimension, w);
          console.log(
            JSON.stringify({
              event: "outcome_too_early",
              item_id: item.id,
              age_minutes: Math.floor(windowMs / 60000),
            }),
          );
        } else if (cfg.signal_kind === "live_sessions") {
          row = await evalConsistency(admin, item, w);
        } else if (cfg.signal_kind === "twitch_clips") {
          row = await evalContent(admin, item, w);
        } else {
          row = await evalPositioning(admin, item, w);
        }

        await upsert(admin, row);
        evaluated++;
        console.log(
          JSON.stringify({
            event: "outcome_evaluated",
            item_id: item.id,
            signal_kind: row.signal_kind,
            outcome_status: row.outcome_status,
            confidence: row.confidence,
          }),
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push({ id: item.id, error: msg });
        console.log(
          JSON.stringify({
            event: "outcome_evaluation_error",
            item_id: item.id,
            error_message: msg,
          }),
        );
      }
    }

    console.log(
      JSON.stringify({
        event: "outcome_evaluation_finished",
        candidates: items.length,
        evaluated,
        skipped,
        errors_count: errors.length,
      }),
    );

    return new Response(
      JSON.stringify({
        success: true,
        candidates: items.length,
        evaluated,
        skipped,
        errors,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(
      JSON.stringify({
        event: "outcome_evaluation_error",
        error_message: msg,
      }),
    );
    return new Response(JSON.stringify({ error: "internal_server_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
