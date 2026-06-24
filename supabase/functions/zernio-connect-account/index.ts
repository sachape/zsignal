// zernio-connect-account
// Returns an OAuth connect URL for a given platform.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { zernioJson, SUPPORTED_PLATFORMS, type ZernioPlatform } from "../_shared/zernio.ts";

interface ProfileResp { profile: { _id: string } }

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

    const body = await req.json().catch(() => ({}));
    const platform = String(body?.platform ?? "").toLowerCase() as ZernioPlatform;
    if (!SUPPORTED_PLATFORMS.includes(platform)) {
      return json({ error: "Plateforme non supportée." }, 400);
    }
    const redirectUrl: string = body?.redirect_url
      ?? `${Deno.env.get("SITE_URL") ?? "https://streamnco.com"}/reseaux/callback`;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Ensure profile exists
    const { data: profile } = await admin
      .from("profiles")
      .select("zernio_profile_id, email")
      .eq("user_id", userId)
      .maybeSingle();

    let zernioProfileId = profile?.zernio_profile_id as string | undefined;
    if (!zernioProfileId) {
      const created = await zernioJson<ProfileResp>("/profiles", {
        method: "POST",
        body: JSON.stringify({
          name: `Streamnco ${profile?.email ?? userId.slice(0, 8)}`,
          description: "Streamnco social publishing profile",
          color: "#89FD3A",
        }),
      });
      zernioProfileId = created?.profile?._id;
      if (!zernioProfileId) return json({ error: "Création du profil impossible." }, 502);
      await admin.from("profiles").update({ zernio_profile_id: zernioProfileId }).eq("user_id", userId);
    }

    const qs = new URLSearchParams({
      profileId: zernioProfileId,
      redirect_url: redirectUrl,
    });
    const data = await zernioJson<{ authUrl?: string; url?: string }>(
      `/connect/${platform}?${qs.toString()}`,
      { method: "GET" },
    );
    const authUrl = data?.authUrl ?? data?.url;
    if (!authUrl) return json({ error: "URL de connexion indisponible." }, 502);

    return json({ authUrl, platform });
  } catch (e) {
    console.error("[zernio-connect-account]", e);
    return json({ error: (e as Error).message ?? "internal_error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
