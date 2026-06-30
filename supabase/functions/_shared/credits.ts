// Pay As You Go — Single source of truth for credit costs.
// Mirrored in src/lib/credits.ts (frontend display only — never the source of truth).
//
// Rule: monthly quota is checked first. If the user has exhausted the included
// quota for their plan, the backend tries to debit the corresponding cost from
// the credit balance via the `consume_generation_credit` RPC.

export type CreditFeature = "visual_generation" | "clip_generation";

export const CREDIT_COSTS: Record<CreditFeature, number> = {
  visual_generation: 1,
  clip_generation: 8,
};

export function costForFeature(feature: CreditFeature): number {
  return CREDIT_COSTS[feature];
}

/**
 * Atomically debit credits for a feature.
 * Returns the ledger entry id on success, or null when the balance is insufficient.
 *
 * IMPORTANT: must be called with a service-role client.
 */
// deno-lint-ignore no-explicit-any
export async function consumeCredits(admin: any, userId: string, feature: CreditFeature): Promise<{ entryId: string | null; cost: number }> {
  const cost = costForFeature(feature);
  const { data, error } = await admin.rpc("consume_generation_credit", {
    p_user_id: userId,
    p_feature: feature,
    p_cost: cost,
  });
  if (error) {
    console.error("[credits] consume_generation_credit_failed", { feature, message: error.message });
    return { entryId: null, cost };
  }
  return { entryId: (data as string | null) ?? null, cost };
}

/**
 * Read the current balance for a user. Service-role only.
 */
// deno-lint-ignore no-explicit-any
export async function getCreditBalance(admin: any, userId: string): Promise<number> {
  const { data, error } = await admin.rpc("get_user_credit_balance", { p_user_id: userId });
  if (error) {
    console.warn("[credits] get_user_credit_balance_failed", { message: error.message });
    return 0;
  }
  const v = (data as Record<string, unknown> | null)?.available_credits;
  return Number.isFinite(Number(v)) ? Number(v) : 0;
}

/**
 * Idempotently refund credits for a job that ended up in `failed` state.
 * No-op when the job was paid by monthly quota or already refunded.
 */
// deno-lint-ignore no-explicit-any
export async function refundFailedJobCredits(admin: any, jobId: string, jobTable: "visual_generation_jobs" | "creator_video_generation_jobs"): Promise<void> {
  const { error } = await admin.rpc("refund_failed_job_credits", {
    p_job_id: jobId,
    p_job_table: jobTable,
  });
  if (error) {
    console.error("[credits] refund_failed_job_credits_failed", { jobId, jobTable, message: error.message });
  }
}
