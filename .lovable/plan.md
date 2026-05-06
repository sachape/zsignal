# Audit — Weekly action plan / progression / recommendation system

Scope: read-only audit. No tables, edge functions, or UI changes proposed for execution yet.

---

## A. Already exists

### Database (Supabase)

| Table | Role | RLS |
|---|---|---|
| `weekly_milestones` | One row per `(user_id, week_start)`. Holds `kind` (reconstruction/stabilization/confirmation), `title`, `rationale`, `target_count`, `status` (not_started / in_progress / reached / paused), `reached_at`, source links. | Per `user_id` (full CRUD). |
| `live_debriefs` | Per-session debrief: `verdict`, `strength`, `weakness`, `priority_action`, sub-scores, `has_enough_signal`. Source of "what to fix next". | Per `user_id`. |
| `creator_alerts` | EventSub-derived alerts (raids, follow spikes, etc.) with `kind`, `title`, `body`, `severity`, `read_at`. | SELECT/UPDATE via `connected_accounts`. |
| `recommendations` | Per `analysis_job_id`, with `title`, `category`, `priority`, `is_locked`. | Via job ownership. |
| `stream_scores` | History of `overall_score` + 8 dimension scores per analysis job. | Via job ownership. |
| `live_sessions` + `live_snapshots` | Live history feeding all of the above. | Per user / via session. |

### Backend / edge functions

- `twitch-analyze` — runs `generateRecommendations` (in `recommendationEngine.ts`) and persists into `recommendations` table at analysis time.
- `live-detect` — generates a `live_debriefs` row when a session ends (writes `verdict`, `strength`, `priority_action`, `has_enough_signal`).
- `twitch-eventsub-processor` — writes `creator_alerts`.
- No edge function generates `weekly_milestones` — that is done client-side in `weeklyMilestone.ts` (`getOrCreateCurrentWeekMilestone`, upsert on first cockpit visit of the week).

### Frontend services

- `services/weeklyMilestone.ts` — picks one of 3 templates based on debrief signal, persists in `weekly_milestones`, reconciles status from `ended` session count vs `target_count`.
- `services/weeklyPlan.ts` — pure aggregator returning a `WeeklyPlanView` with: `priority` (1 main goal), `actions` (≤3 imperatives), `watch` (1 secondary line). 5 states: `in_live | no_history | inactivity | low_signal | ready`.
- `services/recommendationEngine.ts` — generates priority recs + `next-action` + `short-term-goal` from `StreamScore` + facts (used at analysis time, not weekly).
- `services/cockpitFocus.ts` — arbitrates which card owns the cockpit "focus" slot (milestone vs inactivity).
- `services/questEngine.ts` — weekly quests (verifiable + manual), checked state in `localStorage`.
- `services/prelive.ts`, `services/smartAlerts.ts`, `services/lastVsAverage.ts`, `services/inactivityRelance.ts`, `services/foundationMode.ts` — all feed cockpit blocks.

### Frontend components (cockpit)

- `WeeklyMilestoneCard` — current week cap, status badge.
- `WeeklySequenceCard` — short ordered list "what you do this week" (from `foundationMode`); links to `/plan`.
- `WeeklyQuestCard` — 3 weekly quests with progress.
- `NextMilestoneCard`, `MainBlockerCard`, `RecommendationCard`, `SmartAlertsCard`, `LiveStatusCard`, `PreLiveChecklistCard`, `LastVsAverageCard`, `InactivityRelanceCard`, `EventSubCockpitSection`, `ScoreInsightCard`, `ProgressionSignalsCard`, `FoundationModeBanner`.
- `pages/WeeklyPlanPage.tsx` (`/plan`) — full page using `buildWeeklyPlan` with localStorage-backed checkboxes for actions.

---

## B. Partially exists

1. **Action items with status (todo / done / skipped)**
   - Today: actions are plain strings rendered by `WeeklyPlanPage`, with checked state stored only in `localStorage` (`plan_checks_<user>_<week>`). Same pattern for quests (`quests_checks_…`).
   - Missing: per-action persistence in DB, `skipped` status, server-side completion signal.

2. **One plan per user per week**
   - `weekly_milestones` enforces this for the **goal** (one row per week_start). `weekly_plan` itself is **rebuilt on the fly** client-side from milestone + debriefs + signals — not persisted.

3. **Recommendations**
   - DB table exists and is populated at analysis time (linked to `analysis_job_id`), not refreshed weekly. Two parallel "reco" concepts coexist: snapshot recs (`recommendations` table) and weekly action lines (computed in `weeklyPlan.ts`). They are not unified.

