// Post-live debrief v2 — extracted shared logic.
// Pure functions + DB-aware generator. No Twitch tokens or raw payloads here.

export interface SessionRow {
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

export interface DebriefV2 {
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
  summary: string;
  main_strength: string;
  main_weakness: string;
  next_live_focus: string;
  confidence: "low" | "medium" | "high";
  signal_quality: "low" | "medium" | "high";
  evidence: Record<string, unknown>;
  generated_at: string;
}

export interface CommunityEvt { kind: string; occurred_at: string }
export interface ChannelChange { changed_at: string; title: string | null; category_name: string | null }

export function computeDebrief(
  session: SessionRow,
  snapshots: { viewer_count: number; captured_at: string }[],
  previous: SessionRow | null,
  daysSincePrev: number | null,
  communityEvents: CommunityEvt[],
  channelChanges: ChannelChange[],
): DebriefV2 {
  const duration = session.duration_minutes ?? 0;
  const generated_at = new Date().toISOString();
  // Relaxed: a 30+ min live always yields a debrief, even if snapshots
  // collection lagged. We fall back on session-level peak/avg in that case.
  const enough = (duration >= 30) || (duration >= 15 && snapshots.length >= 2);

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
      next_live_focus: isComeback
        ? "Maintiens une régularité minimale en planifiant ton prochain live cette semaine."
        : "Planifie un prochain live d'au moins 30 minutes pour obtenir un vrai débrief.",
      confidence: "low",
      signal_quality: "low",
      evidence,
      generated_at,
    };
  }

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

  const titleChanges = channelChanges.filter((c) => c.title !== null).length;
  const categoryChanges = new Set(
    channelChanges.map((c) => c.category_name).filter((x): x is string => !!x),
  ).size;
  const positioning_unstable = titleChanges >= 3 || categoryChanges >= 2;

  const community_count = communityEvents.length;
  const community_momentum = community_count >= 3;
  const isComeback = daysSincePrev !== null && daysSincePrev >= 14;

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

  if (positioning_unstable) {
    main_weakness = "Positionnement instable : titre et/ou catégorie ont bougé plusieurs fois pendant le live.";
    priority_action = "Stabilise titre et catégorie dès le début du prochain live.";
    next_live_focus = "Démarre avec un titre et une catégorie clairs et garde-les fixes.";
  }
  if (community_momentum) {
    main_strength = "Belle activité communautaire pendant le live (subs, raids, gifts ou follows).";
    if (!positioning_unstable) {
      priority_action = "Capitalise sur l'élan communautaire : remercie et réengage tes nouveaux soutiens.";
      next_live_focus = "Renforce l'engagement communautaire dès l'ouverture du prochain live.";
    }
  }
  if (isComeback) {
    main_strength = "Reprise réussie après une période d'inactivité.";
    if (!positioning_unstable && !community_momentum) {
      priority_action = "Planifie ton prochain live pour ancrer la régularité.";
      next_live_focus = "Maintiens une régularité minimale sur les prochaines semaines.";
    }
  }

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
  if (isComeback) summaryParts.push("Premier live après une pause.");
  const summary = summaryParts.join(" ");

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
    is_comeback: isComeback,
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

// deno-lint-ignore no-explicit-any
type AdminClient = any;

/**
 * Idempotent: if a debrief already exists for the session, this returns
 * "exists" and never overwrites it.
 */
export async function generateDebrief(
  admin: AdminClient,
  sessionId: string,
): Promise<"created" | "exists" | "no_session"> {
  const { data: session } = await admin
    .from("live_sessions")
    .select(
      "id, user_id, started_at, ended_at, duration_minutes, peak_viewers, avg_viewers, snapshots_count, category_name, connected_account_id, platform_user_id",
    )
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) return "no_session";
  const s = session as SessionRow & {
    connected_account_id: string;
    platform_user_id: string | null;
  };

  const { data: existing } = await admin
    .from("live_debriefs")
    .select("id")
    .eq("live_session_id", s.id)
    .maybeSingle();
  if (existing) return "exists";

  const { data: snapshots } = await admin
    .from("live_snapshots")
    .select("viewer_count, captured_at")
    .eq("live_session_id", s.id)
    .order("captured_at", { ascending: true });

  const { data: previous } = await admin
    .from("live_sessions")
    .select(
      "id, user_id, started_at, ended_at, duration_minutes, peak_viewers, avg_viewers, snapshots_count, category_name",
    )
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
  return "created";
}
