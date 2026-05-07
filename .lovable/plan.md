
# Weekly Action Outcome Tracking — MVP

Backend-only. No UI, no ranking changes, no causality claims. Observational wording only.

## 1. Database migration

New table `weekly_action_outcomes`:

```text
id                       uuid pk default gen_random_uuid()
weekly_action_item_id    uuid not null references weekly_action_items(id) on delete cascade
user_id                  uuid not null
action_key               text not null
evaluated_at             timestamptz not null default now()
window_start             timestamptz not null
window_end               timestamptz not null
outcome_status           text not null  CHECK in ('improved','flat','worse','inconclusive','too_early')
signal_kind              text not null  CHECK in ('live_sessions','twitch_clips','channel_update_stability')
dimension                text           CHECK in ('regularity','content','positioning')
before_value             numeric
after_value              numeric
delta                    numeric
confidence               text not null  CHECK in ('low','medium','high')
note                     text
evidence                 jsonb
created_at               timestamptz not null default now()
updated_at               timestamptz not null default now()

UNIQUE (weekly_action_item_id, signal_kind)   -- enables upsert
INDEX  (user_id, evaluated_at desc)
INDEX  (weekly_action_item_id)
```

`update_updated_at_column` trigger on update.

**RLS** enabled. Policies:
- `SELECT` if `auth.uid() = user_id`
- No client INSERT / UPDATE / DELETE policies → service role only.

## 2. Edge function `weekly-actions-evaluate`

`supabase/functions/weekly-actions-evaluate/index.ts`. Same auth pattern as `weekly-actions-verify` (Bearer + `verify_eventsub_cron_secret` Vault check). 401 on missing/invalid token. No secret/header values logged.

**Pipeline (service-role admin client):**
1. Select `weekly_action_items` where `status = 'done'` and `action_key` in the supported MVP set (7 keys).
2. Skip if `action_key` not in MVP scope (log `outcome_skipped_unsupported`).
3. Compute `window_start = completed_at ?? created_at`, `window_end = min(now, window_start + 7d)`.
4. If `window_end - window_start < 24h` → upsert `too_early`, `confidence='low'`, observational note. Done.
5. Otherwise dispatch by signal family (rules below) → upsert one row per `(weekly_action_item_id, signal_kind)`.
6. Never touches `weekly_action_items` (no status / completed_at / evidence writes).

**Supported keys → signal_kind:**
| action_key | signal_kind | dimension |
|---|---|---|
| `consistency_schedule_next_live` | `live_sessions` | `regularity` |
| `consistency_protect_streak` | `live_sessions` | `regularity` |
| `score_focus_regularite` | `live_sessions` | `regularity` |
| `content_create_clips_from_last_live` | `twitch_clips` | `content` |
| `score_focus_content` | `twitch_clips` | `content` |
| `positioning_stabilize_title_category` | `channel_update_stability` | `positioning` |
| `score_focus_positioning` | `channel_update_stability` | `positioning` |

### Outcome rules (deterministic)

**A. Consistency / `live_sessions`**
- Count ended `live_sessions` for `user_id` with `ended_at` in `[window_start, window_end]` and `duration_minutes >= 20`.
- Compare with prior equal-length window (`window_start - delta` to `window_start`) for baseline (when available).
- `improved` if `after_value >= 1`.
- `flat` if `after_value = 0` and window ≥ 24h.
- `inconclusive` if no `connected_account` (data unavailable).
- `confidence`: `medium` if baseline present, `low` otherwise.
- Note: *"Signal positif observé après l'action : un live valide a eu lieu après la complétion."* / *"Pas encore assez de signal pour conclure."*

**B. Content / `twitch_clips`**
- Count `twitch_clip_snapshots` rows for `user_id` with `clip_created_at` in `(window_start, window_end]`.
- `improved` if `after_value >= 2`.
- `flat` if `after_value <= 1` and window ≥ 24h.
- `inconclusive` if no broadcaster id.
- `confidence`: `medium` if any clips ingested in last 30d, `low` otherwise.
- Note: *"Signal positif observé après l'action : N nouveaux clips ont été détectés."*

