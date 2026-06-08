import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { analytics } from "@/services/analytics";
import { hasPlanAtLeast, normalizePlan, type PlanTier } from "@/lib/planAccess";

export type { PlanTier };

export interface PlanInfo {
  plan: PlanTier;
  isPro: boolean;
  isGrowth: boolean;
  loading: boolean;
}

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

export const PLAN_REFRESH_EVENT = "streamnco:plan-refresh";

export function invalidatePlanCache(userId: string) {
  void userId;
  triggerPlanRefresh();
}

export function triggerPlanRefresh() {
  window.dispatchEvent(new CustomEvent(PLAN_REFRESH_EVENT));
}

// Plan is always resolved from the server-backed subscriptions table.
// No client-side override is permitted in production to prevent paywall bypass.

export function usePlan(): PlanInfo {
  const { user } = useAuth();
  const [plan, setPlan] = useState<PlanTier>("free");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (!user) {
      setPlan("free");
      setLoading(false);
      return;
    }

    const loadPlan = async (showLoading = false) => {
      if (showLoading) setLoading(true);
      const { data } = await supabase
        .from("subscriptions")
        .select("plan_name, status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!cancelled) {
        const status = data?.status ?? null;
        const isActive = status ? ACTIVE_STATUSES.has(status) : false;
        const resolvedPlan = (isActive ? normalizePlan(data?.plan_name) : "free") as PlanTier;
        setPlan(resolvedPlan);
        setLoading(false);
        analytics.setPlan(resolvedPlan);
      }
    };

    const refresh = () => {
      void loadPlan(false);
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };

    void loadPlan(true);
    window.addEventListener(PLAN_REFRESH_EVENT, refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      cancelled = true;
      window.removeEventListener(PLAN_REFRESH_EVENT, refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [user]);

  return {
    plan,
    isPro: hasPlanAtLeast(plan, "pro"),
    isGrowth: hasPlanAtLeast(plan, "growth"),
    loading,
  };
}
