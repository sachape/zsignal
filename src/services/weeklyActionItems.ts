// Weekly action items — persisted weekly plan actions.
//
// Reuses the existing weeklyMilestone + weeklyPlan logic to derive up to 3
// concrete actions, then persists them in `weekly_action_items` so the plan
// is stable for the entire week and survives reloads/tabs.

import { supabase } from "@/integrations/supabase/client";
import type { LiveDebrief, LiveSession } from "@/services/liveSessions";
import type { WeeklyMilestoneRow, MilestoneView } from "@/services/weeklyMilestone";
import { buildWeeklyPlan } from "@/services/weeklyPlan";

export type ActionStatus = "todo" | "done" | "skipped";
export type ActionCategory =
  | "consistency"
  | "positioning"
  | "content"
  | "community"
  | "monetization"
  | "discovery"
  | "setup";

export interface WeeklyActionItem {
  id: string;
  weekly_milestone_id: string;
  user_id: string;
  position: number;
  title: string;
  description: string | null;
  reason: string | null;
  expected_impact: string | null;
  category: ActionCategory;
  source: string | null;
  status: ActionStatus;
  completed_at: string | null;
  skipped_at: string | null;
  skipped_reason: string | null;
  created_at: string;
  updated_at: string;
}

interface SeedAction {
  title: string;
  reason?: string | null;
  expected_impact?: string | null;
  category: ActionCategory;
  source?: string | null;
}

// --- Diagnosis builder ----------------------------------------------------

function buildDiagnosis(
  milestone: MilestoneView,
  recentSessions: LiveSession[],
  recentDebriefs: Map<string, LiveDebrief>,
): string {
  const ended = recentSessions.filter((s) => s.status === "ended");
  if (ended.length === 0) {
    return "Pas encore assez de signaux. Connecte Twitch et lance un premier live pour générer un plan plus précis.";
  }
  const lastDebrief = ended
    .map((s) => recentDebriefs.get(s.id))
    .find((d): d is LiveDebrief => Boolean(d));

  if (milestone.row.kind === "reconstruction") {
    return "Ton enjeu principal est de reprendre une régularité minimale avant d'optimiser le contenu.";
  }
  if (lastDebrief?.weakness) {
    const action = lastDebrief.priority_action
      ? ` Priorité : ${lastDebrief.priority_action}`
      : "";
    return `Point faible repéré au dernier live : ${lastDebrief.weakness}.${action}`;
  }
  if (lastDebrief?.priority_action) {
    return `Priorité issue du dernier débrief : ${lastDebrief.priority_action}`;
  }
  return milestone.row.rationale;
}

// --- Action seeding -------------------------------------------------------

function categorize(text: string): ActionCategory {
  const t = text.toLowerCase();
  if (/(rythme|cadence|créneau|planning|régul)/.test(t)) return "consistency";
  if (/(catégor|titre|positionn|format)/.test(t)) return "positioning";
  if (/(clip|vod|contenu|highlight)/.test(t)) return "content";
  if (/(discord|communaut|viewer|chat)/.test(t)) return "community";
  if (/(affili|sub|monétis|don)/.test(t)) return "monetization";
  if (/(découverte|directory|seo|tag)/.test(t)) return "discovery";
  return "setup";
}

function buildSeedActions(
  milestone: MilestoneView,
  current: LiveSession | null,
  recentSessions: LiveSession[],
  recentDebriefs: Map<string, LiveDebrief>,
): SeedAction[] {
  const plan = buildWeeklyPlan({
    current,
    recentSessions,
    recentDebriefs,
    milestone,
  });
  const titles = plan.actions.slice(0, 3);
  const lastDebrief = recentSessions
    .map((s) => recentDebriefs.get(s.id))
    .find((d): d is LiveDebrief => Boolean(d));

  return titles.map((title, idx) => ({
    title,
    reason:
      idx === 0 && lastDebrief?.priority_action === title
        ? "Priorité issue du dernier débrief."
        : null,
    expected_impact:
      idx === 0
        ? "Premier levier à activer cette semaine."
        : null,
    category: categorize(title),
    source: "weeklyPlan",
  }));
}

