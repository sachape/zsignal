// Weekly action items — persisted weekly plan actions.
//
// Public API preserved. Generation now delegates to the structured
// weeklyActions catalog + ranking pipeline. Stable for the week:
// existing items are NEVER overwritten.

import { supabase } from "@/integrations/supabase/client";
import type { LiveDebrief, LiveSession } from "@/services/liveSessions";
import type {
  WeeklyMilestoneRow,
  MilestoneView,
} from "@/services/weeklyMilestone";
import { loadSignalBundle, summarizeBundle } from "./weeklyActions/signals";
import { generateActions } from "./weeklyActions/generate";
import { buildDiagnosisFromBundle } from "./weeklyActions/diagnosis";
import type {
  ActionCategory,
  Confidence,
  Difficulty,
} from "./weeklyActions/types";

export type ActionStatus = "todo" | "done" | "skipped";
export type { ActionCategory } from "./weeklyActions/types";

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
  // New metadata
  action_key: string | null;
  priority_score: number | null;
  confidence: Confidence | null;
  difficulty: Difficulty | null;
  verification_signal: string | null;
  auto_verifiable: boolean;
  source_type: string | null;
  source_ref_id: string | null;
  evidence: Record<string, unknown> | null;
}

// --- Persistence helpers -------------------------------------------------

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
): Promise<WeeklyMilestoneRow | null> {
  const { data } = await supabase
    .from("weekly_milestones")
    .update({
      diagnosis,
      generated_signals: signals as unknown as never,
      generated_at: new Date().toISOString(),
    })
    .eq("id", milestoneId)
    .select("*")
    .maybeSingle();
  return (data as WeeklyMilestoneRow | null) ?? null;
}

/**
 * Ensure the milestone has a diagnosis + up to 3 action items.
 * Idempotent: if items exist, returns them as-is (no overwrite).
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
    // Backfill diagnosis if missing on an older row — keep items untouched.
    if (!row.diagnosis) {
      const bundle = await loadSignalBundle(userId, {
        current,
        recentSessions,
        recentDebriefs,
      });
      const diagnosis = buildDiagnosisFromBundle(bundle, row.rationale);
      const updated = await updateMilestoneDiagnosis(
        row.id,
        diagnosis,
        summarizeBundle(bundle),
      );
      row = updated ?? ({ ...row, diagnosis } as WeeklyMilestoneRow);
    }
    return { milestone: row, items: existing };
  }

  // No items yet → generate.
  const bundle = await loadSignalBundle(userId, {
    current,
    recentSessions,
    recentDebriefs,
  });
  const result = generateActions(bundle);
  const diagnosis = buildDiagnosisFromBundle(bundle, row.rationale);

  const signalsForRow: Record<string, unknown> = {
    ...summarizeBundle(bundle),
    selected_action_keys: result.selected_action_keys,
    rejected_action_keys: result.rejected,
  };

  await updateMilestoneDiagnosis(row.id, diagnosis, signalsForRow);
  row = { ...row, diagnosis } as WeeklyMilestoneRow;

  if (result.actions.length === 0) {
    return { milestone: row, items: [] };
  }

  const payload = result.actions.map((a) => ({
    weekly_milestone_id: milestone.row.id,
    user_id: userId,
    position: a.position,
    title: a.title,
    description: a.description,
    reason: a.reason,
    expected_impact: a.expected_impact,
    category: a.category,
    source: "weeklyActionsCatalog",
    action_key: a.action_key,
    priority_score: a.priority_score,
    confidence: a.confidence,
    difficulty: a.difficulty,
    verification_signal: a.verification_signal,
    auto_verifiable: a.auto_verifiable,
    source_type: a.source_type,
    source_ref_id: a.source_ref_id,
    evidence: a.evidence as unknown as never,
  }));

  const { error } = await supabase.from("weekly_action_items").insert(payload);

  // Parallel-tab safety: unique(milestone, position) blocks dupes — re-read.
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
  await supabase
    .from("weekly_action_items")
    .update(patch as never)
    .eq("id", itemId);
}
