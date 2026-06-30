/**
 * Pay As You Go — credit cost constants (frontend mirror).
 *
 * Backend source of truth lives in:
 *   - supabase/functions/_shared/credits.ts
 *   - DB function `consume_generation_credit`
 *
 * Never use these values to authorize a generation client-side: the edge
 * function always re-checks the user's plan, monthly quota and credit balance.
 */

export type CreditFeature = "visual_generation" | "clip_generation";

export const CREDIT_COSTS: Record<CreditFeature, number> = {
  visual_generation: 1,
  clip_generation: 8,
};

export function creditCostFor(feature: CreditFeature): number {
  return CREDIT_COSTS[feature];
}

export function creditCostLabel(feature: CreditFeature): string {
  const cost = CREDIT_COSTS[feature];
  return cost === 1 ? "1 crédit" : `${cost} crédits`;
}

/**
 * Default catalogue mirrored from `public.credit_packages`.
 * Prices are intentionally not displayed until Stripe Prices are configured
 * server-side and the package is flipped `is_active = true`.
 */
export const CREDIT_PACKAGES = [
  { id: "pack_10", credits: 10, label: "10 crédits" },
  { id: "pack_30", credits: 30, label: "30 crédits" },
  { id: "pack_80", credits: 80, label: "80 crédits" },
] as const;

export type CreditPackageId = (typeof CREDIT_PACKAGES)[number]["id"];
