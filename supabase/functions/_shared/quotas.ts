// Shared quota definitions for cost-bearing features (Studio Visuel, Clipping).
// Mirrors src/lib/quotas.ts + src/lib/planAccess.ts. Keep all three in sync.
//
// Hierarchy: free < pro < growth < agency. Agency is NOT a Growth alias —
// it has its own (custom / ops-managed) ceiling.
//
// Counting rule: ONE job per generation. Failed jobs are excluded by the
// `get_user_quota_usage` SQL function (status <> 'failed').

export type Plan = "free" | "pro" | "growth" | "agency";
export type Feature = "visual" | "clip";

export const QUOTAS: Record<Plan, { visual: number; clip: number }> = {
  free: { visual: 3, clip: 1 },
  pro: { visual: 50, clip: 10 },
  growth: { visual: 150, clip: 40 },
  agency: { visual: 1000, clip: 600 },
};

export function normalizePlan(value: string | null | undefined): Plan {
  if (!value) return "free";
  const v = value.toLowerCase().trim();
  if (v.startsWith("agency")) return "agency";
  if (v.startsWith("growth")) return "growth";
  if (v.startsWith("pro")) return "pro";
  return "free";
}

export function quotaFor(plan: string | null | undefined, feature: Feature): number {
  return QUOTAS[normalizePlan(plan)][feature];
}

// deno-lint-ignore no-explicit-any
export async function getUserPlanAndUsage(admin: any, userId: string): Promise<{ plan: Plan; visuals_used: number; clips_used: number }> {
  const [{ data: planValue }, { data: usage }] = await Promise.all([
    admin.rpc("get_user_effective_plan", { uid: userId }),
    admin.rpc("get_user_quota_usage", { p_user_id: userId }),
  ]);
  return {
    plan: normalizePlan(typeof planValue === "string" ? planValue : null),
    visuals_used: Number((usage as Record<string, unknown> | null)?.visuals_used ?? 0),
    clips_used: Number((usage as Record<string, unknown> | null)?.clips_used ?? 0),
  };
}