4. **Diagnosis**
   - Exists implicitly as `milestone.rationale` and `debrief.priority_action` / `weakness`. There is no single "diagnosis" field on a weekly plan.

---

## C. Missing

- No `weekly_action_plans` table (header per week with diagnosis, generated_at, source signals, etc.).
- No `weekly_action_items` table (per-action rows with `status: todo|done|skipped`, `completed_at`, server-side check).
- No `creator_goals` / `next_actions` / `tasks` tables.
- No edge function that **regenerates** the weekly plan on a schedule (today: lazy generation client-side on first visit, only the milestone row is persisted).
- No history of past weekly plans (only past milestones).
- No "skipped" state anywhere.

---

## D. What the user sees today in the cockpit

`DashboardPage` composes, in order: scope drift banner → foundation banner → live status → pre-live checklist → smart alerts → weekly milestone → inactivity relance → last-vs-average → score insight → next milestone → main blocker → weekly sequence (links to `/plan`) → weekly quests → EventSub section → community/recommendations cards → recent reports.

So the user already sees: live status, alerts, channel updates, community counters, weekly milestone, top recommendations (from last analysis), debrief signals (via comparison cards), StreamScore + tier narrative, weekly quests, and a "Plan détaillé" entry to `/plan`.

---

## E. Gap vs target

| Target requirement | Status |
|---|---|
| One main goal for the week | ✅ `weekly_milestones.title` |
| Short diagnosis | 🟡 Implicit in `milestone.rationale` + last `debrief.priority_action`; no dedicated field |
| Up to 3 concrete action items | ✅ `weeklyPlan.actions` (computed, not persisted) |
| Status: todo / done / skipped | 🟡 todo/done in `localStorage` only; no `skipped`; no DB |
| Generated from real Twitch / EventSub / product signals | ✅ Already pulls from `live_sessions`, `live_debriefs`, `creator_alerts`, `prelive`, `lastVsAverage` |
| One plan per user per week | 🟡 True for milestone row; plan body itself not persisted |
| No fake data | ✅ All sources are real DB rows |
| RLS scoped by `user_id` | ✅ On every relevant table |

---

## F. Recommendation

**Reuse + extend, do not create parallel tables.**

Preferred path (smallest, most coherent change — to validate before building):

1. **Keep `weekly_milestones` as the weekly header** (one row per user/week). Add 2 nullable columns to carry the diagnosis explicitly: `diagnosis text`, `generated_signals jsonb`. No new "plan" table.
2. **Create one new table `weekly_action_items`** keyed on `weekly_milestone_id` + `position`, with `text`, `status (todo|done|skipped)`, `source` (debrief/prelive/alert/manual), `completed_at`, `skipped_reason`. RLS via `weekly_milestones.user_id`. This replaces the localStorage checkbox hack and unlocks the `skipped` state required by the target.
3. **Keep `recommendations` (analysis-job-scoped) untouched** — it is a different concept (snapshot at analysis time, surfaced on the report). Do not merge with weekly actions.
4. **Move plan generation to a small edge function** (or a server-trusted RPC) that materializes the 3 actions when the milestone is created, so the plan body is stable for the whole week instead of being recomputed on each visit.
5. **Cockpit UI**: `WeeklyMilestoneCard` + `WeeklySequenceCard` already render this — they would just bind to persisted action items instead of derived strings + `localStorage`.

Alternative "no new table" path: store `diagnosis` + `actions[]` (with status) as a `jsonb` column on `weekly_milestones`. Faster to ship, but loses per-item history, indexing, and clean RLS on individual checks. Recommended only if we explicitly want to avoid schema growth.

---

## G. Risks of duplication

- **Two "recommendation" concepts** already coexist (`recommendations` table at analysis time vs `weeklyPlan.actions` at week time). Adding a third surface (e.g. `next_actions`) would make things worse — must be avoided.
- **Quests vs actions overlap**: `WeeklyQuestCard` (3 quests with manual check) and `WeeklyPlanPage` actions both ask the user to check things off weekly. If we persist action items, we should decide whether quests stay (different intent: gamified streak) or are merged.
- **Two checkbox stores in `localStorage`** (`plan_checks_…` and `quests_checks_…`) will become stale once we move to DB; need a migration or a clean cutover.
- **Client-side milestone generation** is racy across tabs (no `unique(user_id, week_start)` mentioned in the schema dump); recommend adding that constraint before persisting more weekly data.

---

No code changes proposed in this plan — it is an audit. Next step is to choose between the **extend (new `weekly_action_items` table)** path and the **jsonb-on-milestone** path before writing any migration or component change.
