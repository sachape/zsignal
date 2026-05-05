// One-shot: encrypt any legacy raw tokens in connected_accounts.
// Auth: Vault-backed CRON_SECRET (same as monitor/processor).
// Safe to run multiple times — already-encrypted rows are skipped.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptToken, isEncrypted } from "../_shared/tokenCrypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: ok } = await admin.rpc("verify_eventsub_cron_secret", { token });
  if (ok !== true) return new Response("unauthorized", { status: 401, headers: corsHeaders });

  const { data: rows } = await admin
    .from("connected_accounts")
    .select("id, access_token_encrypted, refresh_token_encrypted")
    .eq("platform", "twitch");

  let migrated = 0, skipped = 0;
  for (const r of rows ?? []) {
    const at = r.access_token_encrypted as string | null;
    const rt = r.refresh_token_encrypted as string | null;
    const needsAt = at && !isEncrypted(at);
    const needsRt = rt && !isEncrypted(rt);
    if (!needsAt && !needsRt) { skipped++; continue; }
    await admin
      .from("connected_accounts")
      .update({
        access_token_encrypted: needsAt ? await encryptToken(at!) : at,
        refresh_token_encrypted: needsRt ? await encryptToken(rt!) : rt,
      })
      .eq("id", r.id);
    migrated++;
  }
  return new Response(JSON.stringify({ migrated, skipped, total: rows?.length ?? 0 }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
