// Run: TWITCH_TOKEN_ENC_KEY=test-key deno test --allow-env supabase/functions/_shared/tokenCrypto_test.ts
import { assertEquals, assert, assertNotEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

Deno.env.set("TWITCH_TOKEN_ENC_KEY", "test-key-for-unit-tests");
const { encryptToken, decryptToken, isEncrypted } = await import("./tokenCrypto.ts");

Deno.test("encryptToken: round-trip preserves plaintext", async () => {
  const plain = "abc123-twitch-token";
  const enc = await encryptToken(plain);
  assert(isEncrypted(enc));
  assertNotEquals(enc, plain);
  assertEquals(await decryptToken(enc), plain);
});

Deno.test("encryptToken: each call produces distinct ciphertext (random IV)", async () => {
  const a = await encryptToken("same-plaintext");
  const b = await encryptToken("same-plaintext");
  assertNotEquals(a, b);
});

Deno.test("decryptToken: legacy raw value passes through", async () => {
  assertEquals(await decryptToken("legacy-raw-token"), "legacy-raw-token");
  assertEquals(isEncrypted("legacy-raw-token"), false);
});
