import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type PlanTier = "free" | "pro" | "growth" | "agency";

export interface PlanInfo {
  plan: PlanTier;
  isPro: boolean;
  loading: boolean;
}

const PLAN_CACHE = new Map<string, PlanTier>();

// Dev override: set localStorage key "streamnco_plan_override" to "pro" | "growth" | "agency"
function getDevOverride(): PlanTier | null {
  try {
    const v = localStorage.getItem("streamnco_plan_override");
    if (v === "pro" || v === "growth" || v === "agency") return v;
  } catch {/* noop */}
  return null;
}

export function usePlan(): PlanInfo {
  const { user } = useAuth();
  const [plan, setPlan] = useState<PlanTier>("free");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPlan("free");
      setLoading(false);
      return;
    }

    const dev = getDevOverride();
    if (dev) {
      setPlan(dev);
      setLoading(false);
      return;
    }

    if (PLAN_CACHE.has(user.id)) {
      setPlan(PLAN_CACHE.get(user.id)!);
      setLoading(false);
      return;
    }

    // When real billing is live: query user_subscriptions or profiles.plan_tier here.
    // For now every authenticated user is on the free plan.
    const resolved: PlanTier = "free";
    PLAN_CACHE.set(user.id, resolved);
    setPlan(resolved);
    setLoading(false);

    // Future: uncomment and adapt when subscription column is available
    // supabase
    //   .from("profiles")
    //   .select("plan_tier")
    //   .eq("user_id", user.id)
    //   .single()
    //   .then(({ data }) => {
    //     const t = (data?.plan_tier ?? "free") as PlanTier;
    //     PLAN_CACHE.set(user.id, t);
    //     setPlan(t);
    //     setLoading(false);
    //   });

    void supabase; // keep import alive
  }, [user]);

  return { plan, isPro: plan !== "free", loading };
}
