// Twitch Disconnect
//
// Cleans up a user's connected Twitch account:
//   1. Revokes the Twitch user OAuth token (id.twitch.tv/oauth2/revoke)
//   2. Deletes EventSub subscriptions on Twitch (Helix DELETE) using an app token
//   3. Removes related rows in twitch_eventsub_subscriptions
//   4. Clears user_preferences.active_connected_account_id if it pointed here
//   5. Deletes the connected_accounts row
//
// All steps are best-effort: a failure on Twitch's side must not prevent the
// local cleanup, otherwise the user is stuck "connected" forever.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { decryptToken } from "../_shared/tokenCrypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function getAppAccessToken(clientId: string, clientSecret: string): Promise<string | null> {
  try {
    const res = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials",
      }),
    });
    const data = await res.json();
    if (!res.ok) return null;
    return (data.access_token as string) ?? null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json(401, { error: "unauthorized" });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (claimsErr || !claimsData?.claims?.sub) {
      return json(401, { error: "unauthorized" });
    }
    const userId = claimsData.claims.sub as string;

    let body: { connected_account_id?: string } = {};
    try {
      body = await req.json();
    } catch {
      return json(400, { error: "invalid_body" });
    }
    const connectedAccountId = body.connected_account_id;
    if (!connectedAccountId || typeof connectedAccountId !== "string") {
      return json(400, { error: "missing_connected_account_id" });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Load the account and verify ownership
    const { data: acc, error: accErr } = await admin
      .from("connected_accounts")
      .select("id, user_id, platform, platform_user_id, access_token_encrypted")
      .eq("id", connectedAccountId)
      .maybeSingle();

    if (accErr) return json(500, { error: "db_error", message: accErr.message });
    if (!acc) return json(404, { error: "not_found" });
    if (acc.user_id !== userId) return json(403, { error: "forbidden" });
    if (acc.platform !== "twitch") return json(400, { error: "not_twitch_account" });

    const clientId = Deno.env.get("TWITCH_CLIENT_ID");
    const clientSecret = Deno.env.get("TWITCH_CLIENT_SECRET");
    const broadcasterId = acc.platform_user_id;

    const steps: Record<string, unknown> = {};

    // 1. Revoke user token (best-effort)
    if (clientId && acc.access_token_encrypted) {
      try {
        const accessToken = await decryptToken(acc.access_token_encrypted);
        const res = await fetch("https://id.twitch.tv/oauth2/revoke", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: clientId,
            token: accessToken,
          }),
        });
        steps.revoke = { ok: res.ok, status: res.status };
      } catch (e) {
        steps.revoke = { ok: false, error: e instanceof Error ? e.message : "unknown" };
      }
    } else {
      steps.revoke = { ok: false, reason: "no_token_or_client_id" };
    }

    // 2. Delete EventSub subscriptions on Twitch + 3. local rows
    if (broadcasterId) {
      const { data: subs } = await admin
        .from("twitch_eventsub_subscriptions")
        .select("id, twitch_subscription_id")
        .eq("broadcaster_user_id", broadcasterId);

      const subList = subs ?? [];
      let deletedHelix = 0;
      if (subList.length > 0 && clientId && clientSecret) {
        const appToken = await getAppAccessToken(clientId, clientSecret);
        if (appToken) {
          await Promise.all(
            subList
              .filter((s) => !!s.twitch_subscription_id)
              .map(async (s) => {
                try {
                  const r = await fetch(
                    `https://api.twitch.tv/helix/eventsub/subscriptions?id=${encodeURIComponent(s.twitch_subscription_id as string)}`,
                    {
                      method: "DELETE",
                      headers: {
                        "Client-ID": clientId,
                        Authorization: `Bearer ${appToken}`,
                      },
                    },
                  );
                  if (r.ok || r.status === 404) deletedHelix++;
                } catch {
                  /* ignore */
                }
              }),
          );
        }
      }

      const { error: delSubsErr } = await admin
        .from("twitch_eventsub_subscriptions")
        .delete()
        .eq("broadcaster_user_id", broadcasterId);

      steps.eventsub = {
        local_rows: subList.length,
        deleted_helix: deletedHelix,
        local_deleted: !delSubsErr,
        local_error: delSubsErr?.message,
      };
    } else {
      steps.eventsub = { skipped: "no_broadcaster_id" };
    }

    // 4. Clear active pointer if it matches
    const { error: prefErr } = await admin
      .from("user_preferences")
      .update({ active_connected_account_id: null })
      .eq("user_id", userId)
      .eq("active_connected_account_id", connectedAccountId);
    steps.user_preferences = { cleared: !prefErr, error: prefErr?.message };

    // 5. Delete the connected_account row (cascade removes live_sessions)
    const { error: delAccErr } = await admin
      .from("connected_accounts")
      .delete()
      .eq("id", connectedAccountId)
      .eq("user_id", userId);

    if (delAccErr) {
      return json(500, { error: "delete_failed", message: delAccErr.message, steps });
    }
    steps.connected_account = { deleted: true };

    return json(200, { ok: true, steps });
  } catch (e) {
    return json(500, { error: "internal_error", message: e instanceof Error ? e.message : "unknown" });
  }
});
