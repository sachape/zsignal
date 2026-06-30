/**
 * StreamCoins — frontend mirror of credit costs.
 *
 * StreamCoins are the single unified currency for Pay As You Go in Streamnco.
 * Different actions can cost different amounts of StreamCoins, but the user
 * only ever sees ONE balance and ONE currency name.
 *
 * Backend source of truth lives in:
 *   - supabase/functions/_shared/credits.ts
 *   - DB function `consume_generation_credit`
 *
 * Never use these values to authorize a generation client-side: the edge
 * function always re-checks the user's plan, monthly quota and StreamCoins balance.
 */

export type CreditFeature = "visual_generation" | "clip_generation";

/** Cost in StreamCoins per generation. Must stay in sync with backend. */
export const CREDIT_COSTS: Record<CreditFeature, number> = {
  visual_generation: 120,
  clip_generation: 350,
};

export function creditCostFor(feature: CreditFeature): number {
  return CREDIT_COSTS[feature];
}

/** User-facing label, e.g. "120 StreamCoins". */
export function streamCoinsCostLabel(feature: CreditFeature): string {
  return `${CREDIT_COSTS[feature]} StreamCoins`;
}

/** Back-compat alias — keep until call sites are migrated. */
export const creditCostLabel = streamCoinsCostLabel;

/** Format an arbitrary StreamCoins amount for display. */
export function formatStreamCoins(amount: number): string {
  const n = Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
  return `${n.toLocaleString("fr-FR")} StreamCoins`;
}

/**
 * Default catalogue mirrored from `public.credit_packages`.
 * Prices are intentionally not displayed until Stripe Prices are configured
 * server-side and the package is flipped `is_active = true`.
 */
export const CREDIT_PACKAGES = [
  { id: "pack_1200",  credits: 1200,  label: "1 200 StreamCoins" },
  { id: "pack_3000",  credits: 3000,  label: "3 000 StreamCoins" },
  { id: "pack_7000",  credits: 7000,  label: "7 000 StreamCoins" },
  { id: "pack_16000", credits: 16000, label: "16 000 StreamCoins" },
] as const;

export type CreditPackageId = (typeof CREDIT_PACKAGES)[number]["id"];
