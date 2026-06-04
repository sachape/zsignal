// Auto clip candidates — pure detection logic + DB writer.
// Reads snapshots / community events / channel updates for a live session,
// produces 3 to 5 candidate windows (20-60s) with confidence + reason,
// inserts them as creator_content_items rows in status='to_generate'.
//
// Idempotent: skips if candidates already exist for the session.

// deno-lint-ignore no-explicit-any
type AdminClient = any;

export interface CandidateInput {
  session: {
    id: string;
    user_id: string;
    started_at: string;
    ended_at: string | null;
    duration_minutes: number | null;
    category_name: string | null;
    platform_user_id: string | null;
    start_title: string | null;
  };
  snapshots: { viewer_count: number; captured_at: string }[];
  community: { kind: string; occurred_at: string }[];
  changes: { changed_at: string; title: string | null; category_name: string | null }[];
}

export interface Candidate {
  title: string;
  description: string;
  platform: "youtube_shorts" | "tiktok" | "instagram";
  format: "short" | "reel" | "tiktok";
  start_seconds: number;
  end_seconds: number;
  reason: string;
  reason_code: string;
  confidence: number; // 0-100
  hashtags: string[];
}

const MAX_CANDIDATES = 5;
const COOLDOWN_SEC = 5 * 60;
const CLIP_BEFORE = 20;
const CLIP_AFTER = 40;
const EVENT_BEFORE = 15;
const EVENT_AFTER = 45;

function buildHashtags(category: string | null): string[] {
  const base = ["#stream", "#twitch", "#gaming"];
  if (category) {
    const slug = category
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "");
    if (slug) base.unshift(`#${slug}`);
  }
  return base.slice(0, 5);
}

function fmtTimestamp(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return h > 0
    ? `${h}h${String(m).padStart(2, "0")}`
    : `${m}min${String(s).padStart(2, "0")}`;
}

function rotatePlatform(idx: number): { platform: Candidate["platform"]; format: Candidate["format"] } {
  const opts: { platform: Candidate["platform"]; format: Candidate["format"] }[] = [
    { platform: "youtube_shorts", format: "short" },
    { platform: "instagram", format: "reel" },
    { platform: "tiktok", format: "tiktok" },
  ];
  return opts[idx % opts.length];
}

export function detectCandidates(input: CandidateInput): Candidate[] {
  const { session, snapshots, community, changes } = input;
  const startedAt = new Date(session.started_at).getTime();
  const endedAt = session.ended_at ? new Date(session.ended_at).getTime() : Date.now();
  const totalSec = Math.max(60, Math.round((endedAt - startedAt) / 1000));
  const category = session.category_name ?? "ton stream";
  const subject = session.start_title?.trim() || category;
  const tags = buildHashtags(session.category_name);

  type Raw = { at: number; reason: string; reasonCode: string; conf: number; title: string };
  const raw: Raw[] = [];

  // A. Viewer spikes — > 1.5× median, cooldown 5 min.
  if (snapshots.length >= 4) {
    const sorted = [...snapshots].sort((a, b) =>
      new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime()
    );
    const counts = sorted.map((s) => s.viewer_count);
    const median = counts.slice().sort((a, b) => a - b)[Math.floor(counts.length / 2)];
    const threshold = Math.max(5, median * 1.5);
    let lastSpike = -Infinity;
    for (const s of sorted) {
      if (s.viewer_count >= threshold) {
        const at = Math.round((new Date(s.captured_at).getTime() - startedAt) / 1000);
        if (at - lastSpike >= COOLDOWN_SEC) {
          raw.push({
            at,
            reason: `Pic d'audience à ${s.viewer_count} viewers`,
            reasonCode: "viewer_spike",
            conf: 70,
            title: `Pic d'audience — ${subject}`,
          });
          lastSpike = at;
        }
      }
    }
  }

  // B. Community events (raid / sub / gift).
  for (const ev of community) {
    const at = Math.round((new Date(ev.occurred_at).getTime() - startedAt) / 1000);
    if (at < 0 || at > totalSec) continue;
    const label =
      ev.kind === "raid" ? "Raid reçu" :
      ev.kind === "subscription" ? "Nouveau sub" :
      ev.kind === "gift" || ev.kind === "subscription_gift" ? "Gift de subs" :
      "Moment communauté";
    raw.push({
      at,
      reason: label,
      reasonCode: `event_${ev.kind}`,
      conf: 75,
      title: `${label} — ${subject}`,
    });
  }

  // C. Title / category changes.
  for (const ch of changes) {
    const at = Math.round((new Date(ch.changed_at).getTime() - startedAt) / 1000);
    if (at < 30 || at > totalSec - 30) continue;
    raw.push({
      at,
      reason: ch.category_name
        ? `Changement de catégorie → ${ch.category_name}`
        : "Changement de titre",
      reasonCode: "channel_update",
      conf: 50,
      title: ch.category_name
        ? `Switch ${ch.category_name}`
        : `Changement de scène — ${subject}`,
    });
  }

  // D. Fallback if nothing strong yet — 3 windows spread across the live.
  if (raw.length === 0 && totalSec >= 180) {
    const slots = [
      { ratio: 0.15, label: "Début de live" },
      { ratio: 0.5, label: "Moment du live" },
      { ratio: 0.85, label: "Fin de live" },
    ];
    for (const slot of slots) {
      raw.push({
        at: Math.round(totalSec * slot.ratio),
        reason: `${slot.label} (suggestion sans pic détecté)`,
        reasonCode: "fallback_window",
        conf: 25,
        title: `${slot.label} — ${subject}`,
      });
    }
  }

  // Cooldown dedupe + ranking.
  raw.sort((a, b) => b.conf - a.conf || a.at - b.at);
  const kept: Raw[] = [];
  for (const r of raw) {
    if (kept.some((k) => Math.abs(k.at - r.at) < COOLDOWN_SEC)) continue;
    kept.push(r);
    if (kept.length >= MAX_CANDIDATES) break;
  }
  kept.sort((a, b) => a.at - b.at);

  const candidates: Candidate[] = kept.map((r, idx) => {
    const before = r.reasonCode.startsWith("event_") ? EVENT_BEFORE : CLIP_BEFORE;
    const after = r.reasonCode.startsWith("event_") ? EVENT_AFTER : CLIP_AFTER;
    const start = Math.max(0, r.at - before);
    const end = Math.min(totalSec, r.at + after);
    const target = rotatePlatform(idx);
    return {
      title: r.title,
      description: `Extrait du live sur ${category}. ${r.reason}. Moment estimé à ${fmtTimestamp(r.at)} du live.`,
      platform: target.platform,
      format: target.format,
      start_seconds: start,
      end_seconds: end,
      reason: r.reason,
      reason_code: r.reasonCode,
      confidence: r.conf,
      hashtags: tags,
    };
  });

  return candidates;
}