**C. Positioning / `channel_update_stability`**
- `current_count` = `channel_update_history` for broadcaster between `window_start` and `window_end`.
- `baseline_count` = same source over the prior equal-length window.
- `ended_lives_in_window` = ended `live_sessions` in window for `user_id`.
- Require `ended_lives_in_window >= 1`, else `inconclusive`.
- `improved` if `current_count < baseline_count` (clear decrease, at least −1 absolute and `current <= floor(baseline/2)`).
- `worse` if `current_count > baseline_count` AND `current_count - baseline_count >= 2`.
- `flat` otherwise.
- `inconclusive` if no broadcaster or baseline is 0 and current 0.
- `confidence`: `medium` if `baseline_count >= 2`, `low` otherwise.
- Note: *"Signal positif observé après l'action : moins de changements de titre/catégorie ont été détectés."*

### Evidence (per row)

Allowed only:
```json
{
  "supported_action_key": "...",
  "window_start": "...",
  "window_end": "...",
  "before_value": 0,
  "after_value": 0,
  "delta": 0,
  "baseline_count": 0,
  "current_count": 0,
  "ended_lives_in_window": 0,
  "evaluated_by": "weekly-actions-evaluate"
}
```
Forbidden: raw Twitch payloads, tokens, Authorization, `analysis_job_id`, actor hashes, foreign-table evidence blobs.

### Logs

Structured `console.log` keys (no values from secrets):
- `outcome_evaluation_started` (counts only)
- `outcome_evaluated` (item_id, signal_kind, outcome_status, confidence)
- `outcome_skipped_unsupported` (action_key)
- `outcome_too_early` (item_id, age_minutes)
- `outcome_evaluation_finished` (counts)
- `outcome_evaluation_error` (item_id, error_message)

Returns `{ success, candidates, evaluated, skipped, errors }`.

## 3. Cron schedule

Insert (via insert tool, not migration — contains project-specific URL + anon key):

```sql
SELECT cron.schedule(
  'weekly-actions-evaluate-daily',
  '15 3 * * *',  -- daily at 03:15 UTC
  $$
    SELECT net.http_post(
      url := 'https://poblhczgdbnfunroshul.supabase.co/functions/v1/weekly-actions-evaluate',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'eventsub_cron_secret' LIMIT 1)
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
```

Guarded with `WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-actions-evaluate-daily')` to avoid duplicates.

## 4. QA (executed against the live DB with isolated synthetic data)

A separate Vitest spec `src/test/outcomes-mvp.test.ts` runs cases A–J using a synthetic auth user + service-role admin client; the file is deleted after the run, leaving no production impact.

- **A** Consistency improved (live within window) → `improved`, `signal_kind=live_sessions`.
- **B** Consistency flat (no live, ≥24h window) → `flat`.
- **C** Content improved (2 clips after completion) → `improved`, `after_value>=2`.
- **D** Content flat (0 clips, ≥24h) → `flat`.
- **E** Positioning improved (high baseline, low current, 1 ended live) → `improved`.
- **F** Too early (<24h since completion) → `too_early`, `confidence=low`.
- **G** Protection: `skipped`, `todo`, unsupported `action_key` → no outcome row.
- **H** Idempotency: run function twice → unique row count unchanged, row updated.
- **I** Privacy: outcome row contains no `analysis_job_id`, no raw payload, no token, no actor hash.
- **J** Cleanup: delete all synthetic rows + auth user; verify counts = 0; legacy `stream_scores` untouched.

QA invokes the deployed function via `supabase.functions.invoke('weekly-actions-evaluate', ...)` using the cron secret in the Authorization header.

## Files changed

- **NEW** `supabase/functions/weekly-actions-evaluate/index.ts`
- **NEW** migration: `weekly_action_outcomes` table + RLS + indexes + trigger
- **NEW** insert (cron schedule SQL)
- **TEMP** `src/test/outcomes-mvp.test.ts` (created for QA, deleted after)

## Out of scope (explicit)

- No UI changes
- No ranking feedback (`prior_action_keys_2w` etc. unchanged)
- No `stream_score_dimension` outcomes
- No community / monetization / setup / debrief / discovery / score_refresh outcomes
- `live_debriefs`, `weekly_quests`, `recommendations`, OAuth, EventSub, legacy `stream_scores` untouched
- No raw Twitch payload parsing, no token exposure