// --- Persistence ----------------------------------------------------------

async function listForMilestone(
  milestoneId: string,
): Promise<WeeklyActionItem[]> {
  const { data } = await supabase
    .from("weekly_action_items")
    .select("*")
    .eq("weekly_milestone_id", milestoneId)
    .order("position", { ascending: true });
  return (data as WeeklyActionItem[] | null) ?? [];
}

async function updateMilestoneDiagnosis(
  milestoneId: string,
  diagnosis: string,
  signals: Record<string, unknown>,
): Promise<void> {
  await supabase
    .from("weekly_milestones")
    .update({
      diagnosis,
      // Cast: jsonb in DB; Supabase types want Json shape.
      generated_signals: signals as unknown as never,
      generated_at: new Date().toISOString(),
    })
    .eq("id", milestoneId);
}

/**
 * Ensure the milestone has a diagnosis + up to 3 action items.
 * Idempotent: if items exist, returns them as-is.
 */
export async function ensureWeeklyActionItems(
  userId: string,
  milestone: MilestoneView,
  current: LiveSession | null,
  recentSessions: LiveSession[],
  recentDebriefs: Map<string, LiveDebrief>,
): Promise<{ milestone: WeeklyMilestoneRow; items: WeeklyActionItem[] }> {
  const existing = await listForMilestone(milestone.row.id);
  let row = milestone.row;

  if (existing.length > 0) {
    // Backfill diagnosis if it was missing on an older milestone row.
    if (!row.diagnosis) {
      const diagnosis = buildDiagnosis(milestone, recentSessions, recentDebriefs);
      await updateMilestoneDiagnosis(row.id, diagnosis, {
        sessions_count: recentSessions.length,
        debriefs_count: recentDebriefs.size,
      });
      row = { ...row, diagnosis } as WeeklyMilestoneRow;
    }
    return { milestone: row, items: existing };
  }

  const diagnosis = buildDiagnosis(milestone, recentSessions, recentDebriefs);
  await updateMilestoneDiagnosis(row.id, diagnosis, {
    sessions_count: recentSessions.length,
    debriefs_count: recentDebriefs.size,
    last_debrief_id: recentSessions
      .map((s) => recentDebriefs.get(s.id)?.id)
      .find((x): x is string => Boolean(x)) ?? null,
  });
  row = { ...row, diagnosis } as WeeklyMilestoneRow;

  const seeds = buildSeedActions(milestone, current, recentSessions, recentDebriefs);
  if (seeds.length === 0) {
    return { milestone: row, items: [] };
  }

  const payload = seeds.map((s, idx) => ({
    weekly_milestone_id: milestone.row.id,
    user_id: userId,
    position: idx + 1,
    title: s.title,
    reason: s.reason ?? null,
    expected_impact: s.expected_impact ?? null,
    category: s.category,
    source: s.source ?? null,
  }));

  const { error } = await supabase
    .from("weekly_action_items")
    .insert(payload);

  // If a parallel tab inserted first, the unique(milestone, position)
  // constraint will fire — re-read instead of failing the UI.
  if (error && !/duplicate|unique/i.test(error.message)) {
    console.warn("[weeklyActionItems] insert failed", error);
  }

  const items = await listForMilestone(milestone.row.id);
  return { milestone: row, items };
}

export async function setActionStatus(
  itemId: string,
  status: ActionStatus,
  skippedReason?: string | null,
): Promise<void> {
  const patch: Partial<WeeklyActionItem> = { status };
  if (status === "done") {
    patch.completed_at = new Date().toISOString();
    patch.skipped_at = null;
    patch.skipped_reason = null;
  } else if (status === "skipped") {
    patch.skipped_at = new Date().toISOString();
    patch.completed_at = null;
    patch.skipped_reason = skippedReason ?? null;
  } else {
    patch.completed_at = null;
    patch.skipped_at = null;
    patch.skipped_reason = null;
  }
  await supabase.from("weekly_action_items").update(patch).eq("id", itemId);
}
