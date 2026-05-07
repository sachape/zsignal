// live-detect (cron, every ~3 min)
//
// For every Twitch-connected account:
//   - Calls /helix/streams?user_id=... with an App Access Token
//   - If live and no open session → create live_sessions(status='live')
//   - If live and open session   → insert a viewer_count snapshot
//   - If NOT live and open session → close it (status='ended'), compute
//     duration / peak / avg, then trigger debrief generation inline.
//
// Mode "self" (called by the dashboard) does the same for the caller only,
// so users can manually force a sync from the cockpit if needed.
//
// All Twitch reads are server-side. We never store tokens here — we use the
// app-level credentials for read-only stream status, which is sufficient.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

type AdminClient = ReturnType<typeof createClient<any, any, any>>;

interface Account {
  id: string;
  user_id: string;
  platform_user_id: string | null;
  platform_login: string | null;
  platform_display_name: string | null;
}

interface HelixStream {
  id: string;
  user_id: string;
  user_login?: string;
  user_name?: string;
  game_id: string;
  game_name: string;
  title: string;
  viewer_count: number;
  started_at: string;
  language: string;
}

// ---- App Access Token (cached) ------------------------------------------
let cachedToken: { token: string; expiresAt: number } | null = null;
async function getAppToken(
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
    cachedToken = {
      token: data.access_token,
      expiresAt: now + (data.expires_in ?? 3600) * 1000,
    };
    return cachedToken.token;
  } catch {
    return null;
  }
}

async function fetchLive(
  userId: string,
  headers: Record<string, string>,
): Promise<HelixStream | null> {
  try {
    const res = await fetch(
      `https://api.twitch.tv/helix/streams?user_id=${encodeURIComponent(userId)}`,
      { headers },
    );
    if (!res.ok) return null;
    const j = await res.json();
    return (j?.data?.[0] as HelixStream | undefined) ?? null;
  } catch {
    return null;
  }
}

// ---- Debrief generation -------------------------------------------------
interface SessionRow {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  peak_viewers: number | null;
  avg_viewers: number | null;
  snapshots_count: number;
  category_name: string | null;
}

interface DebriefV2 {
  // Existing fields (kept for compatibility)
  overall_score: number | null;
  score_start: number | null;
  score_hold: number | null;
  score_structure: number | null;
  verdict: string;
  strength: string;
  weakness: string;
  priority_action: string;
  has_enough_signal: boolean;
  comparison_data: Record<string, unknown>;
  // New fields
  summary: string;
  main_strength: string;
  main_weakness: string;
  next_live_focus: string;
  confidence: "low" | "medium" | "high";
  signal_quality: "low" | "medium" | "high";
  evidence: Record<string, unknown>;
  generated_at: string;
}

interface CommunityEvt { kind: string; occurred_at: string }
interface ChannelChange { changed_at: string; title: string | null; category_name: string | null }

