# Streamnco V1 — Manual QA Checklist

End-to-end QA plan for a fresh real user account. No code changes, no migrations, no deploys.

---

## 0. Test Setup

### Test accounts to prepare
- **U1 (Free)** — fresh email, no prior Streamnco history, owns 1 small real Twitch account (`TW-A`).
- **U2 (Pro)** — fresh email, owns 1 Twitch account (`TW-B`), will be upgraded via Stripe test card.
- **U3 (Growth)** — fresh email, owns 3 Twitch accounts (`TW-C1`, `TW-C2`, `TW-C3`), upgraded via Stripe.
- **U4 (adversary)** — separate user to test cross-user isolation on `active_connected_account_id`.

### Twitch test channels
- At least one channel that **has gone live recently** (to populate live snapshots / Score Live).
- At least one channel that **has not streamed** in 30+ days (to test empty states).
- At least one channel in a populated category (e.g. Just Chatting) to validate Classements.

### Stripe test cards
- Success: `4242 4242 4242 4242` (any future date, any CVC)
- 3DS challenge: `4000 0025 0000 3155`
- Decline: `4000 0000 0000 9995`

### Test data inputs
- Public search teaser: a known small streamer + a non-existent login + a banned login.
- Invalid Twitch OAuth state (manual URL tampering) for security check.

### What to capture per test
- Screenshot of the page in both **sidebar open** and **sidebar collapsed** at 1280px, 1024px, 768px, 390px.
- Browser console (filter: `error`, `warn`).
- Network tab: failed requests (4xx/5xx) and edge function calls.
- Relevant DB rows (see "DB to inspect" per test).

---

## P0 — Blockers (must pass before launch)

### T1. Signup — fresh account
- **Steps:** Open `/`, click Sign up, enter email + password, submit.
- **Expected:** Redirect to dashboard or onboarding; `profiles` row created with matching `user_id`.
- **Failure signs:** Stuck on form, generic 500, no row in `profiles`, infinite redirect.
- **DB to inspect:** `profiles WHERE email = ...`, `auth.users` (via dashboard).
- **Priority if broken:** P0.

### T2. Welcome email
- **Steps:** After T1, check inbox within 2 min.
- **Expected:** French welcome email from Streamnco; `profiles.welcome_email_sent_at` set; `email_send_log` row `status='sent'`.
- **Failure signs:** No email, English copy, broken links, `status='failed'`, suppressed email.
- **DB to inspect:** `email_send_log WHERE recipient_email=...`, `suppressed_emails`.
- **Priority:** P0 (email is the first product touchpoint).

### T3. Twitch OAuth connect (first account)
- **Steps:** From dashboard / connect-twitch, click "Connecter Twitch", complete OAuth on Twitch, return to `/twitch/callback`.
- **Expected:** Redirect to dashboard; `connected_accounts` row with encrypted tokens, `platform='twitch'`, correct `platform_login`; `twitch_profiles` populated.
- **Failure signs:** Callback 500, tokens stored in plaintext, state mismatch ignored, duplicate rows.
- **DB to inspect:** `connected_accounts`, `twitch_profiles`, edge logs for `twitch-oauth`.
- **Priority:** P0.

### T4. Active Twitch account persisted in DB
- **Steps:** After T3, refresh, log out, log back in on a **different browser** (clear localStorage).
- **Expected:** Same active account selected; `user_preferences.active_connected_account_id` = the connected row id.
- **Failure signs:** Active account null on new browser, falls back to wrong account.
- **DB to inspect:** `user_preferences WHERE user_id=U1`.
- **Priority:** P0.

### T5. Cross-user ownership trigger
- **Steps:** As U4, via SQL or upsert attempt, try setting `user_preferences.active_connected_account_id` to a `connected_accounts.id` owned by U1.
- **Expected:** `check_violation` raised by `trg_uprefs_validate_active_account`; pref row unchanged.
- **Failure signs:** Insert succeeds; cross-user leak possible.
- **DB to inspect:** `user_preferences`, trigger definition.
- **Priority:** P0 (security).

### T6. Run analysis end-to-end
- **Steps:** From dashboard, click "Analyser ma chaîne".
- **Expected:** `analysis_jobs` row queued → running → completed; `analysis_reports`, `stream_scores`, `stream_score_snapshots`, `recommendations`, `competitor_matches` populated; redirect to `/result?id=...`.
- **Failure signs:** Job stuck `running` > 5 min, `last_error` populated, empty reports, missing competitors.
- **DB to inspect:** `analysis_jobs`, `analysis_reports`, `stream_scores`, edge logs.
- **Priority:** P0.

### T7. Dashboard renders connected identity (no demo pollution)
- **Steps:** After T6, open `/dashboard`.
- **Expected:** Header shows `TW-A` avatar + display name; StreamScore matches latest snapshot for `TW-A`; recent analyses list only `TW-A`.
- **Failure signs:** Other channel shown, demo report leaked, 0 KPIs when data exists, score mismatch.
- **DB to inspect:** `connected_accounts`, `stream_score_snapshots ORDER BY created_at DESC`.
- **Priority:** P0 (product principle: no identity bleed).

