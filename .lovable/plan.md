
# Smarter Weekly Action Items

Make `weekly_action_items` contextual, less repetitive, and signal-driven — without breaking the current "stable for the week" guarantee.

## 1. Database migration

Add nullable metadata columns to `weekly_action_items`:

- `action_key text`
- `priority_score integer`
- `confidence text` — CHECK in (`low`,`medium`,`high`)
- `difficulty text` — CHECK in (`easy`,`medium`,`hard`)
- `verification_signal text`
- `auto_verifiable boolean default false`
- `source_type text`
- `source_ref_id text`
- `evidence jsonb`

Index: `(user_id, action_key, created_at desc)` to support cross-week dedup lookups.

No changes to: `recommendations`, `weekly_quests`, EventSub tables, `weekly_milestones` columns.

## 2. New service modules

```text
src/services/weeklyActions/
├── catalog.ts          # Static catalog of ActionCandidate definitions
├── signals.ts          # Extract signals from DB into a typed bundle
├── maturity.ts         # Deterministic classifier → 'setup'|'inactive'|'active'|'growth'
├── ranking.ts          # Score + diversify + dedup against last 2 weeks
├── diagnosis.ts        # Richer buildDiagnosis using full signal bundle
└── generate.ts         # Orchestrates: signals → maturity → eligible → rank → top 3
```

`weeklyActionItems.ts` keeps `ensureWeeklyActionItems` / `setActionStatus` / `listForMilestone` and delegates generation to `generate.ts`. Existing `categorize()` regex stays only as a legacy fallback if a candidate ever omits a category.

## 3. Action catalog (`catalog.ts`)

Each entry:

```ts
interface ActionCandidate {
  action_key: string;
  category: ActionCategory;
  title: string;
  description?: string;
  reason: (s: SignalBundle) => string;
  expected_impact: string;
  difficulty: 'easy' | 'medium' | 'hard';
  confidence: 'low' | 'medium' | 'high';
  verification_signal?: string;   // stored, not used yet
  auto_verifiable?: boolean;
  source_type?: string;
  source_ref: (s: SignalBundle) => string | null;
  evidence: (s: SignalBundle) => Record<string, unknown>;
  eligible: (s: SignalBundle) => boolean;
  score: (s: SignalBundle) => { urgency: number; impact: number; novelty: number };
}
```

Initial catalog covers the 6 examples in the request:
`setup_complete_twitch_foundation`, `consistency_schedule_next_live`, `content_create_clips_from_last_live`, `positioning_stabilize_title_category`, `community_reinforce_momentum`, `debrief_fix_priority_weakness` — plus 3–4 supporting variants per maturity tier so `growth` and `active` users get more than just one option (e.g. `consistency_protect_streak`, `discovery_review_tags_category`, `monetization_review_affiliate_path`).

## 4. Signal extraction (`signals.ts`)

Single `loadSignalBundle(userId)` returning:

```ts
{
  sessions_count, recent_sessions_count, last_session,
  debriefs_count, latest_debrief, latest_weakness, latest_priority_action,
  inactivity_tier,
  channel_updates_count_14d,
  community_events_count_14d, community_event_kinds,
  stream_score_latest,                       // null if absent
  facts: { broadcaster_type, follower_count, avg_viewers, ... } | null,
  facts_available: boolean,
  prior_action_keys_2w: string[],            // for novelty/repetition
  prior_skipped_keys_2w: string[],
}
```

Reads (RLS-scoped, user-side queries):
- `live_sessions` last 30d
- `live_debriefs` for those sessions
- `creator_alerts` last 14d (via broadcaster_user_id from `connected_accounts`)
- `channel_update_history` last 14d
- `community_events` last 14d
- `stream_scores` latest (joined via `analysis_jobs`)
- `analysis_reports` latest `report_data.facts`
- `weekly_action_items` user_id, last 2 weeks (action_key, status)

Missing signals are recorded as nulls + `availability` flags inside `generated_signals`.

## 5. Maturity classifier (`maturity.ts`)

