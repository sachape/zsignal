import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PLAN_REFRESH_EVENT } from "@/hooks/usePlan";
import { hasPlanAtLeast, normalizePlan } from "@/lib/planAccess";

export interface SubscriptionInfo {
  plan_name: "free" | "pro" | "growth";
  billing_cycle: "monthly" | "annual" | null;
  status: string | null;
  is_active: boolean;
  is_pro: boolean;
  is_growth: boolean;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  loading: boolean;
}

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

export function useSubscription(): SubscriptionInfo {
  const { user } = useAuth();
  const [state, setState] = useState<SubscriptionInfo>({
    plan_name: "free",
    billing_cycle: null,
    status: null,
    is_active: false,
    is_pro: false,
    is_growth: false,
    current_period_end: null,
    cancel_at_period_end: false,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setState((s) => ({ ...s, plan_name: "free", is_active: false, is_pro: false, is_growth: false, loading: false }));
      return;
    }

    const loadSubscription = async (showLoading = false) => {
      if (showLoading) setState((s) => ({ ...s, loading: true }));
      const { data } = await supabase
        .from("subscriptions")
        .select("plan_name, billing_cycle, status, current_period_end, cancel_at_period_end")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (!data) {
        setState({
          plan_name: "free", billing_cycle: null, status: null,
          is_active: false, is_pro: false, is_growth: false,
          current_period_end: null, cancel_at_period_end: false, loading: false,
        });
        return;
      }

      const status = data.status ?? null;
      const isActive = status ? ACTIVE_STATUSES.has(status) : false;
      const plan = (isActive ? normalizePlan(data.plan_name) : "free") as "free" | "pro" | "growth";
      setState({
        plan_name: plan,
        billing_cycle: (data.billing_cycle as "monthly" | "annual" | null) ?? null,
        status,
        is_active: isActive,
        is_pro: isActive && hasPlanAtLeast(plan, "pro"),
        is_growth: isActive && hasPlanAtLeast(plan, "growth"),
        current_period_end: data.current_period_end ?? null,
        cancel_at_period_end: data.cancel_at_period_end ?? false,
        loading: false,
      });
    };

    const refresh = () => {
      void loadSubscription(false);
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };

    void loadSubscription(true);
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

  return state;
}
