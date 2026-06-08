// Format Réseaux — upsert d'un preset de layout (zone caméra + gameplay)
// Auth: JWT requis.
// Body: { platform, platform_user_id, layout_type, facecam, gameplay?, source_reference_width, source_reference_height }

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface Rect { x: number; y: number; w: number; h: number; }
function validRect(r: unknown): r is Rect {
  if (!r || typeof r !== "object") return false;
  const o = r as Record<string, unknown>;
  return ["x", "y", "w", "h"].every((k) => Number.isFinite(Number(o[k])));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claims?.claims) return json({ error: "unauthorized" }, 401);
  const userId = claims.claims.sub as string;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }

  const platform = String(body.platform ?? "twitch");
  const platformUserId = String(body.platform_user_id ?? "");
  const layoutType = String(body.layout_type ?? "facecam_top_gameplay_bottom");
  const refW = Number(body.source_reference_width);
  const refH = Number(body.source_reference_height);

  if (!platformUserId) return json({ error: "missing_platform_user_id" }, 400);
  if (!Number.isFinite(refW) || !Number.isFinite(refH) || refW <= 0 || refH <= 0) {
    return json({ error: "invalid_reference_dimensions" }, 400);
  }
  if (!["facecam_top_gameplay_bottom", "gameplay_only"].includes(layoutType)) {
    return json({ error: "invalid_layout_type" }, 400);
  }

  const facecam = body.facecam;
  const gameplay = body.gameplay ?? null;

  if (layoutType === "facecam_top_gameplay_bottom") {
    if (!validRect(facecam)) return json({ error: "invalid_facecam" }, 400);
  }
  if (gameplay && !validRect(gameplay)) return json({ error: "invalid_gameplay" }, 400);

  const f = facecam as Rect | undefined;
  const g = gameplay as Rect | null;

  const row = {
    user_id: userId,
    platform,
    platform_user_id: platformUserId,
    layout_type: layoutType,
    facecam_x: f ? Math.round(f.x) : null,
    facecam_y: f ? Math.round(f.y) : null,
    facecam_width: f ? Math.round(f.w) : null,
    facecam_height: f ? Math.round(f.h) : null,
    gameplay_x: g ? Math.round(g.x) : null,
    gameplay_y: g ? Math.round(g.y) : null,
    gameplay_width: g ? Math.round(g.w) : null,
    gameplay_height: g ? Math.round(g.h) : null,
    source_reference_width: Math.round(refW),
    source_reference_height: Math.round(refH),
    output_width: 1080,
    output_height: 1920,
  };

  const { data, error } = await userClient
    .from("creator_video_layout_presets")
    .upsert(row, { onConflict: "user_id,platform,platform_user_id" })
    .select()
    .single();

  if (error) return json({ error: "upsert_failed", detail: error.message }, 500);
  return json({ success: true, preset: data });
});
