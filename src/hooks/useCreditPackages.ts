import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CreditPackage = {
  id: string;
  credits: number;
  display_name: string | null;
  stripe_price_id: string | null;
  /** Display-only price in cents (optional — surfaced once configured). */
  price_cents: number | null;
  currency: string | null;
};

/**
 * Fetches credit packs that are flipped `is_active = true` AND have a
 * Stripe price configured. Anything else is intentionally hidden — that's
 * how the structure stays dormant until ops are ready to sell.
 *
 * RLS allows authenticated reads of active rows only.
 */
export function useCreditPackages(enabled = true) {
  return useQuery<CreditPackage[]>({
    queryKey: ["credit-packages-active"],
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("credit_packages")
        .select("id, credits, display_name, stripe_price_id, price_cents, currency, is_active")
        .eq("is_active", true)
        .order("credits", { ascending: true });
      if (error || !data) return [];
      return (data as any[])
        .filter((p) => p.stripe_price_id)
        .map((p) => ({
          id: String(p.id),
          credits: Number(p.credits ?? 0),
          display_name: p.display_name ?? null,
          stripe_price_id: p.stripe_price_id ?? null,
          price_cents: p.price_cents ?? null,
          currency: p.currency ?? null,
        }));
    },
  });
}
