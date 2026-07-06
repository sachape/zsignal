// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Legacy monthly quotas (getUserPlanAndUsage/quotaFor) are intentionally NOT
// used to authorize visual generation anymore. The single source of truth is
// the user's StreamCoins balance (creator_credit_ledger).
import { consumeCredits, costForFeature, getCreditBalance } from "../_shared/credits.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;



Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "missing_auth" }, 401);
    }
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "unauthorized" }, 401);
    const user = userData.user;

    const body = await req.json().catch(() => ({} as any));
    const templateId = String(body.template_id ?? "").trim();
    const params = (body.params && typeof body.params === "object") ? body.params : {};
    const referenceAssetId = body.reference_asset_id ?? null;
    const sourceRef = body.source_ref ?? null;
    if (!templateId) return json({ error: "template_id_required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: template, error: tplErr } = await admin
      .from("visual_templates")
      .select("*")
      .eq("id", templateId)
      .eq("is_active", true)
      .maybeSingle();
    if (tplErr || !template) return json({ error: "template_not_found" }, 404);

    // ── Billing: StreamCoins-first ──
    // Pro subscribers do NOT get a monthly generation quota. Every visual costs
    // StreamCoins (currently 120). Debit atomically via consume_generation_credit.
    let billingSource: "credits" = "credits";
    let creditsSpent = 0;
    let creditLedgerEntryId: string | null = null;

    {
      const { entryId, cost } = await consumeCredits(admin, user.id, "visual_generation");
      if (!entryId) {
        const balance = await getCreditBalance(admin, user.id);
        return json({
          error: "streamcoins_insufficient",
          feature: "visual_generation",
          required: cost,
          available: balance,
          message: "Tu n’as pas assez de StreamCoins pour générer ce visuel.",
        }, 402);
      }
      creditsSpent = cost;
      creditLedgerEntryId = entryId;
    }

    const { data: job, error: insErr } = await admin
      .from("visual_generation_jobs")
      .insert({
        user_id: user.id,
        template_id: templateId,
        status: "queued",
        params,
        source_ref: sourceRef,
        reference_asset_id: referenceAssetId,
        variant_count: 3,
        billing_source: billingSource,
        credits_spent: creditsSpent,
        credit_ledger_entry_id: creditLedgerEntryId,
      })
      .select()
      .single();
    if (insErr || !job) {
      console.error("[visual-job-create] insert_failed", insErr);
      // Compensate: if we already debited credits, refund immediately.
      if (billingSource === "credits" && creditLedgerEntryId) {
        await admin.from("creator_credit_ledger").insert({
          user_id: user.id,
          delta: creditsSpent,
          reason: "refund_failed_job",
          feature: "visual_generation",
          metadata: { compensation: "insert_failed_pre_job", original_entry: creditLedgerEntryId },
        });
      }
      return json({ error: "insert_failed" }, 500);
    }

    console.log("[visual_job_created]", job.id, templateId, "billing=", billingSource);

    // Fire-and-forget call to processor (do not await)
    const processUrl = `${SUPABASE_URL}/functions/v1/visual-job-process`;
    fetch(processUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ job_id: job.id }),
    }).catch((e) => console.error("[visual-job-create] dispatch_failed", e));

    return json({
      job_id: job.id,
      status: "queued",
      billing_source: billingSource,
      credits_spent: creditsSpent,
    }, 200);
  } catch (e) {
    console.error("[visual-job-create] error", e);
    return json({ error: "internal_error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
