// Regression tests — webhook signature validation.
//
// Run:  deno test --allow-env supabase/functions/twitch-eventsub-webhook/index_test.ts
//
// We re-import the verifySignature function from index.ts and exercise the
// security-critical paths: valid signature accepted, tampered body rejected,
// wrong secret rejected, malformed header rejected.

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { verifySignature } from "./index.ts";

const SECRET = "test-secret-streamnco";

async function sign(messageId: string, ts: string, body: string, secret = SECRET) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(messageId + ts + body),
  );
  return "sha256=" +
    Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.test("verifySignature: accepts valid HMAC", async () => {
  const id = "msg-1", ts = new Date().toISOString(), body = '{"hello":"world"}';
  const header = await sign(id, ts, body);
  assertEquals(await verifySignature(SECRET, id, ts, body, header), true);
});

Deno.test("verifySignature: rejects tampered body", async () => {
  const id = "msg-2", ts = new Date().toISOString(), body = '{"hello":"world"}';
  const header = await sign(id, ts, body);
  assertEquals(await verifySignature(SECRET, id, ts, body + "x", header), false);
});

Deno.test("verifySignature: rejects wrong secret", async () => {
  const id = "msg-3", ts = new Date().toISOString(), body = '{"hello":"world"}';
  const header = await sign(id, ts, body, "other-secret");
  assertEquals(await verifySignature(SECRET, id, ts, body, header), false);
});

Deno.test("verifySignature: rejects header without sha256= prefix", async () => {
  const id = "msg-4", ts = new Date().toISOString(), body = "{}";
  assertEquals(await verifySignature(SECRET, id, ts, body, "deadbeef"), false);
});