### T8. Result page consistency
- **Steps:** Open `/result?id=<job from T6>`.
- **Expected:** Identity header, StreamScore breakdown, weaknesses, competitors, recommendations all aligned with `TW-A`.
- **Failure signs:** Mismatched identity, inconsistent report fallback, unrelated competitors.
- **DB to inspect:** `analysis_reports WHERE id=...`, `competitor_matches`.
- **Priority:** P0.

### T9. Stripe checkout → Pro
- **Steps:** As U2, open `/billing` or `/pricing`, click upgrade Pro, complete with `4242 4242 4242 4242`.
- **Expected:** Redirect back; `subscriptions` row with `status='active'`, `plan_name='pro'`, `stripe_customer_id`; UI shows Pro.
- **Failure signs:** No row, status `incomplete`, plan name missing, UI still Free.
- **DB to inspect:** `subscriptions`, `billing_customers`, Stripe dashboard.
- **Priority:** P0.

### T10. Stripe checkout → Growth + multi-account unlock
- **Steps:** As U3, upgrade to Growth.
- **Expected:** Plan = `growth`; `/settings/twitch-accounts` shows usage `X/3`; second + third Twitch connect succeeds.
- **Failure signs:** Limit stays 1, second OAuth rejected, no upgrade CTA hidden.
- **DB to inspect:** `subscriptions`, `connected_accounts` count by `user_id`.
- **Priority:** P0.

---

## P1 — Important (should pass before launch)

### T11. Public teaser (logged out)
- **Steps:** Log out. From `/`, search a real public channel.
- **Expected:** Teaser result clearly labeled "données publiques"; partial metrics with "indisponible" where applicable; no fake followers; activation wall visible.
- **Failure signs:** Fake 0s, labels missing, teaser pollutes future authenticated reports.
- **Priority:** P1.

### T12. Teaser → signup → no contamination
- **Steps:** From a teaser result, sign up; open dashboard.
- **Expected:** Dashboard empty / clean; no teaser report attached to user; recent analyses empty until U1 connects + analyzes.
- **Failure signs:** Teaser row stored under `user_id`.
- **DB to inspect:** `analysis_jobs WHERE user_id=newU AND trigger_source LIKE '%teaser%'`.
- **Priority:** P1.

### T13. Analyse page
- **Steps:** Open `/analyse` (or equivalent in nav).
- **Expected:** Detail view of latest analysis for active account; breakdown, evidence, signal_quality, confidence visible.
- **Failure signs:** Empty when data exists, wrong account, missing confidence.
- **Priority:** P1.

### T14. Progression / StreamScore page
- **Steps:** Open `/streamscore-history` (or progression).
- **Expected:** Chart of `stream_score_snapshots` for active account ordered by `created_at`; delta vs previous.
- **Failure signs:** Snapshots from other accounts, chart empty when rows exist, wrong ordering.
- **DB to inspect:** `stream_score_snapshots WHERE user_id=U1 ORDER BY created_at`.
- **Priority:** P1.

### T15. Classements — StreamScore tab
- **Steps:** Open `/classements`, default tab.
- **Expected:** Ranked list from `channel_stream_scores`; filters work; **Tri dropdown hidden** on StreamScore tab; no "Maj il y a X min" string; locked Pro overlay responsive for Free; no horizontal overflow at 1280 / 1024 / 768 / 390.
- **Failure signs:** Overflow, Tri visible, "Maj il y a" present, overlay clipped.
- **Priority:** P1.

### T16. Classements — Score Live tab
- **Steps:** Switch to Score Live tab.
- **Expected:** Sorted by live viewer count; only `is_live=true` channels; Audience live + Nom columns visible.
- **Failure signs:** Offline channels shown, sort wrong, columns clipped.
- **Priority:** P1.

### T17. Weekly plan page
- **Steps:** Open weekly plan route.
- **Expected:** Action items for active account; week boundaries correct (Mon-Sun, FR locale); no items from other accounts.
- **Failure signs:** Wrong week, items from other accounts, empty when expected.
- **Priority:** P1.

### T18. Quests / Badges
- **Steps:** Trigger qualifying actions (first analysis, first live debrief).
- **Expected:** Badge row in `user_badge_state`; UI shows new badge; quest progress updates.
- **Failure signs:** No badge row, duplicate badges, stale UI.
- **DB to inspect:** `user_badge_state`, `user_checklist_progress`.
- **Priority:** P1.

### T19. Growth — multi-account switching
- **Steps:** As U3 on `/settings/twitch-accounts`, set TW-C2 active.
- **Expected:** `user_preferences.active_connected_account_id` updated; dashboard, Analyse, Progression all reflect TW-C2; AccountMenu shows TW-C2.
- **Failure signs:** Page still shows TW-C1, partial update, stale cache.
- **Priority:** P1.

