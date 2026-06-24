// Shared Zernio helpers - server-side only.
// Never import this from frontend code.

export const ZERNIO_BASE = "https://zernio.com/api/v1";

export type ZernioPlatform = "youtube" | "tiktok" | "instagram";

export const SUPPORTED_PLATFORMS: ZernioPlatform[] = ["youtube", "tiktok", "instagram"];

export function getApiKey(): string {
  const key = Deno.env.get("ZERNIO_API_KEY");
  if (!key) throw new Error("ZERNIO_API_KEY is not configured");
  return key;
}

export async function zernioFetch(
  path: string,
  init: RequestInit & { idempotencyKey?: string } = {},
): Promise<Response> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${getApiKey()}`,
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (init.idempotencyKey) headers["x-request-id"] = init.idempotencyKey;
  const res = await fetch(`${ZERNIO_BASE}${path}`, { ...init, headers });
  return res;
}

export async function zernioJson<T = unknown>(
  path: string,
  init: RequestInit & { idempotencyKey?: string } = {},
): Promise<T> {
  const res = await zernioFetch(path, init);
  const text = await res.text();
  let body: unknown = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) {
    const msg = (body && typeof body === "object" && "message" in (body as Record<string, unknown>))
      ? String((body as Record<string, unknown>).message)
      : `Zernio API error ${res.status}`;
    const err = new Error(msg) as Error & { status?: number; body?: unknown };
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body as T;
}
