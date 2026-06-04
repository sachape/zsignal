// HMAC-signed OAuth state for CSRF protection.
// Format: base64url(payload).base64url(sig)
// payload = JSON({ u: userId, n: nonce, e: expiryEpochSec, p: "instagram" })

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : "";
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function getKey(): Promise<CryptoKey> {
  const secret = Deno.env.get("OAUTH_STATE_SECRET");
  if (!secret) throw new Error("OAUTH_STATE_SECRET is not configured");
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export interface StatePayload {
  u: string; // user id
  n: string; // nonce
  e: number; // expiry epoch sec
  p: string; // provider
}

export async function signState(userId: string, provider: string, ttlSec = 600): Promise<string> {
  const payload: StatePayload = {
    u: userId,
    n: crypto.randomUUID(),
    e: Math.floor(Date.now() / 1000) + ttlSec,
    p: provider,
  };
  const payloadBytes = enc.encode(JSON.stringify(payload));
  const key = await getKey();
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, payloadBytes));
  return `${b64urlEncode(payloadBytes)}.${b64urlEncode(sig)}`;
}

export async function verifyState(state: string, provider: string): Promise<StatePayload> {
  const [payloadB64, sigB64] = state.split(".");
  if (!payloadB64 || !sigB64) throw new Error("malformed_state");
  const payloadBytes = b64urlDecode(payloadB64);
  const sig = b64urlDecode(sigB64);
  const key = await getKey();
  const ok = await crypto.subtle.verify("HMAC", key, sig, payloadBytes);
  if (!ok) throw new Error("invalid_state_signature");
  const payload = JSON.parse(dec.decode(payloadBytes)) as StatePayload;
  if (payload.p !== provider) throw new Error("state_provider_mismatch");
  if (payload.e < Math.floor(Date.now() / 1000)) throw new Error("state_expired");
  return payload;
}
