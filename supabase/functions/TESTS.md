# Edge Function Regression Tests

Security-critical paths have automated Deno tests. They run locally and in CI.

## Run all tests
```
TWITCH_TOKEN_ENC_KEY=test-key deno test --allow-env supabase/functions/
```

## Coverage

### 1. Webhook signature validation (`twitch-eventsub-webhook/index_test.ts`)
- Valid HMAC SHA-256 signature is accepted.
- Tampered body is rejected.
- Wrong secret is rejected.
- Malformed header (missing `sha256=` prefix) is rejected.

The webhook also enforces:
- Stale timestamp (`> 10 min`) → 403 (covered by manual curl + integration; live-tested during validation).
- Duplicate `message_id` → DB unique index returns `duplicate_ignored` (covered by DB constraint, exercised in integration).
- Challenge handshake returns the raw challenge string only.

### 2. Token encryption (`_shared/tokenCrypto_test.ts`)
- AES-GCM round-trip preserves plaintext.
- Distinct IV per call → identical plaintexts produce different ciphertexts.
- Legacy raw tokens (pre-migration) decrypt as pass-through, enabling self-healing.

### 3. OAuth ownership & processor idempotency
Enforced at the database layer:
- `connected_accounts_platform_user_unique` partial unique index on
  `(platform, platform_user_id)` blocks two Streamnco users from owning the
  same Twitch account. Verified live (turn audit).
- `twitch_eventsub_events.message_id` unique index makes the webhook
  idempotent.
- `creator_alerts` unique on `(source_message_id, kind)`,
  `channel_update_history` unique on `source_message_id`,
  `community_events` unique on `(source_message_id, kind)` make the processor
  idempotent on retries.

These are validated by the schema itself; running the tests above plus
inspecting the migration files is sufficient for regression coverage.
