// Types shared across the weekly-actions generator.

import type { LiveDebrief, LiveSession } from "@/services/liveSessions";
import type { InactivityTier } from "@/services/inactivityRelance";
import type { StreamScoreMovement } from "@/services/streamScoreMovement";
import type { ScoreLevel } from "@/services/streamScoreHistory";

export interface StreamScoreLatestSummary {
  overall_score: number | null;
  confidence: ScoreLevel | null;
  signal_quality: ScoreLevel | null;
  priority_dimension: string | null;
  regularity: number | null;
  structure: number | null;
  content: number | null;
  positioning: number | null;
  momentum: number | null;
  monetization: number | null;
}

export type ActionCategory =
  | "consistency"
  | "positioning"
  | "content"
  | "community"
  | "monetization"
  | "discovery"
  | "setup";

export type Difficulty = "easy" | "medium" | "hard";
export type Confidence = "low" | "medium" | "high";

export type MaturityState = "setup" | "inactive" | "active" | "growth";

export interface PriorActionRef {
  action_key: string;
  status: "todo" | "done" | "skipped";
  week_start: string | null;
}

export interface SignalBundle {
  // Sessions / debriefs
  sessions_count: number;
  recent_sessions_count: number; // last 14d ended
  last_session: LiveSession | null;
  debriefs_count: number;
  latest_debrief: LiveDebrief | null;
  latest_weakness: string | null;
  latest_priority_action: string | null;

  // Inactivity
  inactivity_tier: InactivityTier;
  days_since_last: number | null;

  // Twitch event-derived signals (read-only consumers)
  channel_updates_count_14d: number;
  community_events_count_14d: number;
  community_event_kinds: string[];
  creator_alerts_count_14d: number;

  // Maturity supporting
  stream_score_latest: { overall_score: number | null } | null;
  facts: Record<string, unknown> | null;
  facts_available: boolean;

  // History
  prior_action_keys_2w: string[];
  prior_skipped_keys_2w: string[];
  all_prior_action_keys: string[];

  // Meta
  maturity_state: MaturityState;
}

export interface ScoreParts {
  urgency: number;
  impact: number;
}

export interface ActionCandidate {
  action_key: string;
  category: ActionCategory;
  title: string;
  description?: string;
  reason: (s: SignalBundle) => string;
  expected_impact: string;
  difficulty: Difficulty;
  confidence: Confidence;
  verification_signal?: string;
  auto_verifiable?: boolean;
  source_type?: string;
  source_ref: (s: SignalBundle) => string | null;
  evidence: (s: SignalBundle) => Record<string, unknown>;
  eligible: (s: SignalBundle) => boolean;
  score: (s: SignalBundle) => ScoreParts;
  /** Critical actions can repeat across weeks even when present recently. */
  critical?: (s: SignalBundle) => boolean;
}

export interface RankedCandidate {
  candidate: ActionCandidate;
  priority_score: number;
  breakdown: {
    urgency: number;
    impact: number;
    confidence_weight: number;
    novelty_bonus: number;
    repetition_penalty: number;
  };
}
