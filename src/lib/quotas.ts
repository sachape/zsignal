/**
 * Per-plan monthly quotas for cost-bearing features.
 *
 * Rules:
 * - Counts ONE job (not variants/clips) per generation.
 * - Failed jobs do not count (status = 'failed' is excluded server-side).
 * - Growth always includes Pro; never compare with strict equality.
 *
 * Backend enforcement lives in:
 *   - supabase/functions/visual-job-create
 *   - supabase/functions/clip-job-create
 * Frontend display only — never use this as the single source of truth.
 */
import { normalizePlan, type PlanTier } from "@/lib/planAccess";

export type QuotaFeature = "visual" | "clip";

export const QUOTAS: Record<"free" | "pro" | "growth", { visual: number; clip: number }> = {
  free: { visual: 5, clip: 3 },
  pro: { visual: 100, clip: 30 },
  growth: { visual: 300, clip: 200 },
};

export function quotaFor(plan: string | null | undefined, feature: QuotaFeature): number {
  const p = normalizePlan(plan);
  const key = p === "agency" ? "growth" : p;
  return QUOTAS[key][feature];
}

export function upgradeTarget(plan: string | null | undefined): "pro" | "growth" | null {
  const p = normalizePlan(plan);
  if (p === "free") return "pro";
  if (p === "pro") return "growth";
  return null; // growth / agency
}

export function quotaExceededMessage(feature: QuotaFeature): string {
  return feature === "visual"
    ? "Tu as atteint ta limite de générations visuelles ce mois-ci."
    : "Tu as atteint ta limite de clips générés ce mois-ci.";
}

export function quotaCta(plan: string | null | undefined): { label: string; href: string | null } {
  const target = upgradeTarget(plan);
  if (target === "pro") return { label: "Passer au Pro", href: "/billing" };
  if (target === "growth") return { label: "Passer à Growth", href: "/billing" };
  return { label: "Contacte-nous si tu as besoin de plus de volume", href: "mailto:support@streamnco.com" };
}

export type PlanForQuota = PlanTier;
