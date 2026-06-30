import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CreditBalance = {
  available_credits: number;
  lifetime_purchased: number;
  lifetime_spent: number;
  lifetime_refunded: number;
};

const EMPTY: CreditBalance = {
  available_credits: 0,
  lifetime_purchased: 0,
  lifetime_spent: 0,
  lifetime_refunded: 0,
};

/**
 * Reads the current user's credit balance from the secure RPC.
 *
 * Returns an empty balance when unauthenticated or when the RPC is unavailable
 * (e.g. PAYG feature flag is off and consumers don't render credit UI anyway).
 */
export function useCreditBalance(enabled = true) {
  return useQuery<CreditBalance>({
    queryKey: ["credit-balance"],
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return EMPTY;
      const { data, error } = await supabase.rpc("get_user_credit_balance", {
        p_user_id: userData.user.id,
      });
      if (error || !data) return EMPTY;
      const d = data as Partial<CreditBalance>;
      return {
        available_credits: Number(d.available_credits ?? 0),
        lifetime_purchased: Number(d.lifetime_purchased ?? 0),
        lifetime_spent: Number(d.lifetime_spent ?? 0),
        lifetime_refunded: Number(d.lifetime_refunded ?? 0),
      };
    },
  });
}
