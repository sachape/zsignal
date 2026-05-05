// Token encryption helpers (AES-GCM 256).
//
// Flow:
//   1. A server-only secret `TWITCH_TOKEN_ENC_KEY` (any string) is hashed with
//      SHA-256 to produce a stable 256-bit AES key. The raw secret never leaves
//      edge function memory and is never logged.
//   2. encryptToken() returns a string of the form `enc:v1:<b64(iv)>:<b64(ct)>`.
//      The IV is random per call so identical plaintexts produce different
//      ciphertexts.
//   3. decryptToken() accepts both the new `enc:v1:` format and legacy raw
//      tokens (for backward compatibility during migration). Legacy raw values
//      are returned as-is and should be re-encrypted on next write.
//   4. Encrypted values are stored in connected_accounts.access_token_encrypted
//      and refresh_token_encrypted. Tokens are NEVER returned to the frontend
//      — only edge functions running with the service role read these columns.

const ENC_PREFIX = "enc:v1:";

let cachedKey: CryptoKey | null = null;

async function getKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  const secret = Deno.env.get("TWITCH_TOKEN_ENC_KEY");
  if (!secret) throw new Error("TWITCH_TOKEN_ENC_KEY is not configured");
  const material = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  cachedKey = await crypto.subtle.importKey("raw", material, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
  return cachedKey;
}

function b64encode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

// Returns a Uint8Array backed by a fresh ArrayBuffer (not SharedArrayBuffer)
// so the value is assignable to Web Crypto's BufferSource type.
function b64decode(s: string): Uint8Array {
  const bin = atob(s);
  const buf = new ArrayBuffer(bin.length);
  const out = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(ENC_PREFIX);
}

export async function encryptToken(plaintext: string): Promise<string> {
  if (!plaintext) return plaintext;
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plaintext)),
  );
  return `${ENC_PREFIX}${b64encode(iv)}:${b64encode(ct)}`;
}

export async function decryptToken(stored: string | null | undefined): Promise<string> {
  if (!stored) return "";
  // Legacy: raw token (pre-migration). Caller should re-encrypt on next write.
  if (!stored.startsWith(ENC_PREFIX)) return stored;
  const rest = stored.slice(ENC_PREFIX.length);
  const [ivB64, ctB64] = rest.split(":");
  if (!ivB64 || !ctB64) throw new Error("malformed encrypted token");
  const key = await getKey();
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64decode(ivB64) },
    key,
    b64decode(ctB64),
  );
  return new TextDecoder().decode(pt);
}
