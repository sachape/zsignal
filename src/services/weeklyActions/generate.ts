// Orchestrator: signals → maturity (in bundle) → eligible → rank → top 3.

import { ACTION_CATALOG, FALLBACK_ACTION_KEY } from "./catalog";
import { pickTop3, scoreCandidate } from "./ranking";
import type { ActionCandidate, RankedCandidate, SignalBundle } from "./types";

export interface GeneratedAction {
  position: number;
  action_key: string;
  category: ActionCandidate["category"];
  title: string;
  description: string | null;
  reason: string;
  expected_impact: string;
  difficulty: ActionCandidate["difficulty"];
  confidence: ActionCandidate["confidence"];
  verification_signal: string | null;
  auto_verifiable: boolean;
  source_type: string | null;
  source_ref_id: string | null;
  evidence: Record<string, unknown>;
  priority_score: number;
}

export interface GenerationResult {
  actions: GeneratedAction[];
  selected_action_keys: string[];
  rejected: { action_key: string; reason: string }[];
}

export function generateActions(bundle: SignalBundle): GenerationResult {
  const eligible: ActionCandidate[] = [];
  const rejected: { action_key: string; reason: string }[] = [];
  for (const c of ACTION_CATALOG) {
    if (c.eligible(bundle)) {
      eligible.push(c);
    } else {
      rejected.push({ action_key: c.action_key, reason: "not_eligible" });
    }
  }

  let ranked: RankedCandidate[] = eligible.map((c) =>
    scoreCandidate(c, bundle),
  );

  // Hard fallback when nothing eligible.
  if (ranked.length === 0) {
    const fallback = ACTION_CATALOG.find(
      (c) => c.action_key === FALLBACK_ACTION_KEY,
    );
    if (fallback) {
      ranked = [scoreCandidate(fallback, bundle)];
    }
  }

  const top = pickTop3(ranked);
  const selectedKeys = new Set(top.map((r) => r.candidate.action_key));

  // Add ranked-but-not-selected to rejected log for auditability.
  for (const r of ranked) {
    if (!selectedKeys.has(r.candidate.action_key)) {
      rejected.push({
        action_key: r.candidate.action_key,
        reason: `not_selected (score=${r.priority_score})`,
      });
    }
  }

  const actions: GeneratedAction[] = top.map((r, idx) => {
    const c = r.candidate;
    return {
      position: idx + 1,
      action_key: c.action_key,
      category: c.category,
      title: c.title,
      description: c.description ?? null,
      reason: c.reason(bundle),
      expected_impact: c.expected_impact,
      difficulty: c.difficulty,
      confidence: c.confidence,
      verification_signal: c.verification_signal ?? null,
      auto_verifiable: c.auto_verifiable ?? false,
      source_type: c.source_type ?? null,
      source_ref_id: c.source_ref(bundle),
      evidence: c.evidence(bundle),
      priority_score: r.priority_score,
    };
  });

  return {
    actions,
    selected_action_keys: actions.map((a) => a.action_key),
    rejected,
  };
}