function computeDebrief(
  session: SessionRow,
  snapshots: { viewer_count: number; captured_at: string }[],
  previous: SessionRow | null,
  daysSincePrev: number | null,
  communityEvents: CommunityEvt[],
  channelChanges: ChannelChange[],
): DebriefV2 {
  const duration = session.duration_minutes ?? 0;
  const generated_at = new Date().toISOString();
  const enough = duration >= 15 && snapshots.length >= 2;

  // ---- Branch A: not enough signal -------------------------------------
  if (!enough) {
    const isComeback = daysSincePrev !== null && daysSincePrev >= 14;
    const evidence: Record<string, unknown> = {
      duration_minutes: duration,
      snapshots_count: snapshots.length,
      days_since_previous_live: daysSincePrev,
      reason: "insufficient_signal",
    };
    return {
      overall_score: null,
      score_start: null,
      score_hold: null,
      score_structure: null,
      verdict: isComeback
        ? "Reprise notée, mais le live est trop court pour un débrief complet."
        : "Pas encore assez de signal sur ce live pour un débrief complet.",
      strength: isComeback
        ? "Tu as relancé un live après une pause, c'est déjà un point positif."
        : "Tu es passé en live, c'est la première étape.",
      weakness: "Le live est trop court pour mesurer ta tenue ou ton démarrage.",
      priority_action: "Vise au moins 30 minutes de stream pour un débrief fiable.",
      has_enough_signal: false,
      comparison_data: { has_previous: !!previous },
      summary: "Live trop court pour conclure quoi que ce soit de précis.",
      main_strength: isComeback
        ? "Reprise du live après une période d'inactivité."
        : "Live lancé.",
      main_weakness: "Durée insuffisante pour produire une analyse fiable.",
      next_live_focus: "Planifie un prochain live d'au moins 30 minutes pour obtenir un vrai débrief.",
      confidence: "low",
      signal_quality: "low",
      evidence,
      generated_at,
    };
  }

  // ---- Compute sub-scores ---------------------------------------------
  const peak = session.peak_viewers ?? 0;
  const avg = session.avg_viewers ?? 0;

  const firstWindow = snapshots.slice(0, 3);
  const startAvg = firstWindow.length
    ? Math.round(firstWindow.reduce((s, x) => s + x.viewer_count, 0) / firstWindow.length)
    : 0;
  const startRatio = peak > 0 ? startAvg / peak : 0;
  const score_start = Math.max(10, Math.min(100, Math.round(startRatio * 100)));

  const holdRatio = peak > 0 ? avg / peak : 0;
  const score_hold = Math.max(10, Math.min(100, Math.round(holdRatio * 100)));

  const score_structure = (() => {
    if (duration < 30) return 25;
    if (duration < 60) return 45;
    if (duration < 90) return 60;
    if (duration <= 240) return 85;
    if (duration <= 360) return 75;
    return 60;
  })();

  const overall_score = Math.round(
    score_start * 0.35 + score_hold * 0.45 + score_structure * 0.2,
  );

  // ---- Viewer trend (safe, aggregated) --------------------------------
  let viewer_trend: "rising" | "stable" | "dropping" | "unknown" = "unknown";
  if (snapshots.length >= 4) {
    const half = Math.floor(snapshots.length / 2);
    const firstHalf = snapshots.slice(0, half);
    const secondHalf = snapshots.slice(half);
    const a = firstHalf.reduce((s, x) => s + x.viewer_count, 0) / firstHalf.length;
    const b = secondHalf.reduce((s, x) => s + x.viewer_count, 0) / secondHalf.length;
    const delta = b - a;
    const ref = Math.max(1, a);
    if (delta / ref > 0.15) viewer_trend = "rising";
    else if (delta / ref < -0.15) viewer_trend = "dropping";
    else viewer_trend = "stable";
  }

  // ---- Positioning instability (title/category churn) ------------------
  const titleChanges = channelChanges.filter((c) => c.title !== null).length;
  const categoryChanges = new Set(
    channelChanges.map((c) => c.category_name).filter((x): x is string => !!x),
  ).size;
  const positioning_unstable = titleChanges >= 3 || categoryChanges >= 2;

  // ---- Community momentum ---------------------------------------------
  const community_count = communityEvents.length;
  const community_momentum = community_count >= 3;

  // ---- Strength / weakness selection ----------------------------------
  const subs: { key: "start" | "hold" | "structure"; score: number }[] = [
    { key: "start", score: score_start },
    { key: "hold", score: score_hold },
    { key: "structure", score: score_structure },
  ];
  subs.sort((a, b) => b.score - a.score);
  const top = subs[0];
  const bottom = subs[subs.length - 1];

  const labelMap: Record<typeof top.key, { strength: string; weakness: string; action: string; focus: string }> = {
    start: {
      strength: "Ton démarrage a accroché : la première fenêtre du stream a bien capté ton audience.",
      weakness: "Ton démarrage reste faible : l'ouverture du live ne convertit pas en viewers.",
      action: "Retravaille les 15 premières minutes du prochain stream (titre, thumbnail, accroche).",
      focus: "Soigne particulièrement l'ouverture du prochain live.",
    },
    hold: {
      strength: "Ta tenue a été solide : tu as su garder ton audience dans la durée.",
      weakness: "Ta tenue est fragile : tu perds des viewers en cours de live.",
      action: "Identifie le moment où tu perds le plus de monde et casse la routine à cet instant.",
      focus: "Concentre-toi sur la rétention au milieu du prochain live.",
    },
    structure: {
      strength: "La durée et la cadence du live étaient bien calibrées.",
      weakness: "La durée du live n'est pas optimale : trop court ou trop long pour ton format.",
      action: "Vise une session entre 90 et 240 minutes pour donner sa chance à l'algo Twitch.",
      focus: "Cale le prochain live entre 90 et 240 minutes.",
    },
  };

  let main_strength = labelMap[top.key].strength;
  let main_weakness = labelMap[bottom.key].weakness;
  let priority_action = labelMap[bottom.key].action;
  let next_live_focus = labelMap[bottom.key].focus;

  // Override / enrich with deterministic context rules
  if (positioning_unstable) {
    main_weakness = "Positionnement instable : titre et/ou catégorie ont bougé plusieurs fois pendant le live.";
    priority_action = "Stabilise titre et catégorie dès le début du prochain live.";
    next_live_focus = "Démarre avec un titre et une catégorie clairs et garde-les fixes.";
  }
  if (community_momentum) {
    main_strength = "Belle activité communautaire pendant le live (subs, raids, gifts ou follows).";
  }

  // ---- Comparison vs previous session (kept) --------------------------
  const comparison_data: Record<string, unknown> = {};
  if (previous) {
    comparison_data.has_previous = true;
    comparison_data.previous_session_id = previous.id;
    comparison_data.duration_delta_min =
      (session.duration_minutes ?? 0) - (previous.duration_minutes ?? 0);
    comparison_data.peak_delta = peak - (previous.peak_viewers ?? 0);
    comparison_data.avg_delta = avg - (previous.avg_viewers ?? 0);
  } else {
    comparison_data.has_previous = false;
  }

  // ---- Verdict & summary ----------------------------------------------
  let verdict = `Score de live : ${overall_score}/100.`;
  if (previous && typeof comparison_data.avg_delta === "number") {
    const d = comparison_data.avg_delta as number;
    if (d > 1) verdict += " Audience moyenne en hausse vs ton dernier live.";
    else if (d < -1) verdict += " Audience moyenne en recul vs ton dernier live.";
    else verdict += " Audience moyenne stable vs ton dernier live.";
  }

  const summaryParts: string[] = [
    `${duration} min de live, pic à ${peak} viewers, moyenne ${avg}.`,
  ];
  if (viewer_trend === "rising") summaryParts.push("Tendance viewers à la hausse pendant le live.");
  else if (viewer_trend === "dropping") summaryParts.push("Tendance viewers en recul au fil du live.");
  if (community_momentum) summaryParts.push("Communauté très active.");
  if (positioning_unstable) summaryParts.push("Plusieurs changements de titre/catégorie.");
  const summary = summaryParts.join(" ");

  // ---- Confidence & signal quality ------------------------------------
  let signalScore = 0;
  if (snapshots.length >= 4) signalScore += 1;
  if (community_count > 0 || channelChanges.length > 0) signalScore += 1;
  if (previous) signalScore += 1;
  const signal_quality: DebriefV2["signal_quality"] =
    signalScore >= 2 ? "high" : signalScore === 1 ? "medium" : "low";

  let confScore = 0;
  if (duration >= 60) confScore += 1;
  if (snapshots.length >= 6) confScore += 1;
  if (previous) confScore += 1;
  if (community_count > 0) confScore += 1;
  const confidence: DebriefV2["confidence"] =
    confScore >= 3 ? "high" : confScore >= 1 ? "medium" : "low";

  const evidence: Record<string, unknown> = {
    duration_minutes: duration,
    snapshots_count: snapshots.length,
    peak_viewers: peak,
    avg_viewers: avg,
    viewer_trend,
    community_events_count: community_count,
    channel_changes_count: channelChanges.length,
    positioning_unstable,
    days_since_previous_live: daysSincePrev,
    has_previous: !!previous,
  };

  return {
    overall_score,
    score_start,
    score_hold,
    score_structure,
    verdict,
    strength: main_strength,
    weakness: main_weakness,
    priority_action,
    has_enough_signal: true,
    comparison_data,
    summary,
    main_strength,
    main_weakness,
    next_live_focus,
    confidence,
    signal_quality,
    evidence,
    generated_at,
  };
}

