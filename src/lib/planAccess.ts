/**
 * Centralized plan hierarchy.
 *
 * Hierarchy: free < pro < growth (agency aliased to growth tier).
 *
 * Use `hasPlanAtLeast(currentPlan, requiredPlan)` for every paywall check.
 * Never compare plans with strict equality (`plan === "pro"`) when guarding
 * a feature — that wrongly excludes higher tiers.
 */

export type PlanTier = "free" | "pro" | "growth" | "agency";
export type RequiredTier = "free" | "pro" | "growth";

export const PLAN_RANK: Record<PlanTier, number> = {
  free: 0,
  pro: 1,
  growth: 2,
  agency: 2,
};

export function normalizePlan(value: string | null | undefined): PlanTier {
  if (!value) return "free";
  const v = value.toLowerCase().trim();
  if (v.startsWith("growth")) return "growth";
  if (v.startsWith("agency")) return "agency";
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
