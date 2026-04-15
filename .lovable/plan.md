

# Step 3a — Twitch Foundation Without Live Credentials

## Overview

Build the full structural foundation for Twitch connection and analysis so that plugging in live credentials later requires minimal rework. No real API calls, no secrets needed.

---

## 1. Database Migration

The `connected_accounts` table already exists with correct schema and RLS. No changes needed there.

**New tables** (single migration):

| Table | Key columns | Purpose |
|---|---|---|
| `analysis_jobs` | id, user_id, channel_name, status (queued/processing/done/failed), started_at, completed_at, created_at | Tracks analysis runs |
| `twitch_profiles` | id, user_id, twitch_user_id, login, display_name, description, profile_image_url, view_count, follower_count, broadcaster_type, fetched_at | Cached Twitch profile data |
| `twitch_videos` | id, analysis_job_id, twitch_video_id, title, view_count, duration, created_at | Recent VODs |
| `twitch_clips` | id, analysis_job_id, twitch_clip_id, title, view_count, creator_name, created_at | Top clips |
| `channel_facts` | id, analysis_job_id, fact_key, fact_value, confidence, created_at | Key-value facts extracted from data |
| `stream_scores` | id, analysis_job_id, overall_score, regularity, engagement, growth, discoverability, content_quality, community, monetization_readiness, affiliate_progress, created_at | StreamScore breakdown |
| `competitor_matches` | id, analysis_job_id, competitor_login, display_name, similarity_score, follower_count, avg_viewers, created_at | Matched competitors |
| `recommendations` | id, analysis_job_id, priority, title, description, category, is_locked, created_at | Action items |
| `analysis_reports` | id, analysis_job_id, user_id, channel_summary, report_data (jsonb), created_at | Final compiled report |

All tables: RLS enabled, user can only access own data (via user_id or join through analysis_job).

## 2. New Routes & Components

**Route: `/twitch/callback`** — new `TwitchCallbackPage.tsx`
- Reads `code` and `error` from query params
- States: processing (spinner), success (redirect to /connect-twitch?connected=true), cancelled, error
- Will call the edge function when live — for now shows processing then redirects with mock success

**Updated: `/connect-twitch`** — refactored `ConnectTwitchPage.tsx`
- Reads `connected` query param and checks `connected_accounts` table
- States: default (current trust page), loading, success ("Compte connecté"), already-connected, error
- "Connect Twitch" button builds the OAuth URL (using a `TWITCH_CLIENT_ID` env var placeholder — non-functional until credentials arrive)

## 3. Edge Function Stubs

**`supabase/functions/twitch-oauth/index.ts`**
- Accepts `{ code, redirect_uri }` POST
- Structure: validate input, exchange code for token (commented out real call), store in `connected_accounts`
- Returns `{ success, platform_login }` or error
- Full CORS support, JWT validation in code

**`supabase/functions/twitch-analyze/index.ts`**
- Accepts `{ channel_name }` POST
- Structure: create analysis_job, fetch profile (stub), fetch videos (stub), compute score (stub), generate recommendations (stub), compile report
- Returns job_id
- Placeholder logic only — ready for real Twitch API calls later

## 4. TypeScript Types & Service Contracts

**`src/types/analysis.ts`** — all domain types:
- `AnalysisJob`, `TwitchProfile`, `StreamScore`, `CompetitorMatch`, `Recommendation`, `AnalysisReport`, `ChannelSummary`, `AffiliateProgress`

**`src/services/` directory** — one file per engine:
- `twitchOAuth.ts` — `initiateTwitchOAuth()`, `completeTwitchCallback(code)`
- `twitchIngestion.ts` — `fetchTwitchProfile(login)`, `fetchRecentVideos(userId)`, `fetchTopClips(userId)`
- `factsEngine.ts` — `extractChannelFacts(profile, videos, clips)`
- `streamScoreEngine.ts` — `computeStreamScore(facts)`
- `competitorEngine.ts` — `findCompetitors(profile, facts)`
- `recommendationEngine.ts` — `generateRecommendations(score, facts, competitors)`

Each exports typed async functions with TODO bodies. No fake heavy logic.

## 5. Mock Data & Page Wiring

**`src/data/mockAnalysis.ts`** — single typed mock `AnalysisReport` matching the real contract. Used by `/result` and `/analyze`.

**`/analyze` refactor**: imports `AnalysisJob` type, simulates job status progression, navigates to `/result` with job reference.

**`/result` refactor**: consumes `AnalysisReport` type from mock data instead of scattered inline values. Same UI, but data flows through the typed contract.

## 6. Hook

**`src/hooks/useTwitchConnection.ts`** — queries `connected_accounts` for current user's Twitch connection. Returns `{ isConnected, account, loading }`.

## 7. Files Changed Summary

- 1 migration (9 new tables)
- 2 edge function stubs
- 1 types file
- 6 service files
- 1 mock data file
- 1 hook
- 1 new page (TwitchCallbackPage)
- 3 updated pages (ConnectTwitchPage, AnalyzePage, ResultPage)
- App.tsx (add /twitch/callback route)

No secrets required. No live Twitch calls. Full structural readiness.

