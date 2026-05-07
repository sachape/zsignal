// Auto-verification sweep for weekly_action_items.
//
// Scope (auto_verifiable = true only):
//  - consistency_schedule_next_live      → live_sessions.next_started
//  - positioning_stabilize_title_category → channel_update_history.count_decrease
//  - monetization_review_affiliate_path  → twitch_profile.broadcaster_type_change
//  - content_create_clips_from_last_live → twitch_clips.count_increase
//
// Safety:
//  - never reverses user-set status (only flips todo → done)
//  - never marks `skipped`
//  - only operates on items in current ISO week
//  - idempotent

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ingestClipsFor } from "../_shared/clipIngest.ts";

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
  evidence: Record<string, unknown> | null;
}

function startOfIsoWeek(d = new Date()): Date {
  const out = new Date(d);
  out.setUTCHours(0, 0, 0, 0);
  const day = (out.getUTCDay() + 6) % 7; // Monday=0
  out.setUTCDate(out.getUTCDate() - day);
  return out;
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

async function markDone(
  admin: Admin,
  item: ActionRow,
  details: Record<string, unknown>,
): Promise<void> {
  const evidence = {
    ...(item.evidence ?? {}),
    verification_details: details,
    verified_by: "auto",
    verified_at: new Date().toISOString(),
  };
  await admin
    .from("weekly_action_items")
    .update({
      status: "done",
      completed_at: new Date().toISOString(),
      evidence: evidence as unknown as never,
    })
    .eq("id", item.id)
    .eq("status", "todo"); // safety: never overwrite done/skipped
}

async function verifyClips(
  admin: Admin,
  item: ActionRow,
  broadcasterId: string,
): Promise<boolean> {
  // Refresh clips first (server-side, app token).
  try {
    await ingestClipsFor(admin, {
      user_id: item.user_id,
      broadcaster_id: broadcasterId,
      started_at: item.created_at,
    });
  } catch (e) {
    console.warn("[verify] clip ingest failed", e);
    // continue with what we have in DB
  }

  const weekStart = startOfIsoWeek().toISOString();
  const baseline =
    (item.evidence?.["baseline_clip_count"] as number | undefined) ?? 0;

  const { data: newClips } = await admin
    .from("twitch_clip_snapshots")
    .select("twitch_clip_id, video_id, vod_offset, clip_created_at")
    .eq("broadcaster_id", broadcasterId)
    .gt("clip_created_at", item.created_at)
    .gte("clip_created_at", weekStart);

  const list = (newClips ?? []) as Array<{
    twitch_clip_id: string;
    video_id: string | null;
    vod_offset: number | null;
    clip_created_at: string;
  }>;

  if (list.length < 2) return false;

  await markDone(admin, item, {
    new_clip_count: list.length,
    baseline_clip_count: baseline,
    sample_clip_ids: list.slice(0, 5).map((c) => c.twitch_clip_id),
    sample_vod_refs: list
      .slice(0, 5)
      .map((c) => ({ video_id: c.video_id, vod_offset: c.vod_offset })),
  });
  return true;
}

async function verifyNextLive(
  admin: Admin,
  item: ActionRow,
): Promise<boolean> {
  const { data } = await admin
    .from("live_sessions")
    .select("id, started_at, duration_minutes")
    .eq("user_id", item.user_id)
    .gt("started_at", item.created_at)
    .order("started_at", { ascending: true })
    .limit(1);
  const session = (data ?? [])[0] as
    | { id: string; started_at: string; duration_minutes: number | null }
    | undefined;
  if (!session) return false;
  if ((session.duration_minutes ?? 0) < 20) return false;
  await markDone(admin, item, {
    live_session_id: session.id,
    started_at: session.started_at,
    duration_minutes: session.duration_minutes,
  });
  return true;
}

async function verifyTitleStable(
  admin: Admin,
  item: ActionRow,
  broadcasterId: string,
): Promise<boolean> {
  const weekStart = startOfIsoWeek().toISOString();
  const fourteen = new Date(Date.now() - 14 * 86400_000).toISOString();

  const { count: weekChanges } = await admin
    .from("channel_update_history")
    .select("*", { count: "exact", head: true })
    .eq("broadcaster_user_id", broadcasterId)
    .gte("changed_at", weekStart);

  const { count: priorChanges } = await admin
    .from("channel_update_history")
    .select("*", { count: "exact", head: true })
    .eq("broadcaster_user_id", broadcasterId)
    .gte("changed_at", fourteen)
    .lt("changed_at", weekStart);

  // require at least one ended live this week
  const { count: endedThisWeek } = await admin
    .from("live_sessions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", item.user_id)
    .eq("status", "ended")
    .gte("ended_at", weekStart);

  if ((endedThisWeek ?? 0) < 1) return false;
  const threshold = Math.floor((priorChanges ?? 0) / 2);
  if ((weekChanges ?? 0) > threshold) return false;
  await markDone(admin, item, {
    week_changes: weekChanges ?? 0,
    prior_14d_changes: priorChanges ?? 0,
    threshold,
  });
  return true;
}

async function verifyAffiliate(
  admin: Admin,
  item: ActionRow,
): Promise<boolean> {
  const baseline =
    (item.evidence?.["baseline_broadcaster_type"] as string | undefined) ??
    null;
  const { data } = await admin
    .from("twitch_profiles")
    .select("broadcaster_type, fetched_at")
    .eq("user_id", item.user_id)
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const current = (data?.broadcaster_type as string | null) ?? null;
  // forward transitions only: "" → affiliate → partner
  const rank = (t: string | null) =>
    t === "partner" ? 2 : t === "affiliate" ? 1 : 0;
  if (rank(current) > rank(baseline)) {
    await markDone(admin, item, {
      previous: baseline,
      current,
    });
    return true;
  }
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, supabaseServiceKey);

  // Cron-secret auth.
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
  const { data: ok } = await admin.rpc("verify_eventsub_cron_secret", {
    token,
  });
  if (ok !== true) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const weekStart = startOfIsoWeek().toISOString();
    const { data } = await admin
      .from("weekly_action_items")
      .select("id, user_id, action_key, status, created_at, evidence")
      .eq("status", "todo")
      .eq("auto_verifiable", true)
      .gte("created_at", weekStart);

    const items = (data ?? []) as ActionRow[];
    const verified: string[] = [];
    const errors: { id: string; error: string }[] = [];

    for (const item of items) {
      try {
        let done = false;
        if (item.action_key === "consistency_schedule_next_live") {
          done = await verifyNextLive(admin, item);
        } else if (
          item.action_key === "positioning_stabilize_title_category" ||
          item.action_key === "content_create_clips_from_last_live" ||
          item.action_key === "monetization_review_affiliate_path"
        ) {
          const broadcasterId = await getBroadcasterId(admin, item.user_id);
          if (!broadcasterId) continue;
          if (item.action_key === "positioning_stabilize_title_category") {
            done = await verifyTitleStable(admin, item, broadcasterId);
          } else if (item.action_key === "content_create_clips_from_last_live") {
            done = await verifyClips(admin, item, broadcasterId);
          } else {
            done = await verifyAffiliate(admin, item);
          }
        }
        if (done) verified.push(item.id);
      } catch (e) {
        errors.push({ id: item.id, error: String(e) });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        candidates: items.length,
        verified,
        errors,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[weekly-actions-verify] error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
