// zernio-list-accounts
// Lists connected social accounts for the authenticated user and syncs them locally.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { zernioJson } from "../_shared/zernio.ts";

interface ZernioAccount {
  _id: string;
  platform: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  profileUrl?: string;
  status?: string;
  externalId?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    const userId = claims?.claims?.sub as string | undefined;
    if (!userId) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: profile } = await admin
      .from("profiles")
      .select("zernio_profile_id")
      .eq("user_id", userId)
      .maybeSingle();

    const zernioProfileId = profile?.zernio_profile_id as string | undefined;
    if (!zernioProfileId) {
      return json({ accounts: [] });
    }

    const data = await zernioJson<{ accounts?: ZernioAccount[] } | ZernioAccount[]>(
      `/accounts?profileId=${encodeURIComponent(zernioProfileId)}`,
      { method: "GET" },
    );
    const accounts = Array.isArray(data) ? data : (data?.accounts ?? []);

    // Sync into creator_connected_accounts (upsert by user_id + platform)
    for (const acc of accounts) {
      const platform = (acc.platform ?? "").toLowerCase();
      if (!["youtube", "tiktok", "instagram"].includes(platform)) continue;
      await admin
        .from("creator_connected_accounts")
        .upsert(
          {
            user_id: userId,
            platform,
            zernio_account_id: acc._id,
            platform_user_id: acc.externalId ?? acc._id,
            username: acc.username ?? null,
            display_name: acc.displayName ?? acc.username ?? null,
            avatar_url: acc.avatarUrl ?? null,
            profile_url: acc.profileUrl ?? null,
            connection_status: acc.status === "error" ? "error" : "connected",
            last_synced_at: new Date().toISOString(),
          },
          { onConflict: "user_id,platform" },
        );
    }

    return json({ accounts });
  } catch (e) {
    console.error("[zernio-list-accounts]", e);
    return json({ error: (e as Error).message ?? "internal_error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
