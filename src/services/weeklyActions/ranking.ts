// Score, dedup against recent weeks, diversify categories, cap at 3.

import type { ActionCandidate, RankedCandidate, SignalBundle } from "./types";

function confidenceWeight(c: ActionCandidate["confidence"]): number {
  return c === "high" ? 4 : c === "medium" ? 2 : 0;
}

export function scoreCandidate(
  c: ActionCandidate,
  s: SignalBundle,
): RankedCandidate {
  const { urgency, impact } = c.score(s);
  const conf = confidenceWeight(c.confidence);

  const seenRecent = s.prior_action_keys_2w.includes(c.action_key);
  const skippedRecent = s.prior_skipped_keys_2w.includes(c.action_key);
  const isCritical = c.critical?.(s) === true;
  const repetition_penalty =
    seenRecent && !skippedRecent && !isCritical ? 6 : 0;

  const everUsed = s.all_prior_action_keys.includes(c.action_key);
  const novelty_bonus = !everUsed ? 2 : 0;

  const priority_score =
    urgency + impact + conf + novelty_bonus - repetition_penalty;

  return {
    candidate: c,
    priority_score,
    breakdown: {
      urgency,
      impact,
      confidence_weight: conf,
      novelty_bonus,
      repetition_penalty,
    },
  };
}

export function pickTop3(ranked: RankedCandidate[]): RankedCandidate[] {
  const sorted = [...ranked].sort((a, b) => b.priority_score - a.priority_score);
  const picked: RankedCandidate[] = [];
  const categoriesUsed = new Map<string, number>();

  // Pass 1 — diversify (max 1 per category).
  for (const r of sorted) {
    if (picked.length >= 3) break;
    const cat = r.candidate.category;
    if ((categoriesUsed.get(cat) ?? 0) >= 1) continue;
    picked.push(r);
    categoriesUsed.set(cat, 1);
  }

  // Pass 2 — fill remaining slots ignoring diversity (max 2 per category).
  if (picked.length < 3) {
    for (const r of sorted) {
      if (picked.length >= 3) break;
      if (picked.includes(r)) continue;
      const cat = r.candidate.category;
      if ((categoriesUsed.get(cat) ?? 0) >= 2) continue;
      picked.push(r);
      categoriesUsed.set(cat, (categoriesUsed.get(cat) ?? 0) + 1);
    }
  }

  return picked;
}
