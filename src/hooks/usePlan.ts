import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { analytics } from "@/services/analytics";

export type PlanTier = "free" | "pro" | "growth" | "agency";

export interface PlanInfo {
  plan: PlanTier;
  isPro: boolean;
  isGrowth: boolean;
  loading: boolean;
}

const PLAN_CACHE = new Map<string, PlanTier>();

export function invalidatePlanCache(userId: string) {
  PLAN_CACHE.delete(userId);
}

const PLAN_REFRESH_EVENT = "streamnco:plan-refresh";

export function triggerPlanRefresh() {
  window.dispatchEvent(new CustomEvent(PLAN_REFRESH_EVENT));
}

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
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const handler = () => setRefreshKey((k) => k + 1);
    window.addEventListener(PLAN_REFRESH_EVENT, handler);
    return () => window.removeEventListener(PLAN_REFRESH_EVENT, handler);
  }, []);

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

    // Use cache only on initial load — skip it on forced refreshes
    if (refreshKey === 0 && PLAN_CACHE.has(user.id)) {
      setPlan(PLAN_CACHE.get(user.id)!);
      setLoading(false);
      return;
    }

    setLoading(true);
    supabase
      .from("subscriptions")
      .select("plan_name, status")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const status = data?.status ?? null;
        const isActive = status === "active" || status === "trialing";
        const t = (isActive ? (data?.plan_name ?? "free") : "free") as PlanTier;
        PLAN_CACHE.set(user.id, t);
        setPlan(t);
        setLoading(false);
        analytics.setPlan(t);
      });
  }, [user, refreshKey]);

  return { plan, isPro: plan !== "free", isGrowth: plan === "growth" || plan === "agency", loading };
}
