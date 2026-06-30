import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CreditPackage = {
  id: string;
  credits: number;
  display_name: string;
  stripe_price_id: string;
};

/**
 * Fetches credit packs that are flipped `is_active = true` AND have a
 * Stripe price configured. Anything else is intentionally hidden — that's
 * how the structure stays dormant until ops are ready to sell.
 *
 * RLS allows authenticated/anon reads of active rows only.
 * Actual pricing (€) is rendered by Stripe Checkout — we never duplicate it
 * in the app to avoid drift.
 */
export function useCreditPackages(enabled = true) {
  return useQuery<CreditPackage[]>({
    queryKey: ["credit-packages-active"],
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("credit_packages")
        .select("id, credits, display_name, stripe_price_id, is_active")
        .eq("is_active", true)
        .order("credits", { ascending: true });
      if (error || !data) return [];
      return (data as any[])
        .filter((p) => typeof p.stripe_price_id === "string" && p.stripe_price_id.length > 0)
        .map((p) => ({
          id: String(p.id),
          credits: Number(p.credits ?? 0),
          display_name: String(p.display_name ?? `${p.credits} crédits`),
          stripe_price_id: String(p.stripe_price_id),
        }));
    },
  });
}
