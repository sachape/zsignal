import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CreditPackage = {
  id: string;
  credits: number;
  display_name: string;
  stripe_price_id: string;
  display_price_cents: number | null;
  currency: string;
  badge: string | null;
  description: string | null;
};

/**
 * Fetches StreamCoins packs that are flipped `is_active = true` AND have a
 * Stripe price configured. Anything else is intentionally hidden — that's
 * how the structure stays dormant until ops are ready to sell.
 */
export function useCreditPackages(enabled = true) {
  return useQuery<CreditPackage[]>({
    queryKey: ["credit-packages-active"],
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("credit_packages")
        .select("id, credits, display_name, stripe_price_id, is_active, display_price_cents, currency, badge, description, display_order")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (error || !data) return [];
      return (data as any[])
        .filter((p) => typeof p.stripe_price_id === "string" && p.stripe_price_id.length > 0)
        .map((p) => ({
          id: String(p.id),
          credits: Number(p.credits ?? 0),
          display_name: String(p.display_name ?? `${p.credits} StreamCoins`),
          stripe_price_id: String(p.stripe_price_id),
          display_price_cents: p.display_price_cents == null ? null : Number(p.display_price_cents),
          currency: String(p.currency ?? "eur"),
          badge: p.badge ? String(p.badge) : null,
          description: p.description ? String(p.description) : null,
        }));
    },
  });
}

export function formatPackPrice(pkg: Pick<CreditPackage, "display_price_cents" | "currency">): string | null {
  if (pkg.display_price_cents == null) return null;
  const amount = pkg.display_price_cents / 100;
  try {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: (pkg.currency || "eur").toUpperCase(),
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount} €`;
  }
}
