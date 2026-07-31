/**
 * Centralized plan hierarchy.
 *
 * Hierarchy: free < pro < growth < agency.
 *
 * Agency is a real top-tier plan (custom volume / contact-sales / on-demand
 * limits). It is NOT an alias of Growth. Even if Agency is not sold publicly
 * today, the type system and runtime checks must respect:
 *   hasPlanAtLeast("agency", "growth") === true
 *   hasPlanAtLeast("growth", "agency") === false
 *
 * Use `hasPlanAtLeast(currentPlan, requiredPlan)` for every paywall check.
 * Never compare plans with strict equality (`plan === "pro"`) when guarding
 * a feature — that wrongly excludes higher tiers.
 */

export type PlanTier = "free" | "pro" | "growth" | "agency";
export type RequiredTier = "free" | "pro" | "growth" | "agency";

export const PLAN_RANK: Record<PlanTier, number> = {
  free: 0,
  pro: 1,
  growth: 2,
  agency: 3,
};

/** Libellé utilisateur d'un plan. Unique source de vérité pour l'affichage. */
export const PLAN_LABELS: Record<PlanTier, string> = {
  free: "Plan Gratuit",
  pro: "Plan Pro",
  growth: "Plan Growth",
  agency: "Plan Agency",
};

export function normalizePlan(value: string | null | undefined): PlanTier {
  if (!value) return "free";
  const v = value.toLowerCase().trim();
  if (v.startsWith("agency")) return "agency";
  if (v.startsWith("growth")) return "growth";
  if (v.startsWith("pro")) return "pro";
  return "free";
}

export function hasPlanAtLeast(
  currentPlan: string | null | undefined,
  requiredPlan: RequiredTier,
): boolean {
  const current = normalizePlan(currentPlan);
  return (PLAN_RANK[current] ?? 0) >= PLAN_RANK[requiredPlan];
}
