// Shared helper: resolve a valid Twitch user access token for a Streamnco user.
// Tokens are decrypted and refreshed server-side only — never returned to clients.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface TwitchUserAuth {
  accessToken: string;
  clientId: string;
  broadcasterId: string;
  login: string | null;
  scopes: string[];
}

export type TwitchAuthError =
  | "server_misconfigured"
  | "twitch_not_connected"
  | "token_unavailable";

export async function getTwitchUserAuth(
  admin: ReturnType<typeof createClient>,
  userId: string,
): Promise<{ auth: TwitchUserAuth } | { error: TwitchAuthError }> {
  const clientId = Deno.env.get("TWITCH_CLIENT_ID");
  const clientSecret = Deno.env.get("TWITCH_CLIENT_SECRET");
  if (!clientId || !clientSecret) return { error: "server_misconfigured" };

  const { data: account } = await admin
    .from("connected_accounts")
    .select("id, platform_user_id, platform_login, access_token_encrypted, refresh_token_encrypted, scope, expires_at")
    .eq("user_id", userId)
    .eq("platform", "twitch")
    .maybeSingle();

  const row = account as {
    id?: string;
    platform_user_id?: string | null;
    platform_login?: string | null;
    access_token_encrypted?: string | null;
    refresh_token_encrypted?: string | null;
    scope?: string | null;
    expires_at?: string | null;
  } | null;

  if (!row?.platform_user_id) return { error: "twitch_not_connected" };

  const { encryptToken, decryptToken } = await import("./tokenCrypto.ts");
  let accessToken = await decryptToken(row.access_token_encrypted ?? null);
  const refreshToken = await decryptToken(row.refresh_token_encrypted ?? null);
  let scope = row.scope ?? "";

  const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : 0;
  const needsRefresh = !accessToken || (expiresAt > 0 && expiresAt - Date.now() < 60_000);

  if (needsRefresh && refreshToken) {
    const res = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.access_token) {
      accessToken = data.access_token as string;
      scope = Array.isArray(data.scope) ? data.scope.join(" ") : (data.scope ?? scope);
      await admin.from("connected_accounts").update({
        access_token_encrypted: await encryptToken(accessToken),
        refresh_token_encrypted: await encryptToken(data.refresh_token ?? refreshToken),
        expires_at: new Date(Date.now() + ((data.expires_in as number) ?? 3600) * 1000).toISOString(),
        scope,
      }).eq("id", row.id!);
    }
  }

  if (!accessToken) return { error: "token_unavailable" };

  return {
    auth: {
      accessToken,
      clientId,
      broadcasterId: row.platform_user_id,
      login: row.platform_login ?? null,
      scopes: scope.split(/\s+/).filter(Boolean),
    },
  };
}
