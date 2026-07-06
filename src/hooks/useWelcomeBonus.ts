import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Returns whether the current authenticated user has received the
 * "welcome" 470 StreamCoins bonus.
 *
 * Used to show the discreet welcome-bonus hint only when the bonus
 * actually exists in the ledger (not just when purchases == 0).
 */
export function useWelcomeBonus() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["welcome-bonus", user?.id ?? "anon"],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)("has_welcome_bonus");
      if (error) return false;
      return Boolean(data);
    },
  });
}
