/**
 * Per-plan monthly quotas for cost-bearing features.
 *
 * Rules:
 * - Counts ONE job (not variants/clips) per generation.
 * - Failed jobs do not count (status = 'failed' is excluded server-side).
 * - Hierarchy: free < pro < growth < agency. Never compare with strict equality.
 * - Agency uses custom/contact-sales limits. Defaults below are conservative
 *   floors that match Growth; the real ceiling is enforced per-account by ops.
 *
 * Backend enforcement lives in:
 *   - supabase/functions/visual-job-create
 *   - supabase/functions/clip-job-create
 * Frontend display only — never use this as the single source of truth.
 */
import { normalizePlan, type PlanTier } from "@/lib/planAccess";

export type QuotaFeature = "visual" | "clip";

export const QUOTAS: Record<PlanTier, { visual: number; clip: number }> = {
  free: { visual: 5, clip: 3 },
  pro: { visual: 100, clip: 30 },
  growth: { visual: 300, clip: 200 },
  // Agency: default floor — real limits are managed per-account by ops.
  agency: { visual: 1000, clip: 600 },
};

export function quotaFor(plan: string | null | undefined, feature: QuotaFeature): number {
  return QUOTAS[normalizePlan(plan)][feature];
}

/**
 * Next paid tier the user can upgrade to. Returns null for agency (no public
 * upgrade target — handled via contact-sales).
 */
export function upgradeTarget(plan: string | null | undefined): "pro" | "growth" | null {
  const p = normalizePlan(plan);
  if (p === "free") return "pro";
  if (p === "pro") return "growth";
  return null; // growth or agency
}

export function quotaExceededMessage(feature: QuotaFeature): string {
  return feature === "visual"
    ? "Tu as atteint ta limite de générations visuelles ce mois-ci."
    : "Tu as atteint ta limite de clips générés ce mois-ci.";
}

export function quotaCta(plan: string | null | undefined): { label: string; href: string | null } {
  const p = normalizePlan(plan);
  const target = upgradeTarget(plan);
  if (target === "pro") return { label: "Passer au Pro", href: "/billing" };
  if (target === "growth") return { label: "Passer à Growth", href: "/billing" };
  if (p === "agency") {
    return {
      label: "Contacte-nous pour augmenter ton volume",
      href: "mailto:support@streamnco.com",
    };
  }
  return { label: "Contacte-nous si tu as besoin de plus de volume", href: "mailto:support@streamnco.com" };
}

export type PlanForQuota = PlanTier;