Deterministic rules, in order:
1. **setup** — `sessions_count < 2` OR `debriefs_count === 0` OR all recent debriefs `has_enough_signal === false`
2. **inactive** — inactivity_tier in (`soft`,`paused`,`rebuild`)
3. **growth** — recent sessions ≥ 2 AND (`community_events_count_14d ≥ 3` OR `stream_score_latest.overall_score ≥ 60` OR latest debrief `strength` present)
4. **active** — fallback when sessions exist but signals are weak

State stored in `weekly_milestones.generated_signals.maturity_state`.

## 6. Ranking (`ranking.ts`)

```text
priority_score =
  urgency + impact + confidenceWeight - repetition_penalty + novelty_bonus
```

- `confidenceWeight`: low=0, medium=2, high=4
- `repetition_penalty`: +6 if action_key seen in last 2 weeks AND not skipped/critical
- `novelty_bonus`: +2 if action_key never used by this user
- Pick top by score, then enforce diversification: max 1 per category among the final 3 (relax to 2 only if no other eligible candidate exists)
- Always cap at 3
- If no candidate is eligible → fall back to `setup_complete_twitch_foundation`

## 7. Diagnosis (`diagnosis.ts`)

Layered, picks the most specific applicable line:
- setup → "Pas encore assez de signaux…"
- inactive → "Ton enjeu principal est de reprendre une régularité minimale…"
- positioning instability (`channel_updates_count_14d ≥ 3`) → "Tes changements récents de titre ou de catégorie…"
- community momentum (`community_events_count_14d ≥ 3`) → "Tu as eu des signaux communautaires récents…"
- debrief weakness present → "Ton dernier débrief montre que le principal levier est : [priority_action]"
- otherwise → existing milestone rationale

## 8. Generation flow (`generate.ts`)

```text
ensureWeeklyActionItems(milestone)
  → if items already exist for milestone → return as-is (no overwrite)
  → loadSignalBundle()
  → maturity = classify(bundle)
  → eligibleCandidates = catalog.filter(c.eligible(bundle))
  → ranked = rank(eligibleCandidates, bundle)
  → top3 = pick(ranked)
  → write generated_signals (full bundle summary + maturity + selected/rejected keys)
  → write diagnosis
  → INSERT 3 action items with all metadata fields
  → on unique violation (parallel tab) → re-read and return
```

Status updates (`setActionStatus`) unchanged.

## 9. UI updates (presentation only)

- `WeeklyMilestoneCard` and `WeeklyPlanPage` already render title + reason + expected_impact. Add `description` line (small muted) and an optional difficulty chip (`Facile` / `Moyen` / `Avancé`) — only when value present.
- Hide internal fields: `action_key`, `priority_score`, `evidence`, `source_ref_id`, `verification_signal`, `auto_verifiable`.
- Keep existing status controls and shadcn cockpit styling.

## 10. Out of scope (explicitly NOT done)

- No new tables (`weekly_action_plans`, `next_actions`, `creator_goals`).
- No auto-completion logic — `verification_signal` and `auto_verifiable` are stored only.
- No EventSub changes, no `weekly_quests` changes, no `recommendations` merge.
- No regeneration for the current week if items already exist.

## 11. QA scenarios to validate manually after build

A. New streamer → maturity=setup, action=`setup_complete_twitch_foundation`, diagnosis honest.
B. Inactive → maturity=inactive, action=`consistency_schedule_next_live`, no monetization advice.
C. Active + recent live, no clips → `content_create_clips_from_last_live` with reason citing missing reuse signal.
D. Repeated title/category changes → `positioning_stabilize_title_category` with channel_update evidence.
E. Recent follows/subs → `community_reinforce_momentum` with community_events evidence.
F. Same weakness as last week → `debrief_fix_priority_weakness` deprioritized via repetition_penalty unless skipped.

## Acceptance checklist

- migration applied, no destructive changes
- `weekly_action_items` gains 9 nullable columns
- candidates emit category directly; regex only as fallback
- max 3 actions, stable for the week, no overwrite
- generated_signals contains full bundle + maturity + selected/rejected action_keys
- diagnosis is signal-specific
- no fake data, no tokens, RLS preserved
