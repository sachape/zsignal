// Regression tests — webhook signature validation.
// Self-contained: re-implements the verification algorithm exactly as in
// index.ts so the test does not pull the entire edge-function dependency
// graph into type-checking. Any drift here is a bug — keep in sync.
//
// Run: deno test --allow-env supabase/functions/twitch-eventsub-webhook/index_test.ts

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

async function verifySignature(
  secret: string,
  messageId: string,
  timestamp: string,
  rawBody: string,
  signatureHeader: string,
): Promise<boolean> {
  if (!signatureHeader.startsWith("sha256=")) return false;
  const expectedHex = signatureHeader.slice("sha256=".length).toLowerCase();
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
    new TextEncoder().encode(messageId + timestamp + rawBody),
  );
  const computedHex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  if (computedHex.length !== expectedHex.length) return false;
  let diff = 0;
  for (let i = 0; i < computedHex.length; i++) {
    diff |= computedHex.charCodeAt(i) ^ expectedHex.charCodeAt(i);
  }
  return diff === 0;
}

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
  assertEquals(await verifySignature(SECRET, id, ts, body, await sign(id, ts, body)), true);
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
