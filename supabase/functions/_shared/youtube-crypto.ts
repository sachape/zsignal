// Shared crypto helpers for YouTube OAuth.
// - HMAC-signed OAuth state (with expiration) prevents user_id tampering.
// - AES-GCM token encryption keeps access/refresh tokens unreadable at rest.

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64urlEncode(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
  return out;
}

// ── OAuth state (HMAC-SHA256, payload = userId|expiresAt) ───────────────────
const DEFAULT_STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signOAuthState(
  userId: string,
  secret: string,
  ttlMs = DEFAULT_STATE_TTL_MS,
): Promise<string> {
  const exp = Date.now() + ttlMs;
  const payload = `${userId}|${exp}`;
  const key = await hmacKey(secret);
  const sig = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, enc.encode(payload)),
  );
  return `${b64urlEncode(enc.encode(payload))}.${b64urlEncode(sig)}`;
}

export async function verifyOAuthState(
  state: string,
  secret: string,
): Promise<{ userId: string } | null> {
  const parts = state.split(".");
  if (parts.length !== 2) return null;
  let payloadBytes: Uint8Array, sigBytes: Uint8Array;
  try {
    payloadBytes = b64urlDecode(parts[0]);
    sigBytes = b64urlDecode(parts[1]);
  } catch { return null; }

  const key = await hmacKey(secret);
  const ok = await crypto.subtle.verify("HMAC", key, sigBytes, payloadBytes);
  if (!ok) return null;

  const [userId, expStr] = dec.decode(payloadBytes).split("|");
  if (!userId || !/^[0-9a-f-]{36}$/.test(userId)) return null;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return null;
  return { userId };
}

// ── AES-GCM token encryption ────────────────────────────────────────────────
// Key derivation: SHA-256 of TOKEN_ENCRYPTION_KEY → 32 raw bytes.

async function aesKey(secret: string): Promise<CryptoKey> {
  const hash = await crypto.subtle.digest("SHA-256", enc.encode(secret));
  return crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, [
    "encrypt", "decrypt",
  ]);
}

export async function encryptToken(plain: string, secret: string): Promise<string> {
  const key = await aesKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plain)),
  );
  return `v1.${b64urlEncode(iv)}.${b64urlEncode(ct)}`;
}

export async function decryptToken(
  payload: string | null | undefined,
  secret: string,
): Promise<string | null> {
  if (!payload) return null;
  // Back-compat: if value isn't in the v1 envelope, assume legacy plaintext.
  if (!payload.startsWith("v1.")) return payload;
  const [, ivB64, ctB64] = payload.split(".");
  if (!ivB64 || !ctB64) return null;
  try {
    const key = await aesKey(secret);
    const pt = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: b64urlDecode(ivB64) },
      key,
      b64urlDecode(ctB64),
    );
    return dec.decode(pt);
  } catch {
    return null;
  }
}
