## Goal

Produce a single, comprehensive Markdown audit at `/mnt/documents/streamnco-audit-2026-05-15.md` that documents every Streamnco feature, backend pipeline, cron job, table, and risk after the latest reliability and product fixes. No code, schema, UI, or deployment changes.

## Deliverable

- One Markdown file (~25–40 pages) following the exact 13-section structure you specified, in English, with French quoted copy where it appears in the product.
- Surfaced via a `<presentation-artifact>` tag so it is downloadable.
- All claims cross-referenced to real files / tables / functions / cron jobs. Anything I cannot verify will be marked `unknown` or `not found` rather than invented.

## Method (read-only)

1. **Codebase sweep** (parallel):
   - `supabase/functions/*/index.ts` for every edge function listed in your spec + any others present.
   - `supabase/functions/_shared/*` for shared logic (clip ingest, score, email, eventsub).
   - `src/pages/*`, `src/components/*`, `src/services/*`, `src/hooks/*` to map UI features to data sources.
   - `src/App.tsx` for the route map.
   - `supabase/migrations/*` to enumerate schema, triggers, indexes added since previous audit.
2. **Database introspection** (read-only via `supabase--read_query`):
   - Confirm RLS policies, columns, unique constraints for every table in section 6.
   - List active `cron.job` rows: name, schedule, command target — to fill section 7 cron map and confirm `twitch-clips-ingest-hourly` exists.
   - Spot-check `channel_stream_scores`, `stream_score_snapshots`, `analysis_reports` for shape only (no PII).
3. **Cross-reference with chat history** for the recent fixes you listed (cron realignment, auto_weekly, preview-transactional-email, Growth pricing/multi-account, /streamscore, indexer pipeline, StreamScore tab, clips batch + dedupe).
4. **No writes**, no deploys, no migrations, no destructive ops.

## Output structure (exact)

The Markdown file will contain these top-level sections in this order:

```
1.  Executive summary
2.  Changes completed since previous audit
    A. Cron reliability
    B. auto_weekly
    C. preview-transactional-email
    D. Exports / pricing honesty
    E. Growth multi-account UI
    F. /streamscore page
    G. Category leaderboard indexing
    H. twitch-clips-ingest batch mode
3.  Feature inventory  (A–L groups)
4.  End-to-end flows  (Flow 1–10, each: frontend files / edge functions / tables / cron / failure modes / status)
5.  StreamScore deep dive  (A. Purpose → H. Limitations)
6.  Database map  (one row per table, all tables you listed)
7.  Edge functions and cron map  (two tables: functions, crons)
8.  Real vs placeholder matrix
9.  Current risks and gaps  (A. Critical → E. Scalability)
10. Recommended next backend priorities  (ranked, effort/risk/next step)
11. Recommended next product/UI priorities  (ranked)
12. What Streamnco can do today
13. What Streamnco cannot fully guarantee yet
```

## Honesty rules I will apply

- Each feature gets a status: **real / partial / placeholder / planned** with concrete evidence (file path, table, cron name).
- Anything client-side-only (e.g. StreamScore engine if still in `src/`, active account in localStorage) is flagged in section 8 and section 9.
- Leaderboard coverage is described as non-exhaustive; PNG/PDF export claims reflect what's actually shipped.
- Cron jobs are listed only if I can confirm them in `cron.job`; ones that may be out-of-band (e.g. `process-email-queue`) are flagged.

## What I will NOT do

- No file edits in `src/`, `supabase/functions/`, or `supabase/migrations/`.
- No `INSERT` / `UPDATE` / `DELETE` / `cron.schedule` / `cron.unschedule`.
- No edge function deploys.
- No invented features. If a feature mentioned in your spec doesn't exist in the repo, it will be marked `not found`.

## Estimated execution (after approval)

- ~6–10 read tool calls (codebase + db introspection in parallel batches)
- 1 file write (`/mnt/documents/streamnco-audit-2026-05-15.md`)
- 1 `presentation-artifact` reference for download

Approve to run the audit and generate the file.