// zernio-create-profile
// Creates (or returns existing) a Zernio publishing profile for the authenticated user.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { zernioJson } from "../_shared/zernio.ts";

interface ZernioProfile { _id: string; name?: string; }
interface CreateResp { profile: ZernioProfile; }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
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
      .select("user_id, zernio_profile_id, email")
      .eq("user_id", userId)
      .maybeSingle();

    if (profile?.zernio_profile_id) {
      return json({ profile_id: profile.zernio_profile_id, existing: true });
    }

    const created = await zernioJson<CreateResp>("/profiles", {
      method: "POST",
      body: JSON.stringify({
        name: `Streamnco ${profile?.email ?? userId.slice(0, 8)}`,
        description: "Streamnco social publishing profile",
        color: "#89FD3A",
      }),
    });

    const newId = created?.profile?._id;
    if (!newId) return json({ error: "Création du profil impossible." }, 502);

    await admin
      .from("profiles")
      .update({ zernio_profile_id: newId })
      .eq("user_id", userId);

    return json({ profile_id: newId, existing: false });
  } catch (e) {
    console.error("[zernio-create-profile]", e);
    return json({ error: (e as Error).message ?? "internal_error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