### T20. Billing portal
- **Steps:** As U2, open billing → "Gérer mon abonnement".
- **Expected:** Stripe portal opens; cancel-at-period-end works; `subscriptions.cancel_at_period_end` flips to true.
- **Failure signs:** Portal 404, change not reflected, no webhook delivery.
- **DB to inspect:** `subscriptions`, edge logs for stripe webhook.
- **Priority:** P1.

### T21. Logout / Login persistence
- **Steps:** Log out U3, log back in.
- **Expected:** Active account restored from DB pref; plan, connected accounts, last analysis intact.
- **Failure signs:** Active account resets to first, plan downgraded in UI, missing accounts.
- **Priority:** P1.

### T22. Lifecycle emails
- **Steps:** Wait for weekly digest / streamscore delta email triggers (or force via cron).
- **Expected:** French copy; one email per `email_key` per snapshot; no duplicates; `streamscore_email_events` row exists.
- **Failure signs:** Duplicates, English copy, missing unsubscribe link.
- **DB to inspect:** `streamscore_email_events`, `email_send_log`, `email_unsubscribe_tokens`.
- **Priority:** P1.

---

## P2 — Nice to have

### T23. Free user limits
- **Steps:** As U1 Free, try to connect a second Twitch account.
- **Expected:** Blocked with upgrade CTA; no row added.
- **Priority:** P2.

### T24. Disconnect button state
- **Steps:** On `/settings/twitch-accounts`, hover Déconnecter.
- **Expected:** Button disabled with explanatory tooltip (deferred backend).
- **Priority:** P2.

### T25. Responsive sweep
- **Steps:** Each authenticated page at 1280 / 1024 / 768 / 390 with sidebar open and collapsed.
- **Expected:** No horizontal overflow, no clipped CTAs.
- **Priority:** P2.

### T26. Empty states
- **Steps:** Fresh U1 before first analysis; account that never went live; user without subscriptions.
- **Expected:** Honest copy ("indisponible", "aucune analyse encore"), no fake 0s.
- **Priority:** P2.

### T27. Invalid / tampered states
- **Steps:** Manually change `?id=` on `/result` to unrelated UUID; tamper OAuth state param.
- **Expected:** Refuses to render mismatched report; OAuth rejected with clean error.
- **Priority:** P2.

### T28. Console + network hygiene
- **Steps:** Walk full happy path with devtools open.
- **Expected:** No red console errors, no 4xx/5xx outside intentional cases.
- **Priority:** P2.

---

## DB inspection cheat sheet

When a bug appears, query these in order:

```
-- Who am I?
select * from profiles where user_id = '<uid>';
select * from connected_accounts where user_id = '<uid>';
select * from user_preferences where user_id = '<uid>';
select * from subscriptions where user_id = '<uid>';

-- Latest analysis for active account
select * from analysis_jobs where user_id='<uid>' order by created_at desc limit 5;
select * from analysis_reports where user_id='<uid>' order by created_at desc limit 5;
select * from stream_score_snapshots where user_id='<uid>' order by created_at desc limit 10;

-- Live
select * from live_sessions where user_id='<uid>' order by started_at desc limit 5;
select * from live_debriefs where user_id='<uid>' order by created_at desc limit 5;

-- Email
select * from email_send_log where recipient_email='<email>' order by created_at desc limit 20;
select * from streamscore_email_events where user_id='<uid>' order by sent_at desc;

-- EventSub health
select status, count(*) from twitch_eventsub_subscriptions
  where broadcaster_user_id in (select platform_user_id from connected_accounts where user_id='<uid>')
  group by status;
```

Also check edge function logs: `twitch-oauth`, `twitch-eventsub-monitor`, Stripe webhook, weekly digest cron.

---

## Launch-readiness checklist

Block launch if **any P0 fails**. Investigate **all P1 fails**. P2 = known-issue list.

- [ ] All P0 tests PASS (T1–T10)
- [ ] All P1 tests PASS or have a documented mitigation (T11–T22)
- [ ] No red console errors on happy path
- [ ] No 4xx/5xx on happy path (excluding intentional 401 on logged-out gated routes)
- [ ] Welcome email delivered in < 2 min, French
- [ ] Stripe webhooks confirmed in edge logs for: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted
- [ ] EventSub: every connected broadcaster has required subscriptions in `enabled` state
- [ ] No cross-user `active_connected_account_id` accepted (T5)
- [ ] No teaser-data contamination in authenticated dashboard (T7, T12)
- [ ] Classements responsive at 390 / 768 / 1024 / 1280 with sidebar open and collapsed (T15, T16)
- [ ] Growth multi-account switch reflected everywhere within one navigation (T19)
- [ ] Logout/login restores active account from DB (T21)
- [ ] Disconnect deferred state clearly communicated to users (T24)
- [ ] Suppressed-emails list reviewed, no test addresses leaked into production
- [ ] Stripe live keys (not test) confirmed in production secrets before public launch
