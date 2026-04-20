

# Switch backend to external Supabase project `upnkprejbknbfsrwbmys`

## What this changes

Disconnect from the current Lovable Cloud backend (project `poblhczgdbnfunroshul`) and connect the app to the external Supabase project `upnkprejbknbfsrwbmys` for auth, database, storage, and edge functions.

## Important caveat (please read)

Lovable does not support migrating an already-Cloud-enabled project to an externally-managed Supabase project from inside the agent. Lovable Cloud cannot be disabled on this project once enabled — `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`, `.env`, and `supabase/config.toml` are auto-managed and pinned to the Cloud project ref `poblhczgdbnfunroshul`.

To use external project `upnkprejbknbfsrwbmys` instead, you have two real options:

### Option A — Recommended: stay on Lovable Cloud
Keep the current connected backend. Everything (auth, DB, edge functions, storage) already works. No migration needed.

### Option B — Move to external Supabase project `upnkprejbknbfsrwbmys`
This requires steps that must be done by you, outside the agent:

1. In Lovable, open the project's **Connectors → Supabase** panel and connect external project `upnkprejbknbfsrwbmys` (you'll authorize Lovable in the Supabase dashboard). This re-points `src/integrations/supabase/client.ts`, `.env`, and `supabase/config.toml` to the new project. The agent cannot trigger this OAuth flow.
2. In the Supabase dashboard for `upnkprejbknbfsrwbmys`, replicate the schema currently in `poblhczgdbnfunroshul`:
   - Tables: `profiles`, `connected_accounts`, `twitch_profiles`, `analysis_jobs`, `analysis_reports`, `channel_facts`, `competitor_matches`, `competitor_feedback`, `recommendations`, `stream_scores`, `twitch_clips`, `twitch_videos`
   - RLS policies (same as current)
   - Functions: `handle_new_user`, `update_updated_at_column`
   - Trigger on `auth.users` to call `handle_new_user` on signup (currently missing — see note below)
3. Re-add secrets in the new project: `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, `LOVABLE_API_KEY`.
4. Redeploy edge functions: `twitch-oauth`, `twitch-analyze`, `twitch-live-fetch`, `twitch-public-lookup`, `twitch-refresh-enqueue`.
5. Re-run `supabase/migrations/` against the new project.

Once steps 1–5 are done, I can verify signup end-to-end and write profiles into `upnkprejbknbfsrwbmys.profiles`.

### Bug found while planning (worth fixing either way)

The `handle_new_user` function exists but **no trigger is attached to `auth.users`**, so signup currently does NOT auto-insert into `profiles`. `AuthPage` only calls `supabase.auth.signUp` and never inserts the profile row manually. On the current Cloud project, new users have an `auth.users` row but no `profiles` row.

Fix (applies to whichever project you end up on):

```sql
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

## What I need from you

Please pick one:

1. **Stay on Lovable Cloud** and I'll just add the missing `on_auth_user_created` trigger so signup writes to `profiles` correctly.
2. **Proceed with external project `upnkprejbknbfsrwbmys`** — confirm you've completed step 1 (connected the external Supabase project from the Connectors panel), and I'll handle steps 2–5 and the verification.

I cannot say "Supabase connected" until one of these paths is complete and a real signup has written a row into the target project's `profiles` table.

