# Server-side StreamScore — phased migration plan

This is a large architecture change. I'll do it in 4 verifiable phases. Each phase is shippable on its own; the frontend keeps working as fallback until Phase 4 QA passes.

Before starting, please confirm scope (or tell me to start at Phase 1 and stop after each phase for review).

---

## Phase 1 — Audit + shared engine (no behavior change)

**Audit deliverable (returned in chat, no code change):**
- Where facts are generated today (`factsEngine.ts`, frontend only; some derived in `liveReportSource`, `twitchLiveProfile`).
- Where StreamScore is computed (`src/services/streamScoreEngine.ts`, frontend only).
- Where `analysis_reports` are inserted (`analysisRunner.ts`, `autoRefreshRunner.ts` — both client).
- Where `stream_score_snapshots` are created (DB trigger `upsert_stream_score_snapshot_from_report` on `analysis_reports` insert + `persistStreamScoreSnapshot` client helper).
- Browser-only dependencies blocking Deno port (to be confirmed during audit).

**Code change:**
- Create `supabase/functions/_shared/streamScoreEngine.ts` — pure TS, no DOM, no `import.meta`, no Supabase client. Verbatim port of current formula:
  - `computeStreamScore(facts)` → same dimensions, same weights (25/20/20/15/10/10), same cold-account cap, same no-activity cap, same followers-unavailable neutral=40, same density cap, same `videosViewWeight`.
  - Helpers: `computeScoreDimensions`, `computeScoreConfidence`, `computeScoreFreshness`, `computeSignalQuality`, `normalizeChannelFacts`.
- Update `src/services/streamScoreEngine.ts` to re-export from the shared module via a thin browser-safe wrapper (relative import allowed by Vite). If path issues arise, duplicate temporarily and add a parity test.
- Add `src/test/streamScoreParity.test.ts` running 7 fixture scenarios (active / cold / no-activity / followers-unavailable / VOD-disabled / clips-heavy / category-switch) — asserting bit-identical outputs old vs shared.

**Exit criteria:** `bunx vitest run` green, `vite build` green, no UI change.

---

## Phase 2 — `process-analysis-job` Edge Function (single job)

- New function `supabase/functions/process-analysis-job/index.ts`, `verify_jwt = false` (validates JWT in code per project pattern), CORS via `npm:@supabase/supabase-js@2/cors`.
- Modes:
  - `{ analysis_job_id }` with user JWT → ownership-checked.
  - `{ analysis_job_id, mode: "service" }` with `CRON_SECRET` header → service role.
- Pipeline:
  1. Atomic claim: `UPDATE analysis_jobs SET status='processing', started_at=now() WHERE id=$1 AND status IN ('queued','pending')` returning row.
  2. Load `connected_accounts` for `(user_id, 'twitch', platform_user_id)`. Reject if missing.
  3. Fetch Twitch facts server-side. **Reuse existing `twitch-live-fetch` function via internal invoke** to avoid duplicating Helix logic and token decryption (it already runs as the user). Returns the same shape consumed today.
  4. Port the minimal slice of `factsEngine` needed to derive the fact list into `supabase/functions/_shared/factsEngine.ts` (pure functions only).
  5. Call shared `computeStreamScore(facts)`.
  6. Assemble report (port `reportAssembler` minimal shape into `_shared/reportAssembler.ts`, or — to keep scope minimal — compute score + breakdown server-side and reuse the trigger to populate `stream_score_snapshots` from `report_data.score`). Initial cut: server writes a **minimal valid `report_data` payload** matching the JSONB schema the existing trigger expects (`identity`, `channel_summary`, `score`, `score.breakdown`).
  7. Insert into `analysis_reports` → existing triggers handle `stream_score_snapshots` + `channel_stream_scores`.
  8. Mark job `completed` (or `failed` + `last_error`).
- Idempotency: claim-by-status guarantees one insert per job. Re-invocation on `completed` returns existing `report_id` without writes.

**Risk acknowledged:** porting the full report assembler (competitors, recommendations, weekly actions) to Deno is large. Initial server output may be **score-only** (breakdown + identity + channel_summary). Frontend still runs the full assembler when the user opens the app — but the score, snapshot, and leaderboard row are authoritative from the server. Please confirm this trade-off is acceptable; otherwise Phase 2 grows significantly.

**Exit criteria:** Manual invoke with a real queued job produces `completed` row + snapshot + leaderboard entry; idempotent on second call; cross-user call rejected.

---

## Phase 3 — Batch cron processor

- Extend `process-analysis-job` with `{ mode: "queued_batch", limit?: 10 }` (cron-secret only).
- Selects up to N queued jobs, processes sequentially (avoid Helix rate-limit bursts).
- Schedule via `supabase--insert` (not migration — contains URL + key) using Vault `cron_secret` pattern already present (`verify_eventsub_cron_secret` model).
- Cron name: `analysis-job-processor-5min`, schedule `*/5 * * * *`. Skip if already scheduled.
- Stuck-job recovery: jobs in `processing` > 10min → reset to `queued` (capped retry_count).

**Migration (small, additive):**
```sql
ALTER TABLE public.analysis_jobs
  ADD COLUMN IF NOT EXISTS processed_by text,
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0;
```
(`last_error` and `started_at` already exist; no other schema change needed.)

---

## Phase 4 — Frontend deference + fallback

- `autoRefreshRunner.processPendingForAccount`:
  1. Find queued job.
  2. Invoke `process-analysis-job` with `{ analysis_job_id }`.
  3. If function returns `ok`, poll `analysis_jobs` for `completed` (max 8s), then read `analysis_reports`.
  4. If function unreachable / 5xx, fall back to existing client pipeline (unchanged code path).
- Same logic for `analysisRunner.runAnalysis` (manual analyses) — try server first, fallback to local.
- Guard against double-processing: client refuses to claim a job already in `processing`.

**No removal of client engines.** They remain as fallback per the user's explicit instruction.

---

## Out-of-scope confirmations
- ❌ No Stripe / pricing / checkout changes.
- ❌ No Twitch OAuth changes.
- ❌ No EventSub changes.
- ❌ No email copy changes (`streamscore-email-monitor` keeps reading snapshots as-is).
- ❌ No weekly-action engine changes (server emits same `report_data` shape).
- ❌ No leaderboard scoring drift: `twitch-category-indexer` audit only in Phase 1; if it has its own approximation, it stays explicitly labeled "public conservative score" (no behavior change in this task).

---

## Open questions before I start

1. **Server report scope (Phase 2):** OK to ship server-side with **score-only `report_data`** (identity + channel_summary + score + breakdown) and let the frontend continue to enrich competitors/recommendations? Or must the server produce the full report immediately (≈3x the work, requires porting `reportAssembler`, `competitorEngine`, `recommendationEngine`, `opportunityEngine` to Deno)?
2. **Facts source:** Confirm I can call `twitch-live-fetch` internally from `process-analysis-job` (cleanest — token decryption already handled there). Alternative is duplicating Helix calls + token crypto in the new function.
3. **Phase gating:** Ship all 4 phases in one go, or pause for QA review after each phase?

Once you confirm (or say "go with defaults: score-only, reuse twitch-live-fetch, ship all phases"), I'll execute.