/**
 * Generates candidates for a session and inserts them into creator_content_items.
 * Idempotent: returns "exists" if there are already auto candidates for the session.
 */
export async function generateClipCandidates(
  admin: AdminClient,
  sessionId: string,
): Promise<"created" | "exists" | "no_session" | "no_signal"> {
  const { data: session } = await admin
    .from("live_sessions")
    .select(
      "id, user_id, started_at, ended_at, duration_minutes, category_name, platform_user_id, start_title",
    )
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) return "no_session";

  // Idempotency: skip if any auto candidate already exists for this session.
  const { data: existing } = await admin
    .from("creator_content_items")
    .select("id")
    .eq("live_session_id", sessionId)
    .like("reason", "auto_signal:%")
    .limit(1);
  if (existing && existing.length > 0) return "exists";

  const startedMs = new Date(session.started_at).getTime();
  const endedMs = session.ended_at ? new Date(session.ended_at).getTime() : Date.now();
  const winStart = new Date(startedMs).toISOString();
  const winEnd = new Date(endedMs).toISOString();

  const { data: snaps } = await admin
    .from("live_snapshots")
    .select("viewer_count, captured_at")
    .eq("live_session_id", sessionId)
    .order("captured_at", { ascending: true });

  let community: { kind: string; occurred_at: string }[] = [];
  let changes: { changed_at: string; title: string | null; category_name: string | null }[] = [];
  if (session.platform_user_id) {
    const { data: ce } = await admin
      .from("community_events")
      .select("kind, occurred_at")
      .eq("broadcaster_user_id", session.platform_user_id)
      .gte("occurred_at", winStart)
      .lte("occurred_at", winEnd);
    community = (ce ?? []) as typeof community;

    const { data: ch } = await admin
      .from("channel_update_history")
      .select("changed_at, title, category_name")
      .eq("broadcaster_user_id", session.platform_user_id)
      .gte("changed_at", winStart)
      .lte("changed_at", winEnd);
    changes = (ch ?? []) as typeof changes;
  }

  const candidates = detectCandidates({
    session,
    snapshots: (snaps ?? []) as { viewer_count: number; captured_at: string }[],
    community,
    changes,
  });

  if (candidates.length === 0) return "no_signal";

  const rows = candidates.map((c) => ({
    user_id: session.user_id,
    live_session_id: session.id,
    platform: c.platform,
    title: c.title.slice(0, 200),
    description: c.description,
    hashtags: c.hashtags,
    status: "to_generate",
    priority: c.confidence >= 60 ? "high" : c.confidence >= 40 ? "medium" : "low",
    format: c.format,
    reason: `auto_signal:${c.reason_code}`,
    source_platform: "twitch",
    source_start_time: c.start_seconds,
    source_end_time: c.end_seconds,
    source_duration: c.end_seconds - c.start_seconds,
    opportunity_score: c.confidence,
    opportunity_label:
      c.confidence >= 60 ? "Fort signal" :
      c.confidence >= 40 ? "Signal modéré" : "Suggestion à vérifier",
    opportunity_reason: c.reason,
  }));

  const { error } = await admin.from("creator_content_items").insert(rows);
  if (error) {
    console.error("[clipCandidates] insert error", error);
    return "no_signal";
  }
  return "created";
}