async function generateDebrief(
  admin: AdminClient,
  sessionId: string,
): Promise<void> {
  const { data: session } = await admin
    .from("live_sessions")
    .select(
      "id, user_id, started_at, ended_at, duration_minutes, peak_viewers, avg_viewers, snapshots_count, category_name, connected_account_id, platform_user_id",
    )
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) return;
  const s = session as SessionRow & {
    connected_account_id: string;
    platform_user_id: string | null;
  };

  // Idempotency: never overwrite an existing debrief silently.
  const { data: existing } = await admin
    .from("live_debriefs")
    .select("id")
    .eq("live_session_id", s.id)
    .maybeSingle();
  if (existing) return;

  const { data: snapshots } = await admin
    .from("live_snapshots")
    .select("viewer_count, captured_at")
    .eq("live_session_id", s.id)
    .order("captured_at", { ascending: true });

  const { data: previous } = await admin
    .from("live_sessions")
    .select("id, user_id, started_at, ended_at, duration_minutes, peak_viewers, avg_viewers, snapshots_count, category_name")
    .eq("connected_account_id", s.connected_account_id)
    .eq("status", "ended")
    .neq("id", s.id)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const daysSincePrev = previous?.ended_at
    ? Math.round(
        (new Date(s.started_at).getTime() -
          new Date((previous as SessionRow).ended_at as string).getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : null;

  // Window: live span ± 30 min
  const startedMs = new Date(s.started_at).getTime();
  const endedMs = s.ended_at ? new Date(s.ended_at).getTime() : Date.now();
  const winStart = new Date(startedMs - 30 * 60 * 1000).toISOString();
  const winEnd = new Date(endedMs + 30 * 60 * 1000).toISOString();

  let community: CommunityEvt[] = [];
  let changes: ChannelChange[] = [];
  if (s.platform_user_id) {
    const { data: ce } = await admin
      .from("community_events")
      .select("kind, occurred_at")
      .eq("broadcaster_user_id", s.platform_user_id)
      .gte("occurred_at", winStart)
      .lte("occurred_at", winEnd);
    community = (ce ?? []) as CommunityEvt[];

    const { data: ch } = await admin
      .from("channel_update_history")
      .select("changed_at, title, category_name")
      .eq("broadcaster_user_id", s.platform_user_id)
      .gte("changed_at", winStart)
      .lte("changed_at", winEnd);
    changes = (ch ?? []) as ChannelChange[];
  }

  const debrief = computeDebrief(
    s,
    (snapshots ?? []) as { viewer_count: number; captured_at: string }[],
    (previous as SessionRow | null) ?? null,
    daysSincePrev,
    community,
    changes,
  );

  await admin.from("live_debriefs").insert({
    live_session_id: s.id,
    user_id: s.user_id,
    ...debrief,
  });
}

// ---- Per-account processing --------------------------------------------
async function processAccount(
  admin: AdminClient,
  account: Account,
  headers: Record<string, string>,
): Promise<{ login: string; action: string }> {
  if (!account.platform_user_id) {
    return { login: account.platform_login ?? "?", action: "skip_no_platform_id" };
  }

  const live = await fetchLive(account.platform_user_id, headers);

  // Find currently open session for this account
  const { data: openSession } = await admin
    .from("live_sessions")
    .select("id, twitch_stream_id, started_at, snapshots_count, peak_viewers")
    .eq("connected_account_id", account.id)
    .eq("status", "live")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const open = openSession as
    | {
        id: string;
        twitch_stream_id: string | null;
        started_at: string;
        snapshots_count: number;
        peak_viewers: number | null;
      }
    | null;

  // CASE 1 — live, no open session → create one
  if (live && !open) {
    const { data: created } = await admin
      .from("live_sessions")
      .insert({
        user_id: account.user_id,
        connected_account_id: account.id,
        platform: "twitch",
        platform_user_id: account.platform_user_id,
        platform_login: account.platform_login,
        platform_display_name: account.platform_display_name,
        twitch_stream_id: live.id,
        category_name: live.game_name ?? null,
        start_title: live.title ?? null,
        language: live.language ?? null,
        started_at: live.started_at,
        status: "live",
        peak_viewers: live.viewer_count,
        avg_viewers: live.viewer_count,
        snapshots_count: 1,
      })
      .select("id")
      .single();

    if (created) {
      await admin.from("live_snapshots").insert({
        live_session_id: (created as { id: string }).id,
        viewer_count: live.viewer_count,
        category_name: live.game_name ?? null,
        title: live.title ?? null,
      });
    }
    return { login: account.platform_login ?? "?", action: "created_session" };
  }

  // CASE 2 — live and open session matches → snapshot
  if (live && open) {
    await admin.from("live_snapshots").insert({
      live_session_id: open.id,
      viewer_count: live.viewer_count,
      category_name: live.game_name ?? null,
      title: live.title ?? null,
    });
    // Recompute peak / avg / snapshots_count
    const { data: snaps } = await admin
      .from("live_snapshots")
      .select("viewer_count")
      .eq("live_session_id", open.id);
    const arr = (snaps ?? []) as { viewer_count: number }[];
    const peak = arr.length ? Math.max(...arr.map((x) => x.viewer_count)) : 0;
    const avg = arr.length
      ? Math.round(arr.reduce((s, x) => s + x.viewer_count, 0) / arr.length)
      : 0;
    await admin
      .from("live_sessions")
      .update({
        peak_viewers: peak,
        avg_viewers: avg,
        snapshots_count: arr.length,
        category_name: live.game_name ?? null,
      })
      .eq("id", open.id);
    return { login: account.platform_login ?? "?", action: "snapshot" };
  }

  // CASE 3 — not live, but open session → close it + debrief
  if (!live && open) {
    const startedAt = new Date(open.started_at).getTime();
    const endedAt = Date.now();
    const durationMin = Math.max(1, Math.round((endedAt - startedAt) / 60000));

    await admin
      .from("live_sessions")
      .update({
        status: "ended",
        ended_at: new Date(endedAt).toISOString(),
        duration_minutes: durationMin,
      })
      .eq("id", open.id);

    await generateDebrief(admin, open.id);
    return { login: account.platform_login ?? "?", action: "closed_session" };
  }

  return { login: account.platform_login ?? "?", action: "no_change" };
}

// ---- HTTP handler -------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const clientId = Deno.env.get("TWITCH_CLIENT_ID");
    const clientSecret = Deno.env.get("TWITCH_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      return json({ success: false, error: "twitch_credentials_missing" }, 500);
    }

    const admin: AdminClient = createClient(supabaseUrl, serviceKey);
    const token = await getAppToken(clientId, clientSecret);
    if (!token) return json({ success: false, error: "twitch_app_token_failed" }, 502);

    const headers = {
      "Client-ID": clientId,
      Authorization: `Bearer ${token}`,
    };

    const body = await req.json().catch(() => ({}));
    const mode = (body as { mode?: string }).mode ?? "all";

    let accounts: Account[] = [];

    if (mode === "self") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) return json({ error: "Missing authorization" }, 401);
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const {
        data: { user },
      } = await userClient.auth.getUser();
      if (!user) return json({ error: "Unauthorized" }, 401);

      const { data } = await admin
        .from("connected_accounts")
        .select("id, user_id, platform_user_id, platform_login, platform_display_name")
        .eq("user_id", user.id)
        .eq("platform", "twitch");
      accounts = (data ?? []) as Account[];
    } else {
      // mode === "all" → cron
      const { data } = await admin
        .from("connected_accounts")
        .select("id, user_id, platform_user_id, platform_login, platform_display_name")
        .eq("platform", "twitch");
      accounts = (data ?? []) as Account[];
    }

    const results: { login: string; action: string }[] = [];
    for (const acc of accounts) {
      try {
        results.push(await processAccount(admin, acc, headers));
      } catch (err) {
        console.error("[live-detect] account error", acc.platform_login, err);
        results.push({
          login: acc.platform_login ?? "?",
          action: `error:${String(err).slice(0, 80)}`,
        });
      }
    }

    return json({ success: true, mode, count: results.length, results });
  } catch (err) {
    console.error("[live-detect]", err);
    return json({ success: false, error: String(err) }, 500);
  }
});
