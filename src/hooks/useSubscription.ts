import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
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

    (async () => {
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
      const plan = (data.plan_name ?? "free") as "free" | "pro" | "growth";
      setState({
        plan_name: isActive ? plan : "free",
        billing_cycle: (data.billing_cycle as "monthly" | "annual" | null) ?? null,
        status,
        is_active: isActive,
        is_pro: isActive && plan === "pro",
        is_growth: isActive && plan === "growth",
        current_period_end: data.current_period_end ?? null,
        cancel_at_period_end: data.cancel_at_period_end ?? false,
        loading: false,
      });
    })();

    return () => { cancelled = true; };
  }, [user]);

  return state;
}
