import { supabase } from "@/integrations/supabase/client";
import { analytics } from "@/services/analytics";

export type PlanName = "pro" | "growth";
export type BillingCycle = "monthly" | "annual";

export async function startCheckout(plan: PlanName, billing_cycle: BillingCycle): Promise<void> {
  analytics.checkoutStarted(plan, billing_cycle);
  const { data, error } = await supabase.functions.invoke("create-checkout-session", {
    body: { plan, billing_cycle },
  });
  if (error) throw new Error(error.message ?? "Checkout failed");
  const url = (data as { url?: string } | null)?.url;
  if (!url) throw new Error("No checkout URL returned");
  window.location.href = url;
}

export async function openBillingPortal(): Promise<void> {
  const { data, error } = await supabase.functions.invoke("create-customer-portal-session", {
    body: {},
  });
  if (error) throw new Error(error.message ?? "Portal failed");
  const url = (data as { url?: string } | null)?.url;
  if (!url) throw new Error("No portal URL returned");
  window.location.href = url;
}
